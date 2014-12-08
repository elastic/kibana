define(function (require) {
  return ['Vislib', exportWrapper];

  function exportWrapper() {
    run(require('specs/plugins/vis_types/vislib/_renderbot'));
    run(require('specs/plugins/vis_types/vislib/_build_chart_data'));
    function run(m) { describe(m[0], m[1]); }
  }
});