const sass = require('node-sass');
const platform = require('os').platform();

module.exports = function (grunt) {
  const watcherCmd = {
    cmd: /^win/.test(platform) ? '.\\node_modules\\.bin\\node-sass' : './node_modules/.bin/node-sass',
    args: [
      'ui_framework/components/index.scss',
      '--watch',
      '--recursive',
      'ui_framework/dist/ui_framework.css'
    ]
  };

  const serverCmd = {
    cmd: /^win/.test(platform) ? '.\\node_modules\\.bin\\webpack-dev-server' : './node_modules/.bin/webpack-dev-server',
    args: [
      '--config=ui_framework/doc_site/webpack.config.js',
      '--hot ',
      '--inline',
      '--content-base=ui_framework/doc_site/build'
    ]
  };

  function spawn(task) {
    return new Promise((resolve, reject) => {
      grunt.util.spawn(task, (error, result, code) => {
        grunt.log.writeln();

        if (error || code !== 0) {
          const message = result.stderr || result.stdout;

          grunt.log.error(message);

          reject();
        }

        grunt.log.writeln(result);

        resolve();
      });

    });
  }

  grunt.registerTask('uiFramework:start', function () {
    const done = this.async();
    const commands = [watcherCmd, serverCmd].map((cmd) => {
      return Object.assign({ opts: { stdio: 'inherit' } }, cmd);
    });

    Promise.all(commands.map(spawn)).then(done);
  });
};
