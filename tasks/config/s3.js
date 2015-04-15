var createPackages = require('../create_packages');
var _ = require('lodash');
var getBaseNames = createPackages.getBaseNames;
module.exports = function (grunt) {
  var upload = _(getBaseNames(grunt))
    .map(function (basename) {
      return [
        basename + '.tar.gz',
        basename + '.tar.gz.sha1.txt',
        basename + '.zip',
        basename + '.zip.sha1.txt'
      ];
    })
    .flatten()
    .map(function (filename) {
      return {
        src: 'target/' + filename,
        dest: 'kibana/kibana/' + filename
      };
    })
    .value();

  return {
    release: {
      bucket: 'download.elasticsearch.org',
      access: 'private',
      // debug: true, // uncommment to prevent actual upload
      upload: upload
    }
  };
};
