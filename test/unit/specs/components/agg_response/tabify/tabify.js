define(function (require) {
  describe('Tabify Agg Response', function () {
    run(require('specs/components/agg_response/tabify/_get_columns'));
    run(require('specs/components/agg_response/tabify/_buckets'));
    run(require('specs/components/agg_response/tabify/_table'));
    run(require('specs/components/agg_response/tabify/_table_group'));
    run(require('specs/components/agg_response/tabify/_response_writer'));
    run(require('specs/components/agg_response/tabify/_integration'));
    function run(module) { describe(module[0], module[1]); }
  });
});