module.exports = function (grunt) {
  let { defaults } = require('lodash');

  let pkg = grunt.config.get('pkg');
  let deepModules = grunt.config.get('deepModules');

  grunt.registerTask('_build:packageJson', function () {
    const { sha, number, version } = grunt.config.get('build');

    grunt.file.write(
      'build/kibana/package.json',
      JSON.stringify({
        name: pkg.name,
        description: pkg.description,
        keywords: pkg.keywords,
        version,
        build: {
          number,
          sha
        },
        repository: pkg.repository,
        engines: {
          node: pkg.engines.node
        },
        dependencies: defaults({}, pkg.dependencies, deepModules)
      }, null, '  ')
    );
  });
};
