import fs from 'fs';
import i18nPlugin from '../../src/plugins/i18n/server/i18n/index';
import Promise from 'bluebird';

const readdir = Promise.promisify(fs.readdir);

module.exports = function (grunt) {
  grunt.registerTask('_build:register_translations', function () {
    const rootDir = grunt.config.get('root');

    //Add translation dirs for the core plugins here
    const corePluginTranslationDirs = [rootDir + '/src/ui/i18n'];

    Promise.map(corePluginTranslationDirs, (dir) => {
      readdir(dir).then((dirListing) => {
        Promise.map(dirListing, (listing) => {
          const fullFilePath = dir + '/' + listing;
          i18nPlugin.registerTranslations(fullFilePath);
        });
      });
    }).nodeify(this.async());
  });

};

