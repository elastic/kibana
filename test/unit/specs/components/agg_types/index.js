define(function (require) {
  describe('AggTypesComponent', function () {
    var childSuites = [
      require('specs/components/agg_types/_agg_type'),
      require('specs/components/agg_types/_agg_params'),
      require('specs/components/agg_types/_bucket_count_between'),
      require('specs/components/agg_types/buckets/_histogram'),
      require('specs/components/agg_types/buckets/_date_histogram'),
      require('specs/components/agg_types/buckets/_terms'),
      require('specs/components/agg_types/_metric_aggs')
    ].forEach(function (s) {
      describe(s[0], s[1]);
    });
  });
});