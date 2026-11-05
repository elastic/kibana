/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  defineApiKeyStorage,
  encodeUiamApiKey,
  toEsApiKey,
  toUiamApiKey,
} from '@kbn/response-ops-api-keys';
import { describeApiKeyStorage } from './describe_api_key_storage';

interface SampleAttributes {
  apiKey?: string;
  uiamApiKey?: string;
  apiKeyCreatedByUser: boolean;
  uiamApiKeyExternal?: boolean;
}

const sampleStorage = defineApiKeyStorage<SampleAttributes>({
  write: ({ createdByUser, es, uiam }) => ({
    apiKeyCreatedByUser: createdByUser,
    ...(es ? { apiKey: es.encoded } : {}),
    ...(uiam ? { uiamApiKey: encodeUiamApiKey(uiam), uiamApiKeyExternal: uiam.external } : {}),
  }),
  read: ({ apiKey, uiamApiKey, apiKeyCreatedByUser, uiamApiKeyExternal }) => {
    if (!apiKey && !uiamApiKey) {
      return undefined;
    }
    return {
      createdByUser: apiKeyCreatedByUser,
      ...(apiKey ? { es: toEsApiKey(apiKey) } : {}),
      ...(uiamApiKey ? { uiam: toUiamApiKey(uiamApiKey, { external: uiamApiKeyExternal }) } : {}),
    };
  },
});

describeApiKeyStorage('sample', sampleStorage);

describeApiKeyStorage('sample without UIAM', sampleStorage, {
  unsupported: {
    'granted ES and UIAM keys': 'stores a single key',
    'granted UIAM key': 'stores a single key',
    'reused UIAM key with an id': 'stores a single key',
    'reused raw UIAM key': 'stores a single key',
    'reused raw external UIAM key': 'stores a single key',
  },
});
