var _ = require('lodash');
var join = require('path').join;
var fs = require('fs');
module.exports = function (grunt) {
  grunt.registerTask('strip_down_packagejson', 'This will strip out all the devDependencies from package.json', function () {
    var src = join(grunt.config.get('build'), 'dist', 'kibana', 'src');
    var done = this.async();
    var json = _.cloneDeep(grunt.config.get('pkg'));
    json.devDependencies = [];
    fs.writeFile(join(src, 'package.json'), JSON.stringify(json, null, ' '), done);
  });
};

