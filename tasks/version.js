module.exports = function (grunt) {
  var root = require('path').resolve.bind(null, __dirname, '..');
  var updateVersion = require('./utils/updateVersion');

  var README_PATH = root('README.md');
  var PKG_JSON_PATH = root('package.json');
  var START = '<!--version-->';
  var END = '<!--/version-->';

  grunt.registerTask('version', function (updateExpr) {
    var oldVersion = grunt.config.get('pkg.version');
    var version = updateVersion(oldVersion, updateExpr);
    grunt.log.debug('switching from %s to %s', oldVersion, version);

    // update grunt config
    grunt.config.set('pkg.version', version);

    // write back to package.json
    var pkgJson = grunt.file.read(PKG_JSON_PATH);
    pkgJson = pkgJson.replace(JSON.stringify(oldVersion), JSON.stringify(version));
    grunt.file.write(PKG_JSON_PATH, pkgJson);
    grunt.log.ok('updated package.json', version);

    // write the readme
    var input = grunt.file.read(README_PATH);
    var readme = '';

    var startI, endI, before;
    while (input.length) {
      startI = input.indexOf(START);
      endI = input.indexOf(END);
      if (endI < startI) throw new Error('version tag mismatch in ' + input);

      if (startI < 0) {
        readme += input;
        break;
      }

      before = input.substr(0, startI);
      input = input.substr(endI ? endI + END.length : startI);

      readme += before + START + version + END;
    }

    grunt.file.write(README_PATH, readme);
    grunt.log.ok('updated readme', version);
  });
};
