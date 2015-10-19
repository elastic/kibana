var path = require('path');


module.exports = function (grunt) {
  return {
    options: {
      server: 'http://localhost:9220',
      dataDir: path.join(grunt.config.get('root'), 'test/fixtures')
    }
  };
};
