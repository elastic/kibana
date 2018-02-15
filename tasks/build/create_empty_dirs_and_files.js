module.exports = function (grunt) {
  grunt.registerTask('_build:createEmptyDirsAndFiles', function () {
    // force the plugins directory to exist
    grunt.file.mkdir('build/kibana/plugins');

    // force the data directory to exist
    grunt.file.mkdir('build/kibana/data');

    // When running from built packages, if a plugin is installed before babelcache
    // exists it can become owned by root.  This causes server startup to fail because
    // the optimization process can't write to .babelcache.json.
    grunt.file.write('build/kibana/optimize/.babelcache.json', '{}\n');
  });
};
