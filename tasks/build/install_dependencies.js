import { exec } from 'child_process';
module.exports = function (grunt) {
  grunt.registerTask('_build:installDependencies', function () {
    // We rely on a local version of Yarn that contains the bugfix from
    // https://github.com/yarnpkg/yarn/pull/5059. Once this fix is merged
    // and released we can use Yarn directly in the build.
    const yarn = require.resolve('../vendor/yarn-1.3.2-with-ignore-fix.js');

    exec(`${yarn} --production --ignore-optional --frozen-lockfile`, {
      cwd: grunt.config.process('<%= root %>/build/kibana')
    }, this.async());
  });
};
