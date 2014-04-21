define(function (require) {
  var interval = require('utils/interval');
  var moment = require('moment');
  var _ = require('lodash');
  var sinon = require('sinon/sinon');

  describe('interval', function () {

    describe('toMS', function () {
      it('return the number of milliseconds represented by the string', function () {
        expect(interval.toMS('1ms')).to.be(1);
        expect(interval.toMS('1s')).to.be(1000);
        expect(interval.toMS('1m')).to.be(60000);
        expect(interval.toMS('1h')).to.be(3600000);
        expect(interval.toMS('1d')).to.be(86400000);
        expect(interval.toMS('1w')).to.be(604800000);
        expect(interval.toMS('1M')).to.be(2592000000); // actually 30d
        expect(interval.toMS('1y')).to.be(31536000000); // 1000*60*60*24*365
      });
    });

    describe('rounding', function () {
      var mmnt, date, string, now, clock, then;

      beforeEach(function () {
        clock = sinon.useFakeTimers();
        now = moment();
        then = moment();
      });

      afterEach(function () {
        clock.restore();
      });

      it('should calculate an appropriate interval for 10s', function () {
        var _t = then.subtract(10, 'seconds');
        expect(interval.calculate(_t, now, 100).interval).to.be(interval.toMS('100ms'));
      });

      it('should calculate an appropriate interval for 1m', function () {
        var _t = then.subtract(1, 'minute');
        expect(interval.calculate(_t, now, 100).interval).to.be(interval.toMS('1s'));
      });

      it('should calculate an appropriate interval for 10m', function () {
        var _t = then.subtract(10, 'minutes');
        expect(interval.calculate(_t, now, 100).interval).to.be(interval.toMS('5s'));
      });

      it('should calculate an appropriate interval for 15m', function () {
        var _t = then.subtract(15, 'minutes');
        expect(interval.calculate(_t, now, 100).interval).to.be(interval.toMS('10s'));
      });

      it('should calculate an appropriate interval for 1h', function () {
        var _t = then.subtract(1, 'hour');
        expect(interval.calculate(_t, now, 100).interval).to.be(interval.toMS('30s'));
      });

      it('should calculate an appropriate interval for 90m', function () {
        var _t = then.subtract(90, 'minutes');
        expect(interval.calculate(_t, now, 100).interval).to.be(interval.toMS('1m'));
      });

      it('should calculate an appropriate interval for 6h', function () {
        var _t = then.subtract(6, 'hours');
        expect(interval.calculate(_t, now, 100).interval).to.be(interval.toMS('5m'));
      });

      it('should calculate an appropriate interval for 24h', function () {
        var _t = then.subtract(24, 'hours');
        expect(interval.calculate(_t, now, 100).interval).to.be(interval.toMS('10m'));
      });

      it('should calculate an appropriate interval for 3d', function () {
        var _t = then.subtract(3, 'days');
        expect(interval.calculate(_t, now, 100).interval).to.be(interval.toMS('30m'));
      });

      it('should calculate an appropriate interval for 1w', function () {
        var _t = then.subtract(1, 'week');
        expect(interval.calculate(_t, now, 100).interval).to.be(interval.toMS('1h'));
      });

      it('should calculate an appropriate interval for 2w', function () {
        var _t = then.subtract(2, 'weeks');
        expect(interval.calculate(_t, now, 100).interval).to.be(interval.toMS('3h'));
      });

      it('should calculate an appropriate interval for 1M', function () {
        var _t = then.subtract(1, 'month');
        expect(interval.calculate(_t, now, 100).interval).to.be(interval.toMS('12h'));
      });

      it('should calculate an appropriate interval for 4M', function () {
        var _t = then.subtract(4, 'months');
        expect(interval.calculate(_t, now, 100).interval).to.be(interval.toMS('1d'));
      });

      it('should calculate an appropriate interval for 2y', function () {
        var _t = then.subtract(2, 'years');
        expect(interval.calculate(_t, now, 100).interval).to.be(interval.toMS('1w'));
      });

      it('should calculate an appropriate interval for a 100y', function () {
        var _t = then.subtract(100, 'years');
        expect(interval.calculate(_t, now, 100).interval).to.be(interval.toMS('1y'));
      });

    });

  });

});