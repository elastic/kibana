module.exports = function (grunt) {
  grunt.registerTask('test:dev', [
    'configureRewriteRules',
    'jade:test',
    'connect:test',
    'watch:dev'
  ]);
  grunt.registerTask('test', [
    'configureRewriteRules',
    'jade:test',
    'connect:test',
    // 'mocha:unit',
    'blanket_mocha'
  ]);
  grunt.registerTask('test:watch', [ 'test', 'watch:test' ]);
};
