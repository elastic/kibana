import { fromRoot, formatListAsProse } from '../src/utils';
import { findPluginSpecs } from '../src/plugin_discovery';
import { collectUiExports } from '../src/ui';
import { I18n } from '../src/ui/ui_i18n/i18n';

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
  const translations = await I18n.getAllTranslationsFromPaths(uiExports.translationPaths);
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
