import { resolve } from 'path';

import _ from 'lodash';
import langParser from 'accept-language-parser';

import {
  setDefaultLocale,
  getTranslations,
  getTranslationsForDefaultLocale,
  getRegisteredTranslationLocales,
  registerTranslations,
} from './i18n';

export class UiI18n {
  constructor(defaultLocale = 'en') {
    setDefaultLocale(defaultLocale);
    registerTranslations(resolve(__dirname, './locales/en.json'));

    this.getTranslations = getTranslations;
    this.getTranslationsForDefaultLocale = getTranslationsForDefaultLocale;
    this.getRegisteredTranslationLocales = getRegisteredTranslationLocales;
    // we don't export registerTranslations() here to encourage use
    // of uiExports for defining all translation files
  }


  /**
   *  uiExport consumers help the uiExports module know what to
   *  do with the uiExports defined by each plugin.
   *
   *  This consumer will allow plugins to define export with the
   *  "language" type like so:
   *
   *    new kibana.Plugin({
   *      uiExports: {
   *        languages: [
   *          resolve(__dirname, './locales/es.json'),
   *        ],
   *      },
   *    });
   *
   */
  addUiExportConsumer(uiExports) {
    uiExports.addConsumerForType('translations', (plugin, translations) => {
      translations.forEach(path => {
        registerTranslations(path);
      });
    });
  }
}
