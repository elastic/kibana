define(function (require) {
  var _ = require('lodash');
  var versionmath = require('utils/versionmath');
  var versions = [
    '1.1.12',
    '1.1.12',
    '1.1.12',
    '1.1.12',
    '0.90.0',
    '0.90.1',
    '1.0.0',
    '1.0',
    '1.2.3',
    '2.0.0',
    '2.0.1',
    '2.3.1'
  ];

  describe('version math (0.90.0 - 2.3.1)', function () {
    var methods = 'max,min,eq,is,lt,lte,gt,gte'.split(',');
    describe('methods', function () {
      it('should have ' + methods.join(', ') + ' methods', function () {
        _.each(methods, function (method) {
          expect(versionmath[method]).to.be.a(Function);
        });
      });
    });

    describe('min & max', function () {
      it('has a max of 2.3.1', function () {
        expect(versionmath.max(versions)).to.be('2.3.1');
      });

      it('has a min of 0.90.0', function () {
        expect(versionmath.min(versions)).to.be('0.90.0');
      });
    });

    describe('eq / lowest version', function () {
      it('should be true for  0.90.0', function () {
        expect(versionmath.eq('0.90.0', versions)).to.be(true);
      });

      it('should be false for 1.0', function () {
        expect(versionmath.eq('1.0', versions)).to.be(false);
      });
    });

    describe('gt / lowest version', function () {
      it('is > 0.20.3', function () {
        expect(versionmath.gt('0.20.3', versions)).to.be(true);
      });

      it('is not > 0.90.0', function () {
        expect(versionmath.gt('0.90.0', versions)).to.be(false);
      });

      it('is not > 1.0.0', function () {
        expect(versionmath.gt('1.0.0', versions)).to.be(false);
      });
    });

    describe('gte / lowest version', function () {
      it('is >= 0.20.3', function () {
        expect(versionmath.gte('0.20.3', versions)).to.be(true);
      });

      it('is >= 0.90.0', function () {
        expect(versionmath.gte('0.90.0', versions)).to.be(true);
      });

      it('is not >= 1.0.0', function () {
        expect(versionmath.gte('1.0.0', versions)).to.be(false);
      });
    });

    describe('lt / highest version', function () {
      it('is not < 0.20.3', function () {
        expect(versionmath.lt('0.20.3', versions)).to.be(false);
      });

      it('is not < 2.3.1', function () {
        expect(versionmath.lt('2.3.1', versions)).to.be(false);
      });

      it('is < 2.5', function () {
        expect(versionmath.lt('2.5', versions)).to.be(true);
      });
    });

    describe('lte / highest version', function () {
      it('is not =< 0.20.3', function () {
        expect(versionmath.lte('0.20.3', versions)).to.be(false);
      });

      it('is =< 2.3.1', function () {
        expect(versionmath.lte('2.3.1', versions)).to.be(true);
      });

      it('is =< 2.5', function () {
        expect(versionmath.lte('2.5', versions)).to.be(true);
      });
    });

    describe('is', function () {
      it('exactly, <, <=, >, >=', function () {
        expect(versionmath.is('0.90.0', versions)).to.be(true);
        expect(versionmath.is('0.20.0', versions)).to.be(false);

        expect(versionmath.is('>0.20.0', versions)).to.be(true);
        expect(versionmath.is('>0.90.0', versions)).to.be(false);
        expect(versionmath.is('>0.90.1', versions)).to.be(false);

        expect(versionmath.is('>=0.20.0', versions)).to.be(true);
        expect(versionmath.is('>=0.90.0', versions)).to.be(true);
        expect(versionmath.is('>=0.90.1', versions)).to.be(false);

        expect(versionmath.is('<2.5', versions)).to.be(true);
        expect(versionmath.is('<2.3.1', versions)).to.be(false);
        expect(versionmath.is('<0.90.1', versions)).to.be(false);

        expect(versionmath.is('<=2.5', versions)).to.be(true);
        expect(versionmath.is('<=2.3.1', versions)).to.be(true);
        expect(versionmath.is('<=0.90.1', versions)).to.be(false);
      });
    });

  });

});