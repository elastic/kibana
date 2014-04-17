define(function (require) {
  var datemath = require('utils/datemath');
  var moment = require('moment');
  var _ = require('lodash');
  var sinon = require('sinon/sinon');

  describe('datemath', function () {
    // Test each of these intervals when testing relative time
    var spans = ['s', 'm', 'h', 'd', 'w', 'M', 'y'],
      anchor =  '2014-01-01T06:06:06.666Z',
      unix = moment(anchor).valueOf(),
      format = 'YYYY-MM-DDTHH:mm:ss.SSSZ',
      clock;

    describe('errors', function () {
      it('should return undefined if passed something falsy', function () {
        expect(datemath.parse()).to.be(undefined);
      });

      it('should return undefined if I pass an operator besides [+-/]', function () {
        expect(datemath.parse('now&1d')).to.be(undefined);
      });

      it('should return undefined if I pass a unit besides' + spans.toString(), function () {
        expect(datemath.parse('now+5f')).to.be(undefined);
      });

      it('should return undefined if rounding unit is not 1', function () {
        expect(datemath.parse('now/2y')).to.be(undefined);
        expect(datemath.parse('now/0.5y')).to.be(undefined);
      });
    });

    describe('objects and strings', function () {
      var mmnt, date, string, now;

      beforeEach(function () {
        clock = sinon.useFakeTimers(unix);
        now = moment();
        mmnt = moment(anchor);
        date = mmnt.toDate();
        string = mmnt.format(format);
      });

      afterEach(function () {
        clock.restore();
      });

      it('should return the same moment if passed a moment', function () {
        expect(datemath.parse(mmnt)).to.eql(mmnt);
      });
      
      it('should return a moment if passed a date', function () {
        expect(datemath.parse(date).format(format)).to.eql(mmnt.format(format));
      });

      it('should return a moment if passed an ISO8601 string', function () {
        expect(datemath.parse(string).format(format)).to.eql(mmnt.format(format));
      });

      it('should return the current time if passed now', function () {
        expect(datemath.parse('now').format(format)).to.eql(now.format(format));
      });
    });

    describe('subtraction', function () {
      var now, anchored;

      beforeEach(function () {
        clock = sinon.useFakeTimers(unix);
        now = moment();
        anchored = moment(anchor);
      });

      afterEach(function () {
        clock.restore();
      });

      _.each(spans, function (span) {
        var nowEx = 'now-5' + span;
        var thenEx =  anchor + '||-5' + span;

        it('should return 5' + span + ' ago', function () {
          expect(datemath.parse(nowEx).format(format)).to.eql(now.subtract(5, span).format(format));
        });

        it('should return 5' + span + ' before ' + anchor, function () {
          expect(datemath.parse(thenEx).format(format)).to.eql(anchored.subtract(5, span).format(format));
        });
      });
    });

    describe('addition', function () {
      var now, anchored;

      beforeEach(function () {
        clock = sinon.useFakeTimers(unix);
        now = moment();
        anchored = moment(anchor);
      });

      afterEach(function () {
        clock.restore();
      });

      _.each(spans, function (span) {
        var nowEx = 'now+5' + span;
        var thenEx =  anchor + '||+5' + span;

        it('should return 5' + span + ' from now', function () {
          expect(datemath.parse(nowEx).format()).to.eql(now.add(5, span).format());
        });

        it('should return 5' + span + ' after ' + anchor, function () {
          expect(datemath.parse(thenEx).format()).to.eql(anchored.add(5, span).format());
        });
      });

    });

    describe('rounding', function () {
      var now, anchored;

      beforeEach(function () {
        clock = sinon.useFakeTimers(unix);
        now = moment();
        anchored = moment(anchor);
      });

      afterEach(function () {
        clock.restore();
      });

      _.each(spans, function (span) {
        it('should round now to the beginning of the ' + span, function () {
          expect(datemath.parse('now/' + span).format(format)).to.eql(now.startOf(span).format(format));
        });

        it('should round now to the end of the ' + span, function () {
          expect(datemath.parse('now/' + span, true).format(format)).to.eql(now.endOf(span).format(format));
        });
      });

    });

  });

});