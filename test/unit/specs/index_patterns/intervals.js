define(function (require) {
  var moment = require('moment');
  describe('Index Patterns', function () {
    describe('interval.toIndexList()', function () {

      var interval;
      beforeEach(module('kibana'));
      beforeEach(inject(function (Private) {
        interval = Private(require('components/index_patterns/_intervals'));
      }));

      it('should return week 49 and 50 for 2014-12-07 to 2014-12-14 with GGGG.WW', function () {
        var start = moment('2014-12-07');
        var end = moment('2014-12-14');
        var list = interval.toIndexList('[logstash-]GGGG.WW', 'weeks', start, end);
        expect(list).to.contain('logstash-2014.49');
        expect(list).to.contain('logstash-2014.50');
      });

    });
  });
});
