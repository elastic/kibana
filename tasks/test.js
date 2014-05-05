module.exports = function (grunt) {
  grunt.registerTask('test:dev', [
    'replace:dev_marvel_config',
    'configureRewriteRules',
    'jade:test',
    'connect:test',
    'watch:dev'
  ]);
  grunt.registerTask('test', [
    'replace:dev_marvel_config',
    'configureRewriteRules',
    'jade:test',
    'connect:test',
    // 'mocha:unit',
    'blanket_mocha'
  ]);
  grunt.registerTask('test:watch', [ 'test', 'watch:test' ]);
};
