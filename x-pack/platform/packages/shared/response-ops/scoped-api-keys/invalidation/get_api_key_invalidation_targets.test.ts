/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getApiKeyInvalidationTargets } from './get_api_key_invalidation_targets';

describe('getApiKeyInvalidationTargets', () => {
  test('returns nothing for user-created keys', () => {
    expect(
      getApiKeyInvalidationTargets({
        createdByUser: true,
        esApiKeyId: 'es-id',
        uiamApiKeyId: 'uiam-id',
        uiamApiKey: 'essu_key',
      })
    ).toEqual([]);
  });

  test('returns the ES and UIAM targets', () => {
    expect(
      getApiKeyInvalidationTargets({
        createdByUser: false,
        esApiKeyId: 'es-id',
        uiamApiKeyId: 'uiam-id',
        uiamApiKey: 'essu_key',
      })
    ).toEqual([{ apiKeyId: 'es-id' }, { apiKeyId: 'uiam-id', uiamApiKey: 'essu_key' }]);
  });

  test('returns an ES target for an empty ES key id', () => {
    expect(getApiKeyInvalidationTargets({ createdByUser: false, esApiKeyId: '' })).toEqual([
      { apiKeyId: '' },
    ]);
  });

  test('skips the ES target without an ES key id', () => {
    expect(
      getApiKeyInvalidationTargets({
        createdByUser: false,
        uiamApiKeyId: 'uiam-id',
        uiamApiKey: 'essu_key',
      })
    ).toEqual([{ apiKeyId: 'uiam-id', uiamApiKey: 'essu_key' }]);
  });

  test.each([
    ['no UIAM key id', { uiamApiKey: 'essu_key' }],
    ['no UIAM key', { uiamApiKeyId: 'uiam-id' }],
  ])('skips the UIAM target with %s', (_, uiam) => {
    expect(
      getApiKeyInvalidationTargets({ createdByUser: false, esApiKeyId: 'es-id', ...uiam })
    ).toEqual([{ apiKeyId: 'es-id' }]);
  });
});
