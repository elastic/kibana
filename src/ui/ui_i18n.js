import { resolve } from 'path';

import { defaults, compact } from 'lodash';
import langParser from 'accept-language-parser';

import {
  getTranslations,
  registerTranslations,
} from './i18n';

function acceptLanguageHeaderToBCP47Tags(header) {
  return langParser.parse(header).map(lang => (
    compact([lang.code, lang.region, lang.script]).join('-')
  ));
}

export class UiI18n {
  constructor(defaultLocale = 'en') {
    this.defaultLocale = defaultLocale;
    registerTranslations(resolve(__dirname, './translations/en.json'));
  }

  /**
   *  Fetch the language translations as defined by the request.
   *
   *  @param {Hapi.Request} request
   *  @returns {Promise<Object>} translations promise for an object where
   *                                          keys are translation keys and
   *                                          values are translations
   */
  async getTranslationsForRequest(request) {
    const header = request.headers['accept-language'];
    const tags = acceptLanguageHeaderToBCP47Tags(header);
    const requestedTranslations = await getTranslations(...tags);
    const defaultTranslations = await getTranslations(this.defaultLocale);
    return defaults({}, requestedTranslations, defaultTranslations);
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
   *          resolve(__dirname, './translations/es.json'),
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
