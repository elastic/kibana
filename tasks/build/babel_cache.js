export default function (grunt) {
  grunt.registerTask('_build:babelCache', function () {
    //When running from built packages, if a plugin is installed before babelcache
    //exists it can become owned by root.  This causes server startup to fail because
    //the optimization process can't write to .babelcache.json.
    grunt.file.write('build/kibana/optimize/.babelcache.json', '{}\n');
  });
}
