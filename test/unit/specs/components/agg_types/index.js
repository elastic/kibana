define(function (require) {
  describe('AggTypesComponent', function () {
    var childSuites = [
      require('specs/components/agg_types/_agg_type'),
      require('specs/components/agg_types/_agg_params'),
      require('specs/components/agg_types/_bucket_count_between'),
      require('specs/components/agg_types/buckets/_histogram'),
      require('specs/components/agg_types/buckets/_date_histogram'),
      require('specs/components/agg_types/metrics/_extended_stats')
    ].forEach(function (s) {
      describe(s[0], s[1]);
    });

    describe('bucket aggs', function () {
      var bucketAggs;
      var BucketAggType;

      beforeEach(module('kibana'));
      beforeEach(inject(function (Private) {
        bucketAggs = Private(require('components/agg_types/index')).byType.buckets;
        BucketAggType = Private(require('components/agg_types/buckets/_bucket_agg_type'));
      }));

      it('all extend BucketAggType', function () {
        bucketAggs.forEach(function (bucketAgg) {
          expect(bucketAgg).to.be.a(BucketAggType);
        });
      });
    });

    describe('metric aggs', function () {
      var metricAggs;
      var MetricAggType;

      beforeEach(module('kibana'));
      beforeEach(inject(function (Private) {
        metricAggs = Private(require('components/agg_types/index')).byType.metrics;
        MetricAggType = Private(require('components/agg_types/metrics/_metric_agg_type'));
      }));

      it('all extend MetricAggType', function () {
        metricAggs.forEach(function (metricAgg) {
          expect(metricAgg).to.be.a(MetricAggType);
        });
      });
    });
  });
});