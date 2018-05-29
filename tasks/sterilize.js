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

import { bgRed, white } from 'chalk';
import { execSync } from 'child_process';
import { createInterface } from 'readline';

export default function (grunt) {

  grunt.registerTask('sterilize', function () {

    const cmd = 'git clean -fdx';
    const ignores = [
      '.aws-config.json',
      'config/kibana.dev.yml'
    ]
      .concat(String(grunt.option('ignore') || '').split(','))
      .map(f => `-e "${f.split('"').join('\\"')}"`)
      .reduce((all, arg) => `${all} ${arg}`, '');

    const stdio = 'inherit';
    execSync(`${cmd} -n ${ignores}`, { stdio });

    const rl = createInterface({
      input: process.stdin,
      output: process.stdout
    });
    const danger = bgRed(white('DANGER'));

    rl.on('close', this.async());
    rl.question(`\n${danger} Do you really want to delete all of the above files?, [N/y] `, function (resp) {
      const yes = resp.toLowerCase().trim()[0] === 'y';
      rl.close();

      if (yes) {
        execSync(`${cmd} ${ignores}`, { stdio });
      }
    });

  });

}
