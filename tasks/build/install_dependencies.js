import { execFile } from 'child_process';
module.exports = function (grunt) {
  grunt.registerTask('_build:installDependencies', function () {
    // We're using `pure-lockfile` instead of `frozen-lockfile` because we
    // rewrite `link:` dependencies to `file:` dependencies earlier in the
    // build. This means the lockfile won't be consistent, so instead of
    // verifying it, we just skip writing a new lockfile. However, this does
    // still use the existing lockfile for dependency resolution.
    execFile('yarn', ['--production', '--ignore-optional', '--pure-lockfile'], {
      cwd: grunt.config.process('<%= root %>/build/kibana')
    }, this.async());
  });
};
