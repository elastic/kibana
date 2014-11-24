module.exports = function (grunt) {
  var Promise = require('bluebird');
  var spawn = require('./utils/spawn');

  grunt.registerTask('get_build_props', function () {
    var shaCmdArgs = ['log', '--format=%H', '-n1'];
    var numCmd = 'git log --format="%h" | wc -l';
    var arg;
    if (process.platform === 'win32') {
      arg = {
        sha: spawn.silent('git', shaCmdArgs)(),
        num: spawn.silent(numCmd)()
      };
    } else {
      arg = {
        sha: spawn.silent('git', shaCmdArgs)(),
        num: spawn.silent('sh', ['-c', numCmd])()
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