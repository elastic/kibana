import _ from 'lodash';

export default function PieConfig(Private) {

  return function (config) {
    if (!config.chart) {
      config.chart = _.defaults({}, config, {
        type: 'pie'
      });
    }
    return config;
  };
};
