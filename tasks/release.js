module.exports = function (grunt) {

  // build, then zip and upload to s3
  grunt.registerTask('release', [
    'npm_shrinkwrap_exists',
    'distribute:load_s3_config',
    'build',
    's3:release',
  ]);

  // collect the key and secret from the .aws-config.json file, finish configuring the s3 task
  grunt.registerTask('distribute:load_s3_config', function () {
    var config = grunt.file.readJSON('.aws-config.json');
    grunt.config('s3.options', {
      key: config.key,
      secret: config.secret
    });
  });
};