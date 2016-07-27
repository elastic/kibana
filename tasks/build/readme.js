let marked = require('marked');
let Promise = require('bluebird');
let { join } = require('path');
let _ = require('lodash');
let fs = require('fs');

module.exports = function (grunt) {
  grunt.registerTask('_build:readme', function () {
    function transformReadme(readme) {
      return readme.replace(/\s##\sSnapshot\sBuilds[\s\S]*/, '');
    }

    grunt.file.copy('LICENSE.md', 'build/kibana/LICENSE.txt');
    grunt.file.write('build/kibana/README.txt', transformReadme(grunt.file.read('README.md')));
  });

};
