import fs from 'fs';
import fse from 'fs-extra';
import i18nPlugin from '../../src/plugins/i18n/server/i18n/index';
import Promise from 'bluebird';

module.exports = function (grunt) {
  grunt.registerTask('_build:copy_translations', function () {
    const rootDir = grunt.config.get('root');
    const buildTranslationsDir = rootDir + '/build/kibana/fixtures/translations';
    const translationStoreDir = rootDir + '/fixtures/translations';

    this.requires('_build:register_translations');

    grunt.file.mkdir(buildTranslationsDir);

    let done = this.async();
    let result = true;
    fse.copy(translationStoreDir, buildTranslationsDir, function (err) {
      if (err) {
        console.error(err);
        result = false;
      }
      done(result);
    });
  });
};

