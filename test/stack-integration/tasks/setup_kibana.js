const exec = require('child_process').execFileSync;
const stat = require('fs').statSync;

const fromRoot = require('path').resolve.bind(null, __dirname, '../');

module.exports = function (grunt) {
  grunt.registerTask('setup_kibana', function () {
    const kbnDir = fromRoot('../kibana');
    const kbnGitDir = fromRoot('../kibana/.git');

    try {
      if (stat(kbnGitDir).isDirectory()) {
        exec('git', ['pull', 'origin', 'master'], { cwd: kbnDir });
      } else {
        throw new Error(`${kbnGitDir} is not a directory??`);
      }
    } catch (error) {
      if (error.code === 'ENOENT') {
        exec('git', ['clone', 'https://github.com/elastic/kibana.git', kbnDir]);
      } else {
        throw error;
      }
    }

    exec('npm', ['prune'], { cwd: kbnDir });
    exec('npm', ['install'], { cwd: kbnDir });
  });
};
