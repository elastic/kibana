module.exports = function (grunt) {
  var rel = require('path').join.bind(null, __dirname, '../../');

  return {
    options: {
      version: '^1.4',
      plugins: [
        'elasticsearch/marvel/latest'
      ],
      config: {
        path: {
          data: rel('esvm/data_dir'),
          logs: rel('esvm/logs')
        },
        network: {
          host: '127.0.0.1'
        },
        marvel: {
          agent: {
            enabled: false
          }
        }
      }
    },
    dev: {}
  };
};