module.exports = function (grunt) {
  grunt.registerTask('run_build', [
    'build',
    '_extract_built',
    'run:built_kibana'
  ]);

  var join = require('path').join;
  var extract = require('./utils/spawn')(
    'tar',
    ['-xzf', grunt.config.process('<%= pkg.name %>-<%= pkg.version %>.tar.gz')],
    join(__dirname, '../target')
  );

  grunt.registerTask('_extract_built', function () {
    extract().nodeify(this.async());
  });
};