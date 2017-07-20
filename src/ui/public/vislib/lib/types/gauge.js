import _ from 'lodash';

export function vislibGaugeProvider() {

  return function (config) {
    if (!config.chart) {
      config.chart = _.defaults({}, config, {
        type: 'gauge'
      });
    }

    return config;
  };
}
