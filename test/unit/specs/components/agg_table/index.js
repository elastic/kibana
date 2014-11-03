define(function (require) {
  describe('AggTable Component', function () {
    run(require('specs/components/agg_table/_group'));
    run(require('specs/components/agg_table/_table'));
    function run(mod) { describe(mod[0], mod[1]); }
  });
});