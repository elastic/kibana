module.exports = function (grunt) {
  grunt.registerTask('replace_package_json', function () {
    var path = grunt.config.process('<%= build %>/kibana/package.json');
    var pkg = grunt.config.get('pkg');

    grunt.file.write(path, JSON.stringify({
      name: pkg.name,
      description: pkg.description,
      keywords: pkg.keywords,
      version: pkg.version,
      buildNum: grunt.config.get('buildNum'),
      commitSha: grunt.config.get('commitSha'),
      bin: {
        kibana: './bin/kibana.sh',
        'kibana.bat': './bin/kibana.bat'
      },
      scripts: {
        start: 'node ./bin/kibana.js',
      },
      repository: pkg.repository,
      dependencies: pkg.dependencies
    }, null, '  '));
  });
};
