import Ipv4Address from 'ui/utils/ipv4_address';
import expect from 'expect.js';

describe('Ipv4Address', function () {
  it('should throw errors with invalid IP addresses', function () {
    expect(function () {
      new Ipv4Address();
    }).to.throwError();

    expect(function () {
      new Ipv4Address('');
    }).to.throwError();

    expect(function () {
      new Ipv4Address('hello, world');
    }).to.throwError();

    expect(function () {
      new Ipv4Address('0.0.0');
    }).to.throwError();

    expect(function () {
      new Ipv4Address('256.0.0.0');
    }).to.throwError();

    expect(function () {
      new Ipv4Address('-1.0.0.0');
    }).to.throwError();

    expect(function () {
      new Ipv4Address(Number.MAX_SAFE_INTEGER);
    }).to.throwError();
  });

  it('should allow creation with an integer or string', function () {
    expect(new Ipv4Address(2116932386).toString()).to.be(new Ipv4Address('126.45.211.34').toString());
  });

  it('should correctly calculate the decimal representation of an IP address', function () {
    let ipAddress = new Ipv4Address('0.0.0.0');
    expect(ipAddress.valueOf()).to.be(0);

    ipAddress = new Ipv4Address('0.0.0.1');
    expect(ipAddress.valueOf()).to.be(1);

    ipAddress = new Ipv4Address('126.45.211.34');
    expect(ipAddress.valueOf()).to.be(2116932386);
  });

  it('toString()', function () {
    let ipAddress = new Ipv4Address('0.000.00000.1');
    expect(ipAddress.toString()).to.be('0.0.0.1');

    ipAddress = new Ipv4Address('123.123.123.123');
    expect(ipAddress.toString()).to.be('123.123.123.123');
  });
});
