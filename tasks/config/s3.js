var _ = require('lodash');
module.exports = function (grunt) {
  var { config } = grunt;

  return {
    release: {
      bucket: 'download.elasticsearch.org',
      access: 'private',
      debug: false,
      upload: config.get('platforms')
      .reduce(function (files, platform) {
        return files.concat(
          platform.tarName,
          platform.tarName + '.sha1.txt',
          platform.zipName,
          platform.zipName + '.sha1.txt'
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
