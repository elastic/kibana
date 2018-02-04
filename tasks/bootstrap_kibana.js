module.exports = grunt => {
  grunt.registerTask(
    'bootstrapKibana',
    'Bootstrap Kibana and all Kibana packages',
    async function () {
      const done = this.async();

      try {
        await bootstrapKibana();
        done();
      } catch (e) {
        grunt.fail.fatal(e);
        done(e);
      }
    }
  );

  function bootstrapKibana() {
    const serverCmd = {
      cmd: 'yarn',
      args: [
        'kbn',
        'bootstrap',
        '--skip-kibana-extra'
      ],
      opts: {
        stdio: 'inherit'
      }
    };

    return new Promise((resolve, reject) => {
      grunt.util.spawn(serverCmd, (error, result, code) => {
        if (error || code !== 0) {
          const error = new Error(`'yarn kbn bootstrap' exited with code ${code}`);
          reject(error);
          return;
        }

        resolve();
      });
    });
  }
};
