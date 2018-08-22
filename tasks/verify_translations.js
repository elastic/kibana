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

// TODO: Integrate a new tool for translations checking
// https://github.com/elastic/kibana/pull/19826
import path from 'path';
import { extractDefaultTranslations } from '../src/dev/i18n/extract_default_translations';

export default function (grunt) {
  grunt.registerTask('verifyTranslations', async function () {
    const done = this.async();

    try {
      const pluginPath = path.resolve(__dirname, '../src/core_plugins/kibana');
      await extractDefaultTranslations(pluginPath);

      done();
    } catch (error) {
      done(error);
    }
  });
}
