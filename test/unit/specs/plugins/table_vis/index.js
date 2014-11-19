define(function (require) {
  describe('Table Vis', function () {
    function run(m) { describe(m[0], m[1]); }
    run(require('specs/plugins/table_vis/_table_vis_controller'));
    run(require('specs/plugins/table_vis/_table_vis'));
  });
});