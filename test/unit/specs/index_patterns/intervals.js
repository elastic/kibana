define(function (require) {
  var moment = require('moment');
  describe('Index Patterns', function () {
    describe('interval.toIndexList()', function () {

      var intervals;
      beforeEach(module('kibana'));
      beforeEach(inject(function (Private) {
        intervals = Private(require('components/index_patterns/_intervals'));
      }));

      it('should return correct indices for hourly [logstash-]YYYY.MM.DD.HH', function () {
        var start = moment.utc('2014-01-01T07:00:00Z');
        var end = moment.utc('2014-01-01T08:30:00Z');
        var interval = { name: 'hours', startOf: 'hour', display: 'Hourly' };
        var list = intervals.toIndexList('[logstash-]YYYY.MM.DD.HH', interval, start, end);
        expect(list).to.contain('logstash-2014.01.01.07');
        expect(list).to.contain('logstash-2014.01.01.08');
      });

      it('should return correct indices for daily [logstash-]YYYY.MM.DD', function () {
        var start = moment(1418244231248);
        var end = moment(1418849261281);
        var interval = { name: 'days', startOf: 'day', display: 'Daily' };
        var list = intervals.toIndexList('[logstash-]YYYY.MM.DD', interval, start, end);
        expect(list).to.contain('logstash-2014.12.10');
        expect(list).to.contain('logstash-2014.12.11');
        expect(list).to.contain('logstash-2014.12.12');
        expect(list).to.contain('logstash-2014.12.13');
        expect(list).to.contain('logstash-2014.12.14');
        expect(list).to.contain('logstash-2014.12.15');
        expect(list).to.contain('logstash-2014.12.16');
        expect(list).to.contain('logstash-2014.12.17');
      });

      it('should return correct indices for weekly [logstash-]GGGG.WW', function () {
        var start = moment.utc(1418244231248);
        var end = moment.utc(1418849261281);
        var interval = { name: 'weeks', startOf: 'isoWeek', display: 'Weekly' };
        var list = intervals.toIndexList('[logstash-]GGGG.WW', interval, start, end);
        expect(list).to.contain('logstash-2014.50');
        expect(list).to.contain('logstash-2014.51');
      });

      it('should return correct indices for monthly [logstash-]YYYY.MM', function () {
        var start = moment.utc('2014-12-01');
        var end = moment.utc('2015-02-01');
        var interval = { name: 'months', startOf: 'month', display: 'Monthly' };
        var list = intervals.toIndexList('[logstash-]YYYY.MM', interval, start, end);
        expect(list).to.contain('logstash-2014.12');
        expect(list).to.contain('logstash-2015.01');
        expect(list).to.contain('logstash-2015.02');
      });

      it('should return correct indices for yearly [logstash-]YYYY', function () {
        var start = moment.utc('2014-12-01');
        var end = moment.utc('2015-02-01');
        var interval = { name: 'years', startOf: 'year', display: 'Yearly' };
        var list = intervals.toIndexList('[logstash-]YYYY', interval, start, end);
        expect(list).to.contain('logstash-2014');
        expect(list).to.contain('logstash-2015');
      });

    });
  });
});
