module.exports = function (grunt) {

  var file = 'build/kibana/src/cli/index.js';
  var blurb = `require('babel/register')(require('../optimize/babelOptions'));\n`;

  grunt.registerTask('build:cliIndex', function () {
    var before = grunt.file.read(file);
    var after = before.replace(blurb, '');

    if (before === after) {
      grunt.log.error(`unable to remove "${blurb}" from ${file}`);
      return;
    }

    grunt.file.write(file, after);
  });

};
