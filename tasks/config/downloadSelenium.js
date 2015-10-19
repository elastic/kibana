var path = require('path');


module.exports = function (grunt) {
  return {
    options: {
      selenium: {
        filename: 'selenium-server-standalone-2.47.1.jar',
        server: 'https://selenium-release.storage.googleapis.com/2.47/',
        md5: 'e6cb10b8f0f353c6ca4a8f62fb5cb472',
        directory: path.join(grunt.config.get('root'), 'selenium')
      }
    }
  };
};
