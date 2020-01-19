/* eslint-disable radix,prefer-const */
const varint = require('varint')
const { blake2b } = require('blakejs')
const base32Function = require('./base32')

const { ID, SECP256K1, Actor, BLS } = require('./constants')

let newAddress
let decode
let bigintToArray
let getChecksum
let validateChecksum

const base32 = base32Function('abcdefghijklmnopqrstuvwxyz234567')

class Address {
  constructor({ str }) {
    if (!str) throw new Error('Missing str in address')
    this.str = str
  }

  NewIDAddress = id => {
    return newAddress(ID, varint.ToUvarint(id))
  }

  NewSecp256k1Address = pubkey => {
    return newAddress(SECP256K1, addressHash(pubkey))
  }

  NewActorAddress = data => {
    return newAddress(Actor, addressHash(data))
  }

  NewBLSAddress = pubkey => {
    return newAddress(BLS, pubkey)
  }

  NewFromString = address => {
    return decode(address)
  }
}

bigintToArray = v => {
  // eslint-disable-next-line no-undef
  let tmp = BigInt(v).toString(16)
  if (tmp.length % 2 === 1) tmp = `0${tmp}`
  return Buffer.from(tmp, 'hex')
}

getChecksum = ingest => {
  return blake2b(ingest, null, 4)
}

validateChecksum = (ingest, expect) => {
  const digest = getChecksum(ingest)
  return Buffer.compare(Buffer.from(digest), expect)
}

newAddress = (protocol, payload) => {
  // TODO: add string checks as seen in Lotus
  const protocolByte = new Buffer.alloc(1)
  protocolByte[0] = protocol

  return new Address({
    str: Buffer.concat([protocolByte, payload])
  })
}

decode = address => {
  // TODO: add string checks as seen in Lotus
  const protocol = address.slice(1, 2)
  const protocolByte = new Buffer.alloc(1)
  protocolByte[0] = protocol
  const raw = address.substring(2, address.length)

  if (protocol === '0') {
    // TODO: Check for valid raw string
    return newAddress(protocol, varint.encode(parseInt(raw)))
  }

  const payloadChecksum = new Buffer.from(base32.decode(raw))
  const { length } = payloadChecksum
  const payload = payloadChecksum.slice(0, length - 4)
  const checksum = payloadChecksum.slice(length - 4, length)
  if (validateChecksum(Buffer.concat([protocolByte, payload]), checksum)) {
    throw Error("Checksums don't match")
  }

  return newAddress(protocol, payload)
}

module.exports = {
  Address,
  validateChecksum,
  bigintToArray,
  newAddress,
  decode
}
