var fs = require('fs');
var path = require('path');

module.exports = function (grunt) {
  grunt.registerTask('_build:chmod', function () {
    const config = grunt.config.get('chmod');
    const rootPath = path.join(grunt.config.get('build'), 'kibana');
    const executables = config.executables.src.map(function (file) {
      return path.join(rootPath, file);
    });

    function isExecutable(file) {
      return executables.indexOf(file) >= 0;
    }

    function setPermissions(src) {
      const files = fs.readdirSync(src);
      files.forEach(function (file) {
        const filePath = path.join(src, file);
        const fileStat = fs.lstatSync(filePath);
        if (fileStat.isDirectory()) {
          setPermissions(filePath);
        } else if (isExecutable(filePath)) {
          fs.chmodSync(filePath, config.executables.options.mode);
        } else {
          fs.chmodSync(filePath, config.defaultFiles);
        }
      });

      fs.chmodSync(src, config.defaultDirectories);
    }

    setPermissions(rootPath);
  });
};
