define(function (require) {
  describe('Tabify Agg Response', function () {
    describe(require('specs/components/agg_response/tabify/_get_columns'));
    describe(require('specs/components/agg_response/tabify/_buckets'));
    describe(require('specs/components/agg_response/tabify/_table'));
    describe(require('specs/components/agg_response/tabify/_table_group'));
    describe(require('specs/components/agg_response/tabify/_response_writer'));
    describe(require('specs/components/agg_response/tabify/_integration'));
  });
});
