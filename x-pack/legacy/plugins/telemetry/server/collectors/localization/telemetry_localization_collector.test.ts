/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

interface TranslationsMock {
  [title: string]: string;
}

const createI18nLoaderMock = (translations: TranslationsMock) => {
  return {
    getTranslationsByLocale() {
      return {
        messages: translations,
      };
    },
  };
};

import { getTranslationCount } from './telemetry_localization_collector';

describe('getTranslationCount', () => {
  it('returns 0 if no translations registered', async () => {
    const i18nLoaderMock = createI18nLoaderMock({});
    const count = await getTranslationCount(i18nLoaderMock, 'en');
    expect(count).toEqual(0);
  });

  it('returns number of translations', async () => {
    const i18nLoaderMock = createI18nLoaderMock({
      a: '1',
      b: '2',
      'b.a': '3',
    });
    const count = await getTranslationCount(i18nLoaderMock, 'en');
    expect(count).toEqual(3);
  });
});
