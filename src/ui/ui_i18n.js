import { resolve } from 'path';

import { defaults, compact } from 'lodash';
import langParser from 'accept-language-parser';

import { I18n } from './i18n/i18n';

function acceptLanguageHeaderToBCP47Tags(header) {
  return langParser.parse(header).map(lang => (
    compact([lang.code, lang.region, lang.script]).join('-')
  ));
}

export class UiI18n {
  constructor(defaultLocale = 'en') {
    this.i18n = new I18n(defaultLocale);
    this.i18n.registerTranslations(resolve(__dirname, './translations/en.json'));
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
    const requestedTranslations = await this.i18n.getTranslations(...tags);
    const defaultTranslations = await this.i18n.getTranslationsForDefaultLocale();
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
        this.i18n.registerTranslations(path);
      });
    });
  }

  /**
     Refer to i18n.getAllTranslations()
   */
  getAllTranslations() {
    return this.i18n.getAllTranslations();
  }
}
