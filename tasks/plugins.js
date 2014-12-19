module.exports = function (grunt) {
  grunt.registerTask('make_plugin_dir', function () {
    var dir = grunt.config.process('<%= build %>/dist/kibana/plugins');
    grunt.file.mkdir(dir);
  });

  grunt.registerTask('describe_bundled_plugins', function () {
    var configKey = 'bundled_plugin_ids';
    var file = grunt.config.process('<%= build %>/dist/kibana/config/kibana.yml');
    var idList = grunt.config.get('bundled_plugin_module_ids').map(function (id) {
      return ' - ' + id;
    }).join('\n');

    var contents = grunt.file.read(file);
    if (contents.indexOf(configKey) !== -1) {
      grunt.log.error('bundled plugin ids already written to config/kibana.yml');
      return;
    }

    contents +=
      '\n# Plugins that are included in the build, and no longer found in the plugins/ folder' +
      '\n' + configKey + ':' +
      '\n' + idList;

    grunt.file.write(file, contents);
  });
};