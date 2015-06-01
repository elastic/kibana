define(function (require) {
  return ['Date Histogram Agg', function () {
    describe(require('specs/components/agg_types/buckets/date_histogram/_editor'));
    describe(require('specs/components/agg_types/buckets/date_histogram/_params'));
  }];
});
