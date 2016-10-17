import i18nVerify from '../../src/core_plugins/i18n/server/tool/i18n_verify_keys';
import fromRoot from '../../src/utils/from_root';

module.exports = function (grunt) {
  grunt.registerTask('_build:verifyTranslations', function () {
    const parsePaths = [fromRoot('/src/ui/views/*.jade')];
    const translationFiles = fromRoot('/src/core_plugins/kibana/i18n/en.json');
    const keyPattern = 'i18n\\(\'(.*)\'\\)';
    const keyPatternRegEx = new RegExp(keyPattern, 'g');

    i18nVerify.verifyTranslationKeys(parsePaths, translationFiles, keyPatternRegEx).then(function (keysNotTranslated) {
      if (keysNotTranslated && Object.keys(keysNotTranslated).length > 0) {
        console.error('Verification of the following translations keys are not translated: ', keysNotTranslated);
      } else {
        console.log('Verification of translations keys are a success.');
      }
    });
  });
};
