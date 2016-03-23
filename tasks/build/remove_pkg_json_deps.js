module.exports = function (grunt) {
  grunt.registerTask('_build:removePkgJsonDeps', function () {
    const pkg = grunt.file.readJSON('build/kibana/package.json');

    delete pkg.dependencies;

    grunt.file.write(
      'build/kibana/package.json',
      JSON.stringify(pkg, null, '  ')
    );
  });
};
