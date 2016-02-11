import _ from 'lodash';
import VislibLibHandlerHandlerProvider from 'ui/vislib/lib/handler/handler';
import VislibLibDataProvider from 'ui/vislib/lib/data';
export default function MapHandlerProvider(Private) {

  var Handler = Private(VislibLibHandlerHandlerProvider);
  var Data = Private(VislibLibDataProvider);

  return function (vis) {
    var data = new Data(vis.data, vis._attr, vis.uiState);

    var MapHandler = new Handler(vis, {
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

