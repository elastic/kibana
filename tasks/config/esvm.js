module.exports = function (grunt) {
  var join = require('path').join;
  var rel = require('path').join.bind(null, grunt.config.get('root'));
  var directory = join(__dirname, '../../', 'esvm');

  return {
    options: {
      directory: directory,
      version: '1.4.2',
      plugins: [
        'elasticsearch/marvel/latest'
      ],
      config: {
        path: {
          home: rel('1.4.2'),
          config: rel('1.4.2/config'),
          data: rel('data_dir'),
          logs: rel('logs'),
          plugins: rel('1.4.2/plugins')
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
