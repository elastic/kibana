const { resolve } = require('path');

module.exports = function (grunt) {
  grunt.registerTask('test:jest', function () {
    const done = this.async();
    runJest().then(done);
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
