const platform = require('os').platform();
const config = require('./utils/ui_framework_test_config');

module.exports = function (grunt) {
  grunt.registerTask('uiFramework:test', function () {
    const done = this.async();
    Promise.all([uiFrameworkTest()]).then(done);
  });

  function uiFrameworkTest() {
    const serverCmd = {
      cmd: /^win/.test(platform) ? '.\\node_modules\\.bin\\jest.cmd' : './node_modules/.bin/jest',
      args: [
        '--env=jsdom',
        `--config=${JSON.stringify(config)}`,
      ],
      opts: { stdio: 'inherit' }
    };

    return new Promise((resolve, reject) => {
      grunt.util.spawn(serverCmd, (error, result, code) => {
        if (error || code !== 0) {
          const message = result.stderr || result.stdout;

          grunt.log.error(message);

          return reject();
        }

        grunt.log.writeln(result);

        resolve();
      });

    });
  }
};
