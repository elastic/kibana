/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RoleApiCredentials } from '@kbn/scout';
import { apiTest } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import {
  BUILT_IN_PATTERN_TEST_DATA,
  COMMON_HEADERS,
  CUSTOM_PATTERN_TEST_DATA,
  GROK_DEBUGGER_API_TAGS,
} from '../fixtures/constants';

apiTest.describe(
  'POST api/grokdebugger/simulate',
  {
    tag: GROK_DEBUGGER_API_TAGS,
  },
  () => {
    let adminApiCredentials: RoleApiCredentials;

    apiTest.beforeAll(async ({ requestAuth }) => {
      adminApiCredentials = await requestAuth.getApiKey('admin');
    });

    apiTest('simulates a valid pattern', async ({ apiClient }) => {
      const response = await apiClient.post('api/grokdebugger/simulate', {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
        body: JSON.stringify({
          rawEvent: BUILT_IN_PATTERN_TEST_DATA.rawEvent,
          pattern: BUILT_IN_PATTERN_TEST_DATA.pattern,
        }),
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.structuredEvent).toStrictEqual(
        BUILT_IN_PATTERN_TEST_DATA.structuredEvent
      );
      expect(response.body.error).toStrictEqual({});
    });

    apiTest('returns an error response for an invalid pattern', async ({ apiClient }) => {
      const response = await apiClient.post('api/grokdebugger/simulate', {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
        body: JSON.stringify({
          rawEvent: BUILT_IN_PATTERN_TEST_DATA.rawEvent,
          pattern: 'test',
        }),
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.error).toBe('Provided Grok patterns do not match data in the input');
      expect(response.body.structuredEvent).toStrictEqual({});
    });

    apiTest('simulates with a valid custom pattern', async ({ apiClient }) => {
      const response = await apiClient.post('api/grokdebugger/simulate', {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
        body: JSON.stringify({
          rawEvent: CUSTOM_PATTERN_TEST_DATA.rawEvent,
          pattern: CUSTOM_PATTERN_TEST_DATA.pattern,
          customPatterns: CUSTOM_PATTERN_TEST_DATA.customPatterns,
        }),
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.structuredEvent).toStrictEqual(CUSTOM_PATTERN_TEST_DATA.structuredEvent);
      expect(response.body.error).toStrictEqual({});
    });
  }
);
