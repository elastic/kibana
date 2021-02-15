/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import fs from 'fs';
import path from 'path';

export default function checkPlugins(grunt) {
  grunt.registerTask(
    'checkPlugins',
    'Checks for plugins which may disrupt tests',
    function checkPlugins() {
      const done = this.async();
      const pluginsDir = path.resolve('./plugins/');

      fs.readdir(pluginsDir, (err, files) => {
        if (!files) {
          return done();
        }

        const plugins = files.filter((file) => {
          return fs.statSync(path.join(pluginsDir, file)).isDirectory();
        });

        if (plugins.length) {
          grunt.log.error(
            '==================================================================================================='
          );
          plugins.forEach((plugin) => {
            grunt.log.error(
              `The ${plugin} plugin may disrupt the test process. Consider removing it and re-running your tests.`
            );
          });
          grunt.log.error(
            '==================================================================================================='
          );
        }

        done();
      });
    }
  );
}
