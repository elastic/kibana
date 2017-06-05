import Promise from 'bluebird';
import spawn from './spawn';
import grunt from 'grunt';

module.exports = function (repo, dir) {
  // store the previous and new hash from the repo
  // to know if there was an update from fetch
  let prevHash;
  let newHash;

  return Promise.resolve()
  .then(function () {
    if (!grunt.file.isDir(dir + '/.git')) {
      if (grunt.file.isDir(dir)) {
        throw new Error(dir + ' needs to be removed so that we can replace it with a git-repo');
      }

      return spawn('git', ['clone', repo, dir])();
    } else {
      return spawn.silent('git', ['log', '-1', '--pretty=%H'], dir)()
      .then(function (out) {
        prevHash = out.trim();
      })
      .then(spawn('git', ['fetch', 'origin', 'master'], dir))
      .then(spawn('git', ['reset', '--hard', 'origin/master'], dir))
      .then(spawn.silent('git', ['log', '-1', '--pretty=%H'], dir));
    }
  })
  .then(function (out) {
    if (prevHash) newHash = out.trim();
    if (!prevHash || newHash !== prevHash) {
      return spawn('npm', ['update'], dir)()
      .then(spawn('bower', ['install'], dir))
      .then(function () {
        return true;
      });
    }
  });
};
