import Promise from 'bluebird';
import _ from 'lodash';

import fromRoot from '../../src/utils/from_root';
import KbnServer from '../../src/server/kbn_server';
import * as i18nVerify from '../utils/i18n_verify_keys';

export default function (grunt) {
  grunt.registerTask('_build:verifyTranslations', function () {
    const done = this.async();
    const parsePaths = [fromRoot('/src/ui/views/*.jade')];

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
    .then(() => verifyTranslations(kbnServer.uiI18n, parsePaths))
    .then(() => kbnServer.close())
    .then(done)
    .catch((err) => {
      kbnServer.close()
      .then(() => done(err));
    });
  });
}

function verifyTranslations(uiI18nObj, parsePaths)
{
  return uiI18nObj.getAllTranslations()
  .then(function (translations) {
    return i18nVerify.getTranslationKeys(parsePaths)
    .then(function (translationKeys) {
      const keysNotTranslatedPerLocale = i18nVerify.getNonTranslatedKeys(translationKeys, translations);
      if (!_.isEmpty(keysNotTranslatedPerLocale)) {
        const str  = JSON.stringify(keysNotTranslatedPerLocale);
        const errMsg = 'The following translation keys per locale are not translated: ' + str;
        throw new Error(errMsg);
      }
    });
  });
}
