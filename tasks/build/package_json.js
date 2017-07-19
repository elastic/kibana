module.exports = function (grunt) {
  const pkg = grunt.config.get('pkg');

  grunt.registerTask('_build:packageJson', function () {
    const { sha, number, version } = grunt.config.get('build');

    grunt.file.write(
      'build/kibana/package.json',
      JSON.stringify({
        name: pkg.name,
        description: pkg.description,
        keywords: pkg.keywords,
        version,
        branch: pkg.branch,
        build: {
          number,
          sha
        },
        repository: pkg.repository,
        engines: {
          node: pkg.engines.node
        },
        dependencies: pkg.dependencies
      }, null, '  ')
    );
  });
};
