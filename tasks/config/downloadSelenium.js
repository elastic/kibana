var path = require('path');


module.exports = function (grunt) {
  return {
    options: {
      selenium: {
        filename: 'selenium-server-standalone-2.53.0.jar',
        server: 'https://selenium-release.storage.googleapis.com/2.53/',
        md5: '774efe2d84987fb679f2dea038c2fa32',
        directory: path.join(grunt.config.get('root'), 'selenium')
      }
    }
  };
};
