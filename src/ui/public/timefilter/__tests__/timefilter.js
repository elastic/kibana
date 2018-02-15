import sinon from 'sinon';
import expect from 'expect.js';
import ngMock from 'ng_mock';

describe('Timefilter service', function () {

  describe('calculateBounds', function () {
    beforeEach(ngMock.module('kibana'));

    const fifteenMinutesInMilliseconds = 15 * 60 * 1000;
    const clockNowTicks = new Date(2000, 1, 1, 0, 0, 0, 0).valueOf();

    let timefilter;
    let $location;
    let clock;

    beforeEach(ngMock.inject(function (_timefilter_, _$location_) {
      timefilter = _timefilter_;
      $location = _$location_;

      clock = sinon.useFakeTimers(clockNowTicks);
    }));

    afterEach(function () {
      clock.restore();
    });

    it('uses clock time by default', function () {
      const timeRange = {
        from: 'now-15m',
        to: 'now'
      };

      const result = timefilter.calculateBounds(timeRange);
      expect(result.min.valueOf()).to.eql(clockNowTicks - fifteenMinutesInMilliseconds);
      expect(result.max.valueOf()).to.eql(clockNowTicks);
    });

    it('uses forceNow string', function () {
      const timeRange = {
        from: 'now-15m',
        to: 'now'
      };

      const forceNowString = '1999-01-01T00:00:00.000Z';
      $location.search('forceNow', forceNowString);
      const result = timefilter.calculateBounds(timeRange);

      const forceNowTicks = Date.parse(forceNowString);
      expect(result.min.valueOf()).to.eql(forceNowTicks - fifteenMinutesInMilliseconds);
      expect(result.max.valueOf()).to.eql(forceNowTicks);
    });

    it(`throws Error if forceNow can't be parsed`, function () {
      const timeRange = {
        from: 'now-15m',
        to: 'now'
      };

      $location.search('forceNow', 'malformed%20string');
      expect(() => timefilter.calculateBounds(timeRange)).to.throwError();
    });
  });

});
