const { resolve } = require('path');

module.exports = function (grunt) {
  grunt.registerTask('test:jest', function () {
    const done = this.async();
    runJest().then(done, done);
  });

  function runJest() {
    const serverCmd = {
      cmd: 'node',
      args: [
        resolve(__dirname, '../scripts/jest.js')
      ],
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
