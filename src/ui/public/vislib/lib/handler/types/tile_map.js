define(function (require) {
  return function MapHandlerProvider(Private) {
    var _ = require('lodash');

    var Handler = Private(require('ui/vislib/lib/handler/handler'));
    var Data = Private(require('ui/vislib/lib/data'));

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
});

