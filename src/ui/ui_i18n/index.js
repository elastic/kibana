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

/**
 @typedef Messages - messages tree, where leafs are translated strings
 @type {object<string, object>}
 @property {string} [locale] - locale of the messages
 */

import { i18nLoader } from '@kbn/i18n';

export function uiI18nMixin(kbnServer, server, config) {
  const defaultLocale = config.get('i18n.defaultLocale');
  const { translationPaths = [] } = kbnServer.uiExports;

  i18nLoader.registerTranslationFiles(translationPaths);

  /**
   *  Fetch the translations matching the Accept-Language header for a requests.
   *  @name request.getUiTranslations
   *  @returns {Promise<Messages>} translations - translation messages
   */
  server.decorate('request', 'getUiTranslations', async function () {
    const header = this.headers['accept-language'];

    const [defaultTranslations, requestedTranslations] = await Promise.all([
      i18nLoader.getTranslationsByLocale(defaultLocale),
      i18nLoader.getTranslationsByLanguageHeader(header),
    ]);

    return {
      ...defaultTranslations,
      ...requestedTranslations,
    };
  });

  /**
   *  Return all translations for registered locales
   *  @name server.getAllUiTranslations
   *  @return {Promise<Map<string, Messages>>} translations - A Promise object
   *  where keys are the locale and values are objects of translation messages
   */
  server.decorate('server', 'getAllUiTranslations', async () => {
    return await i18nLoader.getAllTranslations();
  });
}
