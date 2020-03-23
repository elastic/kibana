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

import { size } from 'lodash';
import kibana from '../package.json';
import xpack from '../x-pack/package.json';

function getMismatches(depType) {
  return Object.keys(kibana[depType])
    .map(key => {
      const xpackValue = xpack[depType][key];
      const kibanaValue = kibana[depType][key];
      if (xpackValue && kibanaValue && xpackValue !== kibanaValue && !key.includes('@kbn/')) {
        return {
          key,
          xpack: xpackValue,
          kibana: kibanaValue,
        };
      }
    })
    .filter(key => !!key);
}

export default function verifyDependencyVersions(grunt) {
  grunt.registerTask('verifyDependencyVersions', 'Checks dependency versions', () => {
    const devDependenciesMismatches = getMismatches('devDependencies');
    if (size(devDependenciesMismatches) > 0) {
      grunt.log.error(
        'The following devDependencies do not match:',
        JSON.stringify(devDependenciesMismatches, null, 4)
      );
      return false;
    } else {
      grunt.log.writeln('devDependencies match!');
    }
  });
}
