import VislibLibHandlerHandlerProvider from 'ui/vislib/lib/handler/handler';
import VislibLibDataProvider from 'ui/vislib/lib/data';
export default function MapHandlerProvider(Private) {

  const Handler = Private(VislibLibHandlerHandlerProvider);
  const Data = Private(VislibLibDataProvider);

  return function (vis) {
    const data = new Data(vis.data, vis._attr, vis.uiState);

    const MapHandler = new Handler(vis, {
      data: data
    });

    MapHandler.resize = function () {
      this.charts.forEach(function (chart) {
        chart.resizeArea();
      });
    };

    return MapHandler;
  };
};

