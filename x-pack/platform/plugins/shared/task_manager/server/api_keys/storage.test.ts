/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { encodeApiKey } from '@kbn/response-ops-api-keys';
import { describeApiKeyStorage } from '@kbn/response-ops-api-keys-test-helpers';
import { taskApiKeyStorage } from './storage';

describeApiKeyStorage('Task Manager', taskApiKeyStorage);

describe('taskApiKeyStorage', () => {
  it('reads a UIAM key stored by the UIAM provisioning path', () => {
    expect(
      taskApiKeyStorage.read({
        uiamApiKey: encodeApiKey('uiam-id', 'essu_secret'),
        userScope: { apiKeyId: 'uiam-id', apiKeyCreatedByUser: false },
      })
    ).toEqual({
      createdByUser: false,
      uiam: { id: 'uiam-id', secret: 'essu_secret', external: false },
    });
  });

  it('reads keys stored without a user scope', () => {
    const apiKey = encodeApiKey('es-id', 'secret');

    expect(taskApiKeyStorage.read({ apiKey })).toEqual({
      createdByUser: false,
      es: { id: 'es-id', encoded: apiKey },
    });
  });
});
