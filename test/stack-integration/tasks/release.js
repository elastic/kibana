module.exports = function (grunt) {
  var readline = require('readline');
  var url = require('url');
  var fs = require('fs');
  var _ = require('lodash');

  // build, then zip and upload to s3
  grunt.registerTask('release', [
    '_release:confirmUpload',
    '_release:loadS3Config',
    'build',
    '_release:setS3Uploads',
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

  grunt.registerTask('_release:setS3Uploads', function () {
    const { sha, version } = grunt.config.get('build');

    var uploads = grunt.config.get('platforms')
    .reduce(function (files, platform) {
      return files.concat(
        platform.tarName,
        platform.tarName + '.sha1.txt',
        platform.zipName,
        platform.zipName + '.sha1.txt',
        platform.rpmName,
        platform.rpmName && platform.rpmName + '.sha1.txt',
        platform.debName,
        platform.debName && platform.debName + '.sha1.txt'
      );
    }, [])
    .filter(function (filename) {
      if (_.isUndefined(filename)) return false;
      try {
        fs.accessSync('target/' + filename, fs.F_OK);
        return true;
      } catch (e) {
        return false;
      }
    })
    .map(function (filename) {
      const src = `target/${filename}`;

      const shortSha = sha.substr(0, 7);
      const dest = `kibana/staging/${version}-${shortSha}/kibana/${filename}`;

      return { src, dest };
    });
    grunt.config.set('s3.release.upload', uploads);
  });

  grunt.registerTask('_release:complete', function () {
    grunt.log.ok('Builds released');
    var links = grunt.config.get('s3.release.upload').reduce((t, {dest}) => {
      var link = url.format({
        protocol: 'https',
        hostname: 'download.elastic.co',
        pathname: dest
      });
      return `${t}${link}\n`;
    }, '');
    grunt.log.write(links);
  });
};
