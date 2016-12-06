import _ from 'lodash';
export default function MapHandlerProvider(Private) {
  return function (config) {
    if (!config.chart) {
      config.chart = _.defaults({}, config, {
        type: 'tile_map'
      });
    }

    config.resize = function () {
      this.charts.forEach(function (chart) {
        chart.resizeArea();
      });
    };

    return config;
  };
};

