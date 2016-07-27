var Promise = require('bluebird');
var join = require('path').join;
var _ = require('lodash');

module.exports = function (grunt) {

  grunt.registerTask('compile_dist_readme', function () {
    var done = this.async();
    var root = grunt.config.get('root');
    var build = grunt.config.get('build');

    var srcReadme =  join(root, 'README.md');
    var distReadme = join(build, 'dist', 'kibana', 'README.txt');

    var srcLicense =  join(root, 'LICENSE.md');
    var distLicense = join(build, 'dist', 'kibana', 'LICENSE.txt');

    function transformReadme(readme) {
      return readme.replace(/\s##\sSnapshot\sBuilds[\s\S]*/, '');
    }

    grunt.file.copy(srcLicense, distLicense);
    grunt.file.write(distReadme, transformReadme(grunt.file.read(srcReadme)));
  });

};
