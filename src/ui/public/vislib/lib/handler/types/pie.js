import VislibLibHandlerHandlerProvider from 'ui/vislib/lib/handler/handler';
import VislibLibChartTitleProvider from 'ui/vislib/lib/chart_title';

export default function PieHandler(Private) {
  const Handler = Private(VislibLibHandlerHandlerProvider);
  const ChartTitle = Private(VislibLibChartTitleProvider);

  /*
   * Handler for Pie visualizations.
   */

  return function (vis) {
    return new Handler(vis, {
      chartTitle: new ChartTitle(vis.el)
    });
  };
};
