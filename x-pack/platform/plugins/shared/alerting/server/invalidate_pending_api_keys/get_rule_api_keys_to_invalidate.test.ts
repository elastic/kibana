/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getRuleApiKeysToInvalidate } from './get_rule_api_keys_to_invalidate';

const encode = (value: string) => Buffer.from(value).toString('base64');
const ES_KEY = encode('es-id:es-secret');
const UIAM_KEY = encode('uiam-id:essu_secret');

describe('getRuleApiKeysToInvalidate', () => {
  test.each([
    ['framework ES + UIAM', { apiKey: ES_KEY, uiamApiKey: UIAM_KEY }, [ES_KEY, UIAM_KEY]],
    ['framework ES only', { apiKey: ES_KEY, uiamApiKey: null }, [ES_KEY]],
    ['framework UIAM only', { apiKey: null, uiamApiKey: UIAM_KEY }, [UIAM_KEY]],
    [
      'apiKeyCreatedByUser=null',
      { apiKey: ES_KEY, uiamApiKey: UIAM_KEY, apiKeyCreatedByUser: null },
      [ES_KEY, UIAM_KEY],
    ],
    [
      'user-created ES + UIAM',
      { apiKey: ES_KEY, uiamApiKey: UIAM_KEY, apiKeyCreatedByUser: true },
      [],
    ],
    [
      'user-created raw essu_',
      { apiKey: null, uiamApiKey: 'essu_raw', apiKeyCreatedByUser: true },
      [],
    ],
    ['no keys', { apiKey: null, uiamApiKey: null }, []],
  ])('%s', (_title, ruleApiKeys, expected) => {
    expect(getRuleApiKeysToInvalidate(ruleApiKeys)).toEqual(expected);
  });
});
