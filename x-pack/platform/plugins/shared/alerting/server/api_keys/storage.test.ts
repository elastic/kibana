/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { encodeApiKey } from '@kbn/response-ops-api-keys';
import { describeApiKeyStorage } from '@kbn/response-ops-api-keys-test-helpers';
import { ruleApiKeyStorage } from './storage';

describeApiKeyStorage('alerting', ruleApiKeyStorage);

describe('ruleApiKeyStorage', () => {
  it('stores a granted UIAM key as base64(id:secret)', () => {
    expect(
      ruleApiKeyStorage.write({
        createdByUser: false,
        uiam: { id: 'uiam-id', secret: 'essu_secret', external: false },
      })
    ).toEqual({
      apiKey: null,
      apiKeyCreatedByUser: false,
      uiamApiKey: encodeApiKey('uiam-id', 'essu_secret'),
      uiamApiKeyExternal: false,
    });
  });

  it('reads a rule without API keys as no keys', () => {
    expect(ruleApiKeyStorage.read({ apiKey: null, apiKeyCreatedByUser: null })).toBeUndefined();
  });
});
