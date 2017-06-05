import fs from 'fs';
import path from 'path';

export default function checkPlugins(grunt) {
  grunt.registerTask('checkPlugins', 'Checks for plugins which may disrupt tests', function checkPlugins() {
    const done = this.async();
    const pluginsDir = path.resolve('./plugins/');

    fs.readdir(pluginsDir, (err, files) => {
      if (!files) {
        return done();
      }

      const plugins = files.filter(file => {
        return fs.statSync(path.join(pluginsDir, file)).isDirectory();
      });

      if (plugins.length) {
        grunt.log.error('===================================================================================================');
        plugins.forEach(plugin => {
          grunt.log.error(`The ${plugin} plugin may disrupt the test process. Consider removing it and re-running your tests.`);
        });
        grunt.log.error('===================================================================================================');
      }

      done();
    });
  });
}
