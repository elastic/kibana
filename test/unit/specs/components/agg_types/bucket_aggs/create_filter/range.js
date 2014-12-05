define(function (require) {
  describe('AggConfig Filters', function () {
    describe('range', function () {
      var AggConfig;
      var indexPattern;
      var Vis;
      var createFilter;

      beforeEach(module('kibana'));
      beforeEach(inject(function (Private) {
        Vis = Private(require('components/vis/vis'));
        AggConfig = Private(require('components/vis/_agg_config'));
        indexPattern = Private(require('fixtures/stubbed_logstash_index_pattern'));
        createFilter = Private(require('components/agg_types/buckets/create_filter/range'));
      }));

      it('should return a range filter for range agg', function () {
        var vis = new Vis(indexPattern, {
          type: 'histogram',
          aggs: [
            {
              type: 'range',
              schema: 'segment',
              params: {
                field: 'bytes',
                ranges: [
                  { from: 1024, to: 2048 }
                ]
              }
            }
          ]
        });

        var aggConfig = vis.aggs.byTypeName.range[0];
        var filter = createFilter(aggConfig, '1024.0-2048.0');
        expect(filter).to.have.property('range');
        expect(filter).to.have.property('meta');
        expect(filter.meta).to.have.property('index', indexPattern.id);
        expect(filter.range).to.have.property('bytes');
        expect(filter.range.bytes).to.have.property('gte', 1024.0);
        expect(filter.range.bytes).to.have.property('lte', 2048.0);
      });

    });
  });
});
