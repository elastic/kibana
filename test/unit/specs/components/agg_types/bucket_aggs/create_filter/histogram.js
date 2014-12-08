define(function (require) {
  var _ = require('lodash');

  describe('AggConfig Filters', function () {
    describe('histogram', function () {
      var AggConfig;
      var indexPattern;
      var Vis;
      var createFilter;

      beforeEach(module('kibana'));
      beforeEach(inject(function (Private) {
        Vis = Private(require('components/vis/vis'));
        AggConfig = Private(require('components/vis/_agg_config'));
        indexPattern = Private(require('fixtures/stubbed_logstash_index_pattern'));
        createFilter = Private(require('components/agg_types/buckets/create_filter/histogram'));
      }));

      it('should return an range filter for histogram', function () {
        var vis = new Vis(indexPattern, {
          type: 'histogram',
          aggs: [
            {
              type: 'histogram',
              schema: 'segment',
              params: { field: 'bytes', interval: 1024 }
            }
          ]
        });

        var aggConfig = vis.aggs.byTypeName.histogram[0];
        var filter = createFilter(aggConfig, 2048);
        expect(filter).to.have.property('meta');
        expect(filter.meta).to.have.property('index', indexPattern.id);
        expect(filter).to.have.property('range');
        expect(filter.range).to.have.property('bytes');
        expect(filter.range.bytes).to.have.property('gte', 2048);
        expect(filter.range.bytes).to.have.property('lt', 3072);

      });

    });
  });
});
