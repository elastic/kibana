const platform = require('os').platform();

module.exports = function (grunt) {
  grunt.registerTask('test:jest', function () {
    const done = this.async();
    runJest().then(done);
  });

  function runJest() {
    const serverCmd = {
      cmd: 'node',
      args: [
        /^win/.test(platform) ? '.\\scripts\\jest' : './scripts/jest'
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
