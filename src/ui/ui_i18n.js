import { resolve } from 'path';

import { defaults, compact } from 'lodash';
import langParser from 'accept-language-parser';

import { I18n } from './i18n';

function acceptLanguageHeaderToBCP47Tags(header) {
  return langParser.parse(header).map(lang => (
    compact([lang.code, lang.region, lang.script]).join('-')
  ));
}

export class UiI18n {
  constructor(defaultLocale = 'en') {
    this._i18n = new I18n(defaultLocale);
    this._i18n.registerTranslations(resolve(__dirname, './translations/en.json'));
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
    const requestedTranslations = await this._i18n.getTranslations(...tags);
    const defaultTranslations = await this._i18n.getTranslationsForDefaultLocale();
    return defaults({}, requestedTranslations, defaultTranslations);
  }

   /**
   *  uiExport consumers help the uiExports module know what to
   *  do with the uiExports defined by each plugin.
   *
   *  This consumer will allow plugins to define export with the
   *  "translations" type like so:
   *
   *    new kibana.Plugin({
   *      uiExports: {
   *        translations: [
   *          resolve(__dirname, './translations/es.json'),
   *        ],
   *      },
   *    });
   *
   */
  addUiExportConsumer(uiExports) {
    uiExports.addConsumerForType('translations', (plugin, translations) => {
      translations.forEach(path => {
        this._i18n.registerTranslations(path);
      });
    });
  }

  /**
     Refer to I18n.getAllTranslations()
   */
  getAllTranslations() {
    return this._i18n.getAllTranslations();
  }
}
