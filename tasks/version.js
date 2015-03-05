module.exports = function (grunt) {
  var root = require('path').resolve.bind(null, __dirname, '..');
  var updateVersion = require('./utils/updateVersion');

  var README_PATH = root('README.md');
  var PKG_JSON_PATH = root('package.json');

  function replace(source, from, to) {
    return String(source).split(from).join(to);
  }

  grunt.registerTask('version', function (updateExpr) {
    var oldVersion = grunt.config.get('pkg.version');
    var version = updateVersion(oldVersion, updateExpr);
    grunt.log.debug('switching from %s to %s', oldVersion, version);

    // update grunt config
    grunt.config.set('pkg.version', version);

    // write back to package.json
    var pkgJson = grunt.file.read(PKG_JSON_PATH);
    pkgJson = replace(pkgJson, JSON.stringify(oldVersion), JSON.stringify(version));
    grunt.file.write(PKG_JSON_PATH, pkgJson);
    grunt.log.ok('updated package.json', version);

    // write the readme
    var readme = grunt.file.read(README_PATH);
    grunt.file.write(README_PATH, replace(readme, oldVersion, version));
    grunt.log.ok('updated readme', version);
  });
};
