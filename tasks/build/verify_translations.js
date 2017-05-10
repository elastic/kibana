import Promise from 'bluebird';
import _ from 'lodash';

import { fromRoot } from '../../src/utils';
import KbnServer from '../../src/server/kbn_server';
import * as i18nVerify from '../utils/i18n_verify_keys';

export default function (grunt) {

  grunt.registerTask('_build:verifyTranslations', [
    'i18nextract',
    '_build:check'
  ]);

  grunt.registerTask('_build:check', function () {
    const done = this.async();

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
    kbnServer.ready()
    .then(() => verifyTranslations(kbnServer.uiI18n))
    .then(() => kbnServer.close())
    .then(done)
    .catch((err) => {
      kbnServer.close()
      .then(() => done(err));
    });
  });

}

function verifyTranslations(uiI18nObj)
{
  const angularTranslations = require(fromRoot('build/i18n_extract/en.json'));
  const translationKeys = Object.keys(angularTranslations);
  const translationPatterns = [
    { regEx: 'i18n\\(\'(.*)\'\\)',
      parsePaths: [fromRoot('/src/ui/views/*.jade')] }
  ];

  const keyPromises = _.map(translationPatterns, (pattern) => {
    return i18nVerify.getTranslationKeys(pattern.regEx, pattern.parsePaths)
    .then(function (keys) {
      const arrayLength = keys.length;
      for (let i = 0; i < arrayLength; i++) {
        translationKeys.push(keys[i]);
      }
    });
  });

  return Promise.all(keyPromises)
  .then(function () {
    return uiI18nObj.getAllTranslations()
    .then(function (translations) {
      const keysNotTranslatedPerLocale = i18nVerify.getNonTranslatedKeys(translationKeys, translations);
      if (!_.isEmpty(keysNotTranslatedPerLocale)) {
        const str  = JSON.stringify(keysNotTranslatedPerLocale);
        const errMsg = 'The following translation keys per locale are not translated: ' + str;
        throw new Error(errMsg);
      }
    });
  });
}
