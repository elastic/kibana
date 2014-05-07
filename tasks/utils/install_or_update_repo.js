var Promise = require('bluebird');
var spawn = require('./spawn');
var grunt = require('grunt');

module.exports = function (repo, dir) {
  return Promise.resolve()
  .then(function () {
    if (!grunt.file.isDir(dir + '/.git')) {
      if (grunt.file.isDir(dir)) {
        throw new Error(dir + ' needs to be removed so that we can replace it with a git-repo');
      }

      return spawn('git', ['clone', repo, dir])();
    } else {
      return spawn('git', ['fetch', 'origin', 'master'], dir)();
    }
  })
  .then(spawn('git', ['reset', '--hard', 'origin/master'], dir))
  .then(spawn('npm', ['install'], dir));
};