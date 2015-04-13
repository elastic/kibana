define(function (require) {
  var moment = require('moment');
  describe('AggConfig Filters', function () {
    describe('Date range', function () {
      var AggConfig;
      var indexPattern;
      var Vis;
      var createFilter;

      beforeEach(module('kibana'));
      beforeEach(inject(function (Private) {
        Vis = Private(require('components/vis/vis'));
        AggConfig = Private(require('components/vis/_agg_config'));
        indexPattern = Private(require('fixtures/stubbed_logstash_index_pattern'));
        createFilter = Private(require('components/agg_types/buckets/create_filter/date_range'));
      }));

      it('should return a range filter for date_range agg', function () {
        var vis = new Vis(indexPattern, {
          type: 'histogram',
          aggs: [
            {
              type: 'date_range',
              params: {
                field: '@timestamp',
                ranges: [
                  { from: '2014-01-01', to: '2014-12-31' }
                ]
              }
            }
          ]
        });

        var aggConfig = vis.aggs.byTypeName.date_range[0];
        var filter = createFilter(aggConfig, 'February 1st, 2015 to February 7th, 2015');
        expect(filter).to.have.property('range');
        expect(filter).to.have.property('meta');
        expect(filter.meta).to.have.property('index', indexPattern.id);
        expect(filter.range).to.have.property('@timestamp');
        expect(filter.range['@timestamp']).to.have.property('gte', +new Date('1 Feb 2015'));
        expect(filter.range['@timestamp']).to.have.property('lt', +new Date('7 Feb 2015'));
      });
    });
  });
});
