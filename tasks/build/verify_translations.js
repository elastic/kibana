import Promise from 'bluebird';
import _ from 'lodash';

import fromRoot from '../../src/utils/from_root';
import KbnServer from '../../src/server/kbn_server';
import * as i18nVerify from '../utils/i18n_verify_keys';
import * as i18n from '../../src/core_plugins/i18n/server/i18n';

module.exports = function (grunt) {
  grunt.registerTask('_build:verifyTranslations', async function () {
    const parsePaths = [fromRoot('/src/ui/views/*.jade')];
    const keyPattern = 'i18n\\(\'(.*)\'\\)';
    const keyPatternRegEx = new RegExp(keyPattern, 'g');

    const serverConfig = {
      env: 'production',
      logging: {
        silent: true,
        quiet: true,
        verbose: false
      },
      optimize: {
        useBundleCache: false,
        enabled: false
      },
      server: {
        autoListen: false
      },
      plugins: {
        initialize: true,
        scanDirs: [fromRoot('src/core_plugins')]
      },
      uiSettings: {
        enabled: false
      }
    };
    const kbnServer = new KbnServer(serverConfig);
    await kbnServer.ready();

    const done = this.async();
    const locales = i18n.getRegisteredTranslationLocales();
    Promise.all(locales.map(function (locale) {
      return i18n.getTranslationsForLocale(locale).then(function (translations) {
        i18nVerify.verifyTranslationKeys(parsePaths, translations, keyPatternRegEx).then(function (keysNotTranslated) {
          if (!_.isEmpty(keysNotTranslated)) {
            console.error('Verification of the following translations keys are not translated: ', keysNotTranslated);
          } else {
            console.log('Verification of translations keys are a success.');
          }
        });
      });
    })).then(async function() {
      await kbnServer.close();
    }).catch(async function(e) {
      await kbnServer.close();
      throw e;
    });
  });
};
