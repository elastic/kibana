module.exports = function (grunt) {
  var Promise = require('bluebird');
  var spawn = require('./utils/spawn');

  grunt.registerTask('get_build_props', function () {
    Promise.props({
      sha: spawn.silent('git', ['log', '--format=%H', '-n1'])(),
      num: spawn.silent('sh', ['-c', 'git log --format="%h" | wc -l'])()
    })
    .then(function (props) {
      grunt.config.set('commitSha', props.sha.trim());
      grunt.config.set('buildNum', props.num.trim());
    })
    .nodeify(this.async());
  });
};