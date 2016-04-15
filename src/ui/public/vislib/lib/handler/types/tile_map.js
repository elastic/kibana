import _ from 'lodash';
import VislibLibHandlerHandlerProvider from 'ui/vislib/lib/handler/handler';
import VislibLibDataProvider from 'ui/vislib/lib/data';
export default function MapHandlerProvider(Private) {

  let Handler = Private(VislibLibHandlerHandlerProvider);
  let Data = Private(VislibLibDataProvider);

  return function (vis) {
    let data = new Data(vis.data, vis._attr, vis.uiState);

    let MapHandler = new Handler(vis, {
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

