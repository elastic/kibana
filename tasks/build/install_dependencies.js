import { exec } from 'child_process';
module.exports = function (grunt) {
  grunt.registerTask('_build:installDependencies', function () {
    // We rely on a local version of Yarn that contains the bugfix from
    // https://github.com/yarnpkg/yarn/pull/5059. Once this fix is merged
    // and released we can use Yarn directly in the build.
    const yarn = require.resolve('../../packages/kbn-build/vendor/yarn-1.3.2.js');

    // We're using `pure-lockfile` instead of `frozen-lockfile` because we
    // rewrite `link:` dependencies to `file:` dependencies earlier in the
    // build. This means the lockfile won't be consistent, so instead of
    // verifying it, we just skip writing a new lockfile.
    exec(`${yarn} --production --ignore-optional --pure-lockfile`, {
      cwd: grunt.config.process('<%= root %>/build/kibana')
    }, this.async());
  });
};
