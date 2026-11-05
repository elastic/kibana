/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { encodeApiKey } from '@kbn/response-ops-api-keys';
import { describeApiKeyStorage } from '@kbn/response-ops-api-keys-test-helpers';
import { actionPolicyApiKeyStorage } from './storage';

describeApiKeyStorage('alerting v2', actionPolicyApiKeyStorage, {
  unsupported: {
    'granted ES and UIAM keys': 'stores a single key',
    'reused raw UIAM key': 'rejects raw Cloud API keys',
    'reused raw external UIAM key': 'rejects raw Cloud API keys',
  },
});

describe('actionPolicyApiKeyStorage', () => {
  it('reads a base64(id:essu_) key as a UIAM key', () => {
    expect(
      actionPolicyApiKeyStorage.read({ apiKey: encodeApiKey('uiam-id', 'essu_secret') })
    ).toEqual({
      createdByUser: false,
      uiam: { id: 'uiam-id', secret: 'essu_secret', external: false },
    });
  });
});
