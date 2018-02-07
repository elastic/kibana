module.exports = grunt => {
  grunt.registerTask(
    'buildPackages',
    'Build all the Kibana specific packages',
    async function () {
      const done = this.async();

      try {
        await buildPackages();
        done();
      } catch (e) {
        grunt.fail.fatal(e);
        done(e);
      }
    }
  );

  function buildPackages() {
    const serverCmd = {
      cmd: 'yarn',
      args: [
        'kbn',
        'run',
        'build',
        '--skip-kibana',
        '--skip-kibana-extra'
      ],
      opts: {
        stdio: 'inherit'
      }
    };

    return new Promise((resolve, reject) => {
      grunt.util.spawn(serverCmd, (error, result, code) => {
        if (error || code !== 0) {
          const error = new Error(`'yarn kbn run' exited with code ${code}`);
          reject(error);
          return;
        }

        resolve();
      });
    });
  }
};
