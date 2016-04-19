import dateMath from 'ui/utils/date_math';
import expect from 'expect.js';
import moment from 'moment';
import _ from 'lodash';
import sinon from 'auto-release-sinon';

describe('dateMath', function () {
  // Test each of these intervals when testing relative time
  let spans = ['s', 'm', 'h', 'd', 'w', 'M', 'y'];
  let anchor =  '2014-01-01T06:06:06.666Z';
  let unix = moment(anchor).valueOf();
  let format = 'YYYY-MM-DDTHH:mm:ss.SSSZ';
  let clock;

  describe('errors', function () {
    it('should return undefined if passed something falsy', function () {
      expect(dateMath.parse()).to.be(undefined);
    });

    it('should return undefined if I pass an operator besides [+-/]', function () {
      expect(dateMath.parse('now&1d')).to.be(undefined);
    });

    it('should return undefined if I pass a unit besides' + spans.toString(), function () {
      expect(dateMath.parse('now+5f')).to.be(undefined);
    });

    it('should return undefined if rounding unit is not 1', function () {
      expect(dateMath.parse('now/2y')).to.be(undefined);
      expect(dateMath.parse('now/0.5y')).to.be(undefined);
    });

    it('should not go into an infinite loop when missing a unit', function () {
      expect(dateMath.parse('now-0')).to.be(undefined);
      expect(dateMath.parse('now-00')).to.be(undefined);
      expect(dateMath.parse('now-000')).to.be(undefined);
    });

  });

  describe('objects and strings', function () {
    let mmnt;
    let date;
    let string;
    let now;

    beforeEach(function () {
      clock = sinon.useFakeTimers(unix);
      now = moment();
      mmnt = moment(anchor);
      date = mmnt.toDate();
      string = mmnt.format(format);
    });

    it('should return the same moment if passed a moment', function () {
      expect(dateMath.parse(mmnt)).to.eql(mmnt);
    });

    it('should return a moment if passed a date', function () {
      expect(dateMath.parse(date).format(format)).to.eql(mmnt.format(format));
    });

    it('should return a moment if passed an ISO8601 string', function () {
      expect(dateMath.parse(string).format(format)).to.eql(mmnt.format(format));
    });

    it('should return the current time if passed now', function () {
      expect(dateMath.parse('now').format(format)).to.eql(now.format(format));
    });
  });

  describe('subtraction', function () {
    let now;
    let anchored;

    beforeEach(function () {
      clock = sinon.useFakeTimers(unix);
      now = moment();
      anchored = moment(anchor);
    });

    _.each(spans, function (span) {
      let nowEx = 'now-5' + span;
      let thenEx =  anchor + '||-5' + span;

      it('should return 5' + span + ' ago', function () {
        expect(dateMath.parse(nowEx).format(format)).to.eql(now.subtract(5, span).format(format));
      });

      it('should return 5' + span + ' before ' + anchor, function () {
        expect(dateMath.parse(thenEx).format(format)).to.eql(anchored.subtract(5, span).format(format));
      });
    });
  });

  describe('addition', function () {
    let now;
    let anchored;

    beforeEach(function () {
      clock = sinon.useFakeTimers(unix);
      now = moment();
      anchored = moment(anchor);
    });

    _.each(spans, function (span) {
      let nowEx = 'now+5' + span;
      let thenEx =  anchor + '||+5' + span;

      it('should return 5' + span + ' from now', function () {
        expect(dateMath.parse(nowEx).format()).to.eql(now.add(5, span).format());
      });

      it('should return 5' + span + ' after ' + anchor, function () {
        expect(dateMath.parse(thenEx).format()).to.eql(anchored.add(5, span).format());
      });
    });

  });

  describe('rounding', function () {
    let now;
    let anchored;

    beforeEach(function () {
      clock = sinon.useFakeTimers(unix);
      now = moment();
      anchored = moment(anchor);
    });

    _.each(spans, function (span) {
      it('should round now to the beginning of the ' + span, function () {
        expect(dateMath.parse('now/' + span).format(format)).to.eql(now.startOf(span).format(format));
      });

      it('should round now to the end of the ' + span, function () {
        expect(dateMath.parse('now/' + span, true).format(format)).to.eql(now.endOf(span).format(format));
      });
    });

  });

});
