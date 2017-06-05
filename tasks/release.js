import readline from 'readline';
import url from 'url';
import fs from 'fs';
import path from 'path';
module.exports = function (grunt) {
  // build, then zip and upload to s3
  grunt.registerTask('release', [
    '_release:confirmUpload',
    'build',
    '_release:loadS3Config',
    'aws_s3:staging',
    '_release:complete'
  ]);

  grunt.registerTask('_release:confirmUpload', function () {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.on('close', this.async());
    rl.question('Do you want to actually upload the files to s3 after building?, [N/y] ', function (resp) {
      const debug = resp.toLowerCase().trim()[0] !== 'y';

      grunt.config.set('aws_s3.staging.options.debug', debug);

      rl.close();
    });
  });

  // collect the key and secret from the .aws-config.json file, finish configuring the s3 task
  grunt.registerTask('_release:loadS3Config', function () {
    const config = grunt.file.readJSON('.aws-config.json');

    grunt.config('aws_s3.options', {
      accessKeyId: config.key,
      secretAccessKey: config.secret,
      bucket: config.bucket || grunt.config.get('aws_s3.options.bucket'),
      region: config.region
    });
  });

  grunt.registerTask('_release:complete', function () {
    const config = grunt.config.get('aws_s3.staging.files');

    grunt.log.ok('Builds uploaded');

    fs.readdirSync('./target').forEach((file) => {
      if (path.extname(file) !== '.txt') {
        const link = url.format({
          protocol: 'https',
          hostname: 'download.elastic.co',
          pathname: config[0].dest + file
        });

        grunt.log.writeln(link);
      }
    });
  });
};
