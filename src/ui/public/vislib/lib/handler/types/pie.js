define(function (require) {
  return function PieHandler(Private) {
    let Handler = Private(require('ui/vislib/lib/handler/handler'));
    let Data = Private(require('ui/vislib/lib/data'));
    let ChartTitle = Private(require('ui/vislib/lib/chart_title'));

    /*
     * Handler for Pie visualizations.
     */

    return function (vis) {
      return new Handler(vis, {
        chartTitle: new ChartTitle(vis.el)
      });
    };
  };
});
