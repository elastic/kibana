const { resolve } = require('path');

module.exports = function (grunt) {
  grunt.registerTask('test:jest', function () {
    const done = this.async();
    runJest(resolve(__dirname, '../scripts/jest.js')).then(done, done);
  });

  grunt.registerTask('test:jest_integration', function () {
    const done = this.async();
    runJest(resolve(__dirname, '../scripts/jest_integration.js')).then(done, done);
  });

  function runJest(jestScript) {
    const serverCmd = {
      cmd: 'node',
      args: [jestScript, '--no-cache', '--ci'],
      opts: { stdio: 'inherit' }
    };

    return new Promise((resolve, reject) => {
      grunt.util.spawn(serverCmd, (error, result, code) => {
        if (error || code !== 0) {
          const error = new Error(`jest exited with code ${code}`);
          grunt.fail.fatal(error);
          reject(error);
          return;
        }

        grunt.log.writeln(result);
        resolve();
      });

    });
  }
};
