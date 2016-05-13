var _ = require('lodash');
var fs = require('fs');
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
        return {
          src: 'target/' + filename,
          dest: 'kibana/kibana/' + filename
        };
      })
    }
  };
};
