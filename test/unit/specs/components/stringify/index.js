define(function (require) {
  describe('Stringify Component', function () {
    var ip;
    var date;
    var bytes;
    var string;
    var number;
    var percentage;

    var fieldFormats;
    var currentDateFormat;
    var currentPrec;
    var config;

    beforeEach(module('kibana'));
    beforeEach(inject(function (Private, $injector) {
      ip = Private(require('components/stringify/ip'));
      date = Private(require('components/stringify/date'));
      bytes = Private(require('components/stringify/bytes'));
      string = Private(require('components/stringify/string'));
      number = Private(require('components/stringify/number'));
      percentage = Private(require('components/stringify/percentage'));

      fieldFormats = Private(require('registry/field_formats'));

      config = $injector.get('config');
      currentDateFormat = config.get('dateFormat');
      currentPrec = config.get('format:numberPrecision');
    }));

    afterEach(inject(function () {
      config.set('dateFormat', currentDateFormat);
      config.set('format:numberPrecision', currentPrec);
    }));

    it('registers some fieldFormats', function () {
      expect(fieldFormats).to.contain(ip);
      expect(fieldFormats).to.contain(date);
      expect(fieldFormats).to.contain(bytes);
      expect(fieldFormats).to.contain(string);
      expect(fieldFormats).to.contain(number);
      expect(fieldFormats).to.contain(percentage);
    });

    describe('ip', function () {
      it('formats numeric version of ip addresses properly', function () {
        expect(ip.convert(3624101182)).to.be('216.3.101.62');
      });

      it('ignores strings', function () {
        expect('216.3.101.63').to.be('216.3.101.63');
      });
    });

    describe('date', function () {
      it('formats dates using the current date format', function () {
        config.set('dateFormat', 'YYYY');
        var d = Date.now();
        expect(date.convert(d)).to.eql((new Date(d)).getFullYear());
      });

      it('formats dates using the current date format', function () {
        config.set('dateFormat', 'YYYY-M');
        var d = Date.now();
        var dd = new Date(d);
        var year = dd.getFullYear();
        var month = dd.getMonth() + 1;
        expect(date.convert(d)).to.eql(year + '-' + month);
      });
    });

    describe('bytes', function () {
      it('rounds at 1024', function () {
        expect(bytes.convert(1023)).to.be('1023B');
      });

      it('rounds at 1024', function () {
        expect(bytes.convert(1024)).to.be('1KB');
      });

      it('rounds at 1024', function () {
        expect(bytes.convert(1048576)).to.be('1MB');
      });
    });

    describe('string', function () {
      it('turns numbers into strings', function () {
        expect(string.convert(1)).to.be('1');
      });

      it('turns arrays into strings', function () {
        expect(string.convert([1, 2, 3])).to.be('["1","2","3"]');
      });
    });

    describe('number', function () {
      it('rounds based on the config precision', function () {
        config.set('format:numberPrecision', 3);
        expect(number.convert(3.333333)).to.be('3.333');
      });

      it('rounds based on the config precision', function () {
        config.set('format:numberPrecision', 5);
        expect(number.convert(3.333333)).to.be('3.33333');
      });
    });

    describe('percentage', function () {
      it('appends a percent sign to a rounded number, 100X the number', function () {
        config.set('format:numberPrecision', 3);
        expect(percentage.convert(0.0333333)).to.be('3.333%');
      });
    });
  });
});