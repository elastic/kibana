define(function (require) {
  var _ = require('lodash');
  var moment = require('moment');
  describe('AggConfig Filters', function () {
    describe('date_historgram', function () {
      var AggConfig;
      var indexPattern;
      var Vis;
      var createFilter;

      beforeEach(module('kibana'));
      beforeEach(inject(function (Private) {
        Vis = Private(require('components/vis/vis'));
        AggConfig = Private(require('components/vis/_agg_config'));
        indexPattern = Private(require('fixtures/stubbed_logstash_index_pattern'));
        createFilter = Private(require('components/agg_types/buckets/create_filter/date_histogram'));
      }));

      var runTest = function (intervalString, interval) {
        it('should return a range filter for ' + intervalString, function () {
          var vis = new Vis(indexPattern, {
            type: 'histogram',
            aggs: [
              {
                type: 'date_histogram',
                schema: 'segment',
                params: { field: '@timestamp', interval: intervalString }
              }
            ]
          });
          var aggConfig = vis.aggs.byTypeName.date_histogram[0];
          var date = moment('2014-01-01 12:00');
          var max = date.clone().add(interval, 'ms');
          var filter = createFilter(aggConfig, date.valueOf());
          expect(filter).to.have.property('range');
          expect(filter).to.have.property('meta');
          expect(filter.range).to.have.property('@timestamp');
          expect(filter.range['@timestamp']).to.have.property('gte', date.valueOf());
          expect(filter.range['@timestamp']).to.have.property('lte', max.valueOf());
          expect(filter.meta).to.have.property('index', indexPattern.id);
        });
      };

      runTest('auto', 30000);
      runTest('second', 10000);
      runTest('minute', 60000);
      runTest('hour', 3600000);
      runTest('day', 86400000);
      runTest('week', 604800000);
      runTest('month', 2592000000);
      runTest('year', 31536000000);

    });
  });
});
