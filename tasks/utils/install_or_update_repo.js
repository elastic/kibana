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

      return spawn('git', ['clone', repo, dir])()
      .then(function () {
        return true;
      });
    } else {
      var prevHash;
      return spawn.silent('git', ['log', '-1', '--pretty=%H'], dir)()
      .then(function (out) {
        prevHash = out.trim();
      })
      .then(spawn('git', ['fetch', 'origin', 'master'], dir))
      .then(spawn.silent('git', ['log', '-1', '--pretty=%H'], dir))
      .then(function (out) {
        var newHash = out.trim();
        if (newHash !== prevHash) {
          spawn('git', ['reset', '--hard', 'origin/master'], dir)()
          .then(spawn('npm', ['install'], dir))
          .then(function () {
            return true;
          });
        }
      });
    }
  });
};