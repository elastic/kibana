module.exports = function(grunt) {
  grunt.registerTask('release', [
    'release:load_s3_config',
    's3:release'
  ]);
  grunt.registerTask('release:load_s3_config', function () {
    var config = grunt.file.readJSON('.aws-config.json');
    grunt.config('s3.options', {
      key: config.key,
      secret: config.secret
    });
  });
};