import _ from 'lodash';

export function VislibPieConfigProvider() {

  return function (config) {
    if (!config.chart) {
      config.chart = _.defaults({}, config, {
        type: 'pie',
        labels: {
          show: false,
          truncate: 100
        }
      });
    }
    return config;
  };
}
