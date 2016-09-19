import _ from 'lodash';
import VislibLibHandlerHandlerProvider from 'ui/vislib/lib/handler/handler';
export default function MapHandlerProvider(Private) {

  const Handler = Private(VislibLibHandlerHandlerProvider);

  return function (vis) {
    const config = vis._attr;

    if (!config.chart) {
      config.chart = _.defaults(vis._attr, {
        type: 'tile_map'
      });
    }

    const MapHandler = new Handler(vis, config);

    MapHandler.resize = function () {
      this.charts.forEach(function (chart) {
        chart.resizeArea();
      });
    };

    return MapHandler;
  };
};

