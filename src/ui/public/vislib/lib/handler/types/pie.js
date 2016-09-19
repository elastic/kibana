import _ from 'lodash';
import VislibLibHandlerHandlerProvider from 'ui/vislib/lib/handler/handler';

export default function PieHandler(Private) {
  const Handler = Private(VislibLibHandlerHandlerProvider);

  /*
   * Handler for Pie visualizations.
   */

  return function (vis) {
    const config = vis._attr;

    if (!config.chart) {
      config.chart = _.defaults(vis._attr, {
        type: 'pie'
      });
    }

    return new Handler(vis, config);
  };
};
