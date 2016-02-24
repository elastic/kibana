var path = require('path');


module.exports = function (grunt) {
  return {
    options: {
      selenium: {
        filename: 'selenium-server-standalone-2.48.2.jar',
        server: 'https://selenium-release.storage.googleapis.com/2.48/',
        md5: 'b2784fc67c149d3c13c83d2108104689',
        directory: path.join(grunt.config.get('root'), 'selenium')
      }
    }
  };
};
