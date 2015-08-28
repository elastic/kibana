module.exports = function (grunt) {
  let { defaults } = require('lodash');

  let pkg = grunt.config.get('pkg');

  grunt.registerTask('_build:packageJson', function () {

    grunt.file.write(
      'build/kibana/package.json',
      JSON.stringify({
        name: pkg.name,
        description: pkg.description,
        keywords: pkg.keywords,
        version: pkg.version,
        build: {
          number: grunt.config.get('buildNum'),
          sha: grunt.config.get('buildSha')
        },
        repository: pkg.repository,
        dependencies: pkg.dependencies
      }, null, '  ')
    );
  });
};
