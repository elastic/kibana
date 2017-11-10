import _ from 'ui/lodash';

export function VislibPieConfigProvider() {

  return function (config) {
    if (!config.chart) {
      config.chart = _.defaults({}, config, {
        type: 'pie'
      });
    }
    return config;
  };
}
