define(function (require) {
  describe('AggConfig Filters', function () {
    describe('IP range', function () {
      var AggConfig;
      var indexPattern;
      var Vis;
      var createFilter;

      beforeEach(module('kibana'));
      beforeEach(inject(function (Private) {
        Vis = Private(require('components/vis/vis'));
        AggConfig = Private(require('components/vis/_agg_config'));
        indexPattern = Private(require('fixtures/stubbed_logstash_index_pattern'));
        createFilter = Private(require('components/agg_types/buckets/create_filter/ip_range'));
      }));

      it('should return a range filter for ip_range agg', function () {
        var vis = new Vis(indexPattern, {
          type: 'histogram',
          aggs: [
            {
              type: 'ip_range',
              schema: 'segment',
              params: {
                field: 'ip',
                ipRangeType: 'fromTo',
                ranges: {
                  fromTo: [
                    { from: '0.0.0.0', to: '1.1.1.1' }
                  ]
                }
              }
            }
          ]
        });

        var aggConfig = vis.aggs.byTypeName.ip_range[0];
        var filter = createFilter(aggConfig, '0.0.0.0-1.1.1.1');
        expect(filter).to.have.property('range');
        expect(filter).to.have.property('meta');
        expect(filter.meta).to.have.property('index', indexPattern.id);
        expect(filter.range).to.have.property('ip');
        expect(filter.range.ip).to.have.property('gte', '0.0.0.0');
        expect(filter.range.ip).to.have.property('lte', '1.1.1.1');
      });

      it('should return a range filter for ip_range agg using a CIDR mask', function () {
        var vis = new Vis(indexPattern, {
          type: 'histogram',
          aggs: [
            {
              type: 'ip_range',
              schema: 'segment',
              params: {
                field: 'ip',
                ipRangeType: 'mask',
                ranges: {
                  mask: [
                    { mask: '67.129.65.201/27' }
                  ]
                }
              }
            }
          ]
        });

        var aggConfig = vis.aggs.byTypeName.ip_range[0];
        var filter = createFilter(aggConfig, '67.129.65.201/27');
        expect(filter).to.have.property('range');
        expect(filter).to.have.property('meta');
        expect(filter.meta).to.have.property('index', indexPattern.id);
        expect(filter.range).to.have.property('ip');
        expect(filter.range.ip).to.have.property('gte', '67.129.65.192');
        expect(filter.range.ip).to.have.property('lte', '67.129.65.223');
      });
    });
  });
});
