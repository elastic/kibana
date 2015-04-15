define(function (require) {
  describe('lodash mixins', function () {
    run(require('specs/utils/mixins/_move'));
    run(require('specs/utils/mixins/_organize_by'));
    function run(m) { describe(m[0], m[1]); }
  });
});