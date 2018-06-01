/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { defaults, compact } from 'lodash';
import langParser from 'accept-language-parser';

import { I18n } from './i18n';

function acceptLanguageHeaderToBCP47Tags(header) {
  return langParser.parse(header).map(lang => (
    compact([lang.code, lang.region, lang.script]).join('-')
  ));
}

export function uiI18nMixin(kbnServer, server, config) {
  const defaultLocale = config.get('i18n.defaultLocale');

  const i18n = new I18n(defaultLocale);
  const { translationPaths = [] } = kbnServer.uiExports;
  translationPaths.forEach(translationPath => {
    i18n.registerTranslations(translationPath);
  });

  /**
   *  Fetch the translations matching the Accept-Language header for a requests.
   *  @name request.getUiTranslations
   *  @returns {Promise<Object<id:string,value:string>>} translations
   */
  server.decorate('request', 'getUiTranslations', async function () {
    const header = this.headers['accept-language'];
    const tags = acceptLanguageHeaderToBCP47Tags(header);

    const requestedTranslations = await i18n.getTranslations(...tags);
    const defaultTranslations = await i18n.getTranslationsForDefaultLocale();

    return defaults(
      {},
      requestedTranslations,
      defaultTranslations
    );
  });

  /**
   *  Return all translations for registered locales
   *  @name server.getAllUiTranslations
   *  @return {Promise<Object<locale:string,Object<id:string,value:string>>>}
   */
  server.decorate('server', 'getAllUiTranslations', async () => {
    return await i18n.getAllTranslations();
  });

}
