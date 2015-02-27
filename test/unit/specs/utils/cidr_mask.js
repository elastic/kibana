define(function (require) {
  var CidrMask = require('utils/cidr_mask');

  describe('CidrMask', function () {
    it('should throw errors with invalid CIDR masks', function () {
      expect(function () {
        new CidrMask();
      }).to.throwError();

      expect(function () {
        new CidrMask('');
      }).to.throwError();

      expect(function () {
        new CidrMask('hello, world');
      }).to.throwError();

      expect(function () {
        new CidrMask('0.0.0.0');
      }).to.throwError();

      expect(function () {
        new CidrMask('0.0.0.0/0');
      }).to.throwError();

      expect(function () {
        new CidrMask('0.0.0.0/33');
      }).to.throwError();

      expect(function () {
        new CidrMask('256.0.0.0/32');
      }).to.throwError();

      expect(function () {
        new CidrMask('0.0.0.0/32/32');
      }).to.throwError();

      expect(function () {
        new CidrMask('1.2.3/1');
      }).to.throwError();
    });

    it('should correctly grab IP address and prefix length', function () {
      var mask = new CidrMask('0.0.0.0/1');
      expect(mask.initialAddress.toString()).to.be('0.0.0.0');
      expect(mask.prefixLength).to.be(1);

      mask = new CidrMask('128.0.0.1/31');
      expect(mask.initialAddress.toString()).to.be('128.0.0.1');
      expect(mask.prefixLength).to.be(31);
    });

    it('should calculate a range of IP addresses', function () {
      var mask = new CidrMask('0.0.0.0/1');
      var range = mask.getRange();
      expect(range.from.toString()).to.be('0.0.0.0');
      expect(range.to.toString()).to.be('127.255.255.255');

      mask = new CidrMask('1.2.3.4/2');
      range = mask.getRange();
      expect(range.from.toString()).to.be('0.0.0.0');
      expect(range.to.toString()).to.be('63.255.255.255');

      mask = new CidrMask('67.129.65.201/27');
      range = mask.getRange();
      expect(range.from.toString()).to.be('67.129.65.192');
      expect(range.to.toString()).to.be('67.129.65.223');
    });

    it('toString()', function () {
      var mask = new CidrMask('.../1');
      expect(mask.toString()).to.be('0.0.0.0/1');

      mask = new CidrMask('128.0.0.1/31');
      expect(mask.toString()).to.be('128.0.0.1/31');
    });
  });
});