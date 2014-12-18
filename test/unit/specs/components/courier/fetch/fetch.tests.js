define(function (require) {
  describe('Courier Fetch', function () {
    run(require('specs/components/courier/fetch/strategy/_segmented'));
    run(require('specs/components/courier/fetch/_segmented_state'));
    function run(mod) { describe(mod[0], mod[1]); }
  });
});