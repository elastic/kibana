module.exports = function (grunt) {
  var Promise = require('bluebird');
  var spawn = require('./utils/spawn');

  grunt.registerTask('get_build_props', function () {
    var arg;
    if (process.platform === 'win32') {
      arg = {
        sha: spawn.silent('git', ['log', '--format=%H', '-n1'])(),
        num: spawn.silent('git log --format=%H | wc -l')()
      };
    } else {
      arg = {
        sha: spawn.silent('git', ['log', '--format=%H', '-n1'])(),
        num: spawn.silent('sh', ['-c', 'git log --format="%h" | wc -l'])()
      };
    }

    Promise.props(arg)
    .then(function (props) {
      grunt.config.set('commitSha', props.sha.trim());
      grunt.config.set('buildNum', props.num.trim());
    })
    .nodeify(this.async());
  });
};