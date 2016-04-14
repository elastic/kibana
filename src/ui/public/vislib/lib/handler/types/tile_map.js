define(function (require) {
  return function MapHandlerProvider(Private) {
    let _ = require('lodash');

    let Handler = Private(require('ui/vislib/lib/handler/handler'));
    let Data = Private(require('ui/vislib/lib/data'));

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
});

