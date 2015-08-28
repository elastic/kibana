module.exports = function (grunt) {
  var readline = require('readline');

  // build, then zip and upload to s3
  grunt.registerTask('release', [
    '_build:shrinkwrap:ensureExists',
    '_release:confirmUpload',
    '_release:loadS3Config',
    'build',
    's3:release',
    '_release:complete'
  ]);

  grunt.registerTask('_release:confirmUpload', function () {
    var rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.on('close', this.async());
    rl.question('Do you want to actually upload the files to s3 after building?, [N/y] ', function (resp) {
      var debug = resp.toLowerCase().trim()[0] !== 'y';
      grunt.config.set('s3.release.debug', debug);
      rl.close();
    });
  });

  // collect the key and secret from the .aws-config.json file, finish configuring the s3 task
  grunt.registerTask('_release:loadS3Config', function () {
    var config = grunt.file.readJSON('.aws-config.json');
    grunt.config('s3.options', {
      key: config.key,
      secret: config.secret
    });
  });

  grunt.registerTask('_release:complete', function () {
    grunt.log.ok('Builds released');
    grunt.log.write(
`
${grunt.config.get('platforms').reduce((t, p) => {
  return (
`${t}https://download.elastic.co/kibana/kibana/${p.buildName}.tar.gz
https://download.elastic.co/kibana/kibana/${p.buildName}.zip
`
  );
}, '')}
`
);
  });
};
