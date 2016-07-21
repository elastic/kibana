define(function (require) {
  return function PieHandler(Private) {
    var Handler = Private(require('ui/vislib/lib/handler/handler'));
    var Data = Private(require('ui/vislib/lib/data'));
    var ChartTitle = Private(require('ui/vislib/lib/chart_title'));

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
