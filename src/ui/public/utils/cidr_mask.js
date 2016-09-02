import Ipv4Address from 'ui/utils/ipv4_address';
const NUM_BITS = 32;

function throwError(mask) {
  throw Error('Invalid CIDR mask: ' + mask);
}

function CidrMask(mask) {
  const splits = mask.split('\/');
  if (splits.length !== 2) throwError(mask);
  this.initialAddress = new Ipv4Address(splits[0]);
  this.prefixLength = Number(splits[1]);
  if (this.prefixLength < 1 || this.prefixLength > NUM_BITS) throwError(mask);
}

CidrMask.prototype.getRange = function () {
  const variableBits = NUM_BITS - this.prefixLength;
  const fromAddress = this.initialAddress.valueOf() >> variableBits << variableBits >>> 0; // >>> 0 coerces to unsigned
  const numAddresses = Math.pow(2, variableBits);
  return {
    from: new Ipv4Address(fromAddress).toString(),
    to: new Ipv4Address(fromAddress + numAddresses - 1).toString()
  };
};

CidrMask.prototype.toString = function () {
  return this.initialAddress.toString() + '/' + this.prefixLength;
};

export default CidrMask;
