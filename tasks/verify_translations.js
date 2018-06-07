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
import { I18nLoader } from '@kbn/i18n/src/server';

import { fromRoot, formatListAsProse } from '../src/utils';
import { findPluginSpecs } from '../src/plugin_discovery';
import { collectUiExports } from '../src/ui';

import * as i18nVerify from './utils/i18n_verify_keys';

export default function (grunt) {
  grunt.registerTask('verifyTranslations', async function () {
    const done = this.async();

    try {
      const { spec$ } = findPluginSpecs({
        env: 'production',
        plugins: {
          scanDirs: [fromRoot('src/core_plugins')]
        }
      });

      const specs = await spec$.toArray().toPromise();
      const uiExports = collectUiExports(specs);
      await verifyTranslations(uiExports);

      done();
    } catch (error) {
      done(error);
    }
  });

}

async function verifyTranslations(uiExports) {
  const keysUsedInViews = [];

  // Search files for used translation keys
  const translationPatterns = [
    { regexp: 'i18n\\(\'(.*)\'\\)',
      parsePaths: [fromRoot('src/ui/ui_render/views/*.jade')] }
  ];
  for (const { regexp, parsePaths } of translationPatterns) {
    const keys = await i18nVerify.getTranslationKeys(regexp, parsePaths);
    for (const key of keys) {
      keysUsedInViews.push(key);
    }
  }

  // get all of the translations from uiExports
  const translations = await I18nLoader.getAllTranslationsFromPaths(uiExports.translationPaths);
  const keysWithoutTranslations = Object.entries(
    i18nVerify.getNonTranslatedKeys(keysUsedInViews, translations)
  );

  if (!keysWithoutTranslations.length) {
    return;
  }

  throw new Error(
    '\n' +
    '\n' +
    'The following keys are used in angular/jade views but are not translated:\n' +
    keysWithoutTranslations.map(([locale, keys]) => (
      `   - ${locale}: ${formatListAsProse(keys)}`
    )).join('\n') +
    '\n' +
    '\n'
  );
}
