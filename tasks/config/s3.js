var _ = require('lodash');
module.exports = function (grunt) {
  var { config } = grunt;

  return {
    release: {
      bucket: 'download.elasticsearch.org',
      access: 'private',
      // debug: true, // uncommment to prevent actual upload
      upload: config.get('platforms')
      .reduce(function (files, platform) {
        return files.concat(
          platform.tarPath,
          platform.tarPath + '.sha1.txt',
          platform.zipPath,
          platform.zipPath + '.sha1.txt'
        );
      }, [])
      .map(function (filename) {
        return {
          src: 'target/' + filename,
          dest: 'kibana/kibana/' + filename
        };
      })
    }
  };
};
