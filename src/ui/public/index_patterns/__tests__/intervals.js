var pluck = require('lodash').pluck;
var moment = require('moment');

describe('Index Patterns', function () {
  describe('interval.toIndexList()', function () {
    var expect = require('expect.js');
    var ngMock = require('ngMock');

    var intervals;
    beforeEach(ngMock.module('kibana'));
    beforeEach(ngMock.inject(function (Private) {
      intervals = Private(require('ui/index_patterns/_intervals'));
    }));

    it('should return correct indices for hourly [logstash-]YYYY.MM.DD.HH', function () {
      var start = moment.utc('2014-01-01T07:00:00Z');
      var end = moment.utc('2014-01-01T08:30:00Z');
      var interval = { name: 'hours', startOf: 'hour', display: 'Hourly' };
      var list = intervals.toIndexList('[logstash-]YYYY.MM.DD.HH', interval, start, end);
      expect(list).to.eql([
        {
          index: 'logstash-2014.01.01.07',
          min: moment.utc('2014-01-01T07:00:00').valueOf(),
          max: moment.utc('2014-01-01T07:59:59.999').valueOf(),
        },
        {
          index: 'logstash-2014.01.01.08',
          min: moment.utc('2014-01-01T08:00:00').valueOf(),
          max: moment.utc('2014-01-01T08:59:59.999').valueOf(),
        }
      ]);
    });

    it('should return correct indices for daily [logstash-]YYYY.MM.DD', function () {
      var start = moment(1418244231248);
      var end = moment(1418849261281);
      var interval = { name: 'days', startOf: 'day', display: 'Daily' };
      var list = intervals.toIndexList('[logstash-]YYYY.MM.DD', interval, start, end);
      expect(list).to.eql([
        {
          index: 'logstash-2014.12.10',
          min: moment.utc('2014-12-10T00:00:00').valueOf(),
          max: moment.utc('2014-12-10T23:59:59.999').valueOf(),
        },
        {
          index: 'logstash-2014.12.11',
          min: moment.utc('2014-12-11T00:00:00').valueOf(),
          max: moment.utc('2014-12-11T23:59:59.999').valueOf(),
        },
        {
          index: 'logstash-2014.12.12',
          min: moment.utc('2014-12-12T00:00:00').valueOf(),
          max: moment.utc('2014-12-12T23:59:59.999').valueOf(),
        },
        {
          index: 'logstash-2014.12.13',
          min: moment.utc('2014-12-13T00:00:00').valueOf(),
          max: moment.utc('2014-12-13T23:59:59.999').valueOf(),
        },
        {
          index: 'logstash-2014.12.14',
          min: moment.utc('2014-12-14T00:00:00').valueOf(),
          max: moment.utc('2014-12-14T23:59:59.999').valueOf(),
        },
        {
          index: 'logstash-2014.12.15',
          min: moment.utc('2014-12-15T00:00:00').valueOf(),
          max: moment.utc('2014-12-15T23:59:59.999').valueOf(),
        },
        {
          index: 'logstash-2014.12.16',
          min: moment.utc('2014-12-16T00:00:00').valueOf(),
          max: moment.utc('2014-12-16T23:59:59.999').valueOf(),
        },
        {
          index: 'logstash-2014.12.17',
          min: moment.utc('2014-12-17T00:00:00').valueOf(),
          max: moment.utc('2014-12-17T23:59:59.999').valueOf(),
        },
      ]);
    });

    it('should return correct indices for monthly [logstash-]YYYY.MM', function () {
      var start = moment.utc('2014-12-01');
      var end = moment.utc('2015-02-01');
      var interval = { name: 'months', startOf: 'month', display: 'Monthly' };
      var list = intervals.toIndexList('[logstash-]YYYY.MM', interval, start, end);
      expect(list).to.eql([
        {
          index: 'logstash-2014.12',
          min: moment.utc(0).year(2014).month(11).valueOf(),
          max: moment.utc(0).year(2015).month(0).subtract(1, 'ms').valueOf(),
        },
        {
          index: 'logstash-2015.01',
          min: moment.utc(0).year(2015).month(0).valueOf(),
          max: moment.utc(0).year(2015).month(1).subtract(1, 'ms').valueOf(),
        },
        {
          index: 'logstash-2015.02',
          min: moment.utc(0).year(2015).month(1).valueOf(),
          max: moment.utc(0).year(2015).month(2).subtract(1, 'ms').valueOf(),
        },
      ]);
    });

    it('should return correct indices for yearly [logstash-]YYYY', function () {
      var start = moment.utc('2014-12-01');
      var end = moment.utc('2015-02-01');
      var interval = { name: 'years', startOf: 'year', display: 'Yearly' };
      var list = intervals.toIndexList('[logstash-]YYYY', interval, start, end);
      expect(list).to.eql([
        {
          index: 'logstash-2014',
          min: moment.utc(0).year(2014).valueOf(),
          max: moment.utc(0).year(2015).subtract(1, 'ms').valueOf(),
        },
        {
          index: 'logstash-2015',
          min: moment.utc(0).year(2015).valueOf(),
          max: moment.utc(0).year(2016).subtract(1, 'ms').valueOf(),
        },
      ]);
    });

    context('with sortDirection=asc', function () {
      it('returns values in ascending order', function () {
        var start = moment.utc('2014-12-01');
        var end = moment.utc('2015-02-01');
        var interval = { name: 'years', startOf: 'year', display: 'Yearly' };
        var list = intervals.toIndexList('[logstash-]YYYY', interval, start, end, 'asc');
        expect(list).to.eql([
          {
            index: 'logstash-2014',
            min: moment.utc(0).year(2014).valueOf(),
            max: moment.utc(0).year(2015).subtract(1, 'ms').valueOf(),
          },
          {
            index: 'logstash-2015',
            min: moment.utc(0).year(2015).valueOf(),
            max: moment.utc(0).year(2016).subtract(1, 'ms').valueOf(),
          },
        ]);
      });
    });

    context('with sortDirection=desc', function () {
      it('returns values in descending order', function () {
        var start = moment.utc('2014-12-01');
        var end = moment.utc('2015-02-01');
        var interval = { name: 'years', startOf: 'year', display: 'Yearly' };
        var list = intervals.toIndexList('[logstash-]YYYY', interval, start, end, 'desc');
        expect(list).to.eql([
          {
            index: 'logstash-2015',
            min: moment.utc(0).year(2015).valueOf(),
            max: moment.utc(0).year(2016).subtract(1, 'ms').valueOf(),
          },
          {
            index: 'logstash-2014',
            min: moment.utc(0).year(2014).valueOf(),
            max: moment.utc(0).year(2015).subtract(1, 'ms').valueOf(),
          },
        ]);
      });
    });
  });
});
