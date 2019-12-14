/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import rimraf from 'rimraf';
import { join } from 'path';
import { execFileSync as exec } from 'child_process';

export default function(grunt) {
  grunt.registerTask('docker:docs', 'Build docs from docker', function() {
    const rootPath = grunt.config.get('root');
    const composePath = join(rootPath, 'tasks/docker_docs/docker-compose.yml');
    const htmlDocsDir = join(rootPath, 'html_docs');

    const env = Object.assign(process.env, {
      KIBANA_DOCS_CONTAINER_NAME: 'kibana_docs',
      KIBANA_DOCS_CONTEXT: rootPath,
    });
    const stdio = [0, 1, 2];
    const execOptions = { env, stdio };

    exec('docker-compose', ['-f', composePath, 'up'], execOptions);

    const containerId = String(
      exec('docker-compose', ['-f', composePath, 'ps', '-q', env.KIBANA_DOCS_CONTAINER_NAME], {
        env,
      })
    ).trim();

    grunt.log.write('Clearing old docs ... ');
    rimraf.sync(htmlDocsDir);
    grunt.log.writeln('done');

    grunt.log.write('Copying new docs ... ');
    exec('docker', ['cp', `${containerId}:/home/kibana/html_docs`, htmlDocsDir]);
    grunt.log.writeln('done');
  });
}
