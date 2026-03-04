/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SamlAuth } from '@kbn/scout';
import { apiTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

import { COMMON_UNSAFE_HEADERS } from '../fixtures';

// These tests cannot be run on MKI because we cannot spin up Mock IdP plugin.
apiTest.describe(
  '[NON-MKI] UIAM API Keys convert function',
  { tag: [...tags.serverless.security.complete] },
  () => {
    const grantNativeEsApiKey = async (
      samlAuth: SamlAuth,
      apiClient: { post: (url: string, options?: any) => Promise<any> }
    ) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      const grantResponse = await apiClient.post('test_endpoints/api_keys/_grant', {
        headers: { ...COMMON_UNSAFE_HEADERS, ...cookieHeader },
        responseType: 'json',
        body: {},
      });
      expect(grantResponse).toHaveStatusCode(200);
      return grantResponse.body;
    };

    apiTest(
      'should successfully convert a valid Elasticsearch API key into a UIAM API key',
      async ({ apiClient, samlAuth }) => {
        const esApiKey = await grantNativeEsApiKey(samlAuth, apiClient);

        const convertResponse = await apiClient.post('test_endpoints/uiam/api_keys/_convert', {
          headers: { ...COMMON_UNSAFE_HEADERS },
          responseType: 'json',
          body: { keys: [esApiKey.encoded] },
        });

        expect(convertResponse).toHaveStatusCode(200);
        expect(convertResponse.body.results).toHaveLength(1);

        const result = convertResponse.body.results[0];
        expect(result.status).toBe('success');
        expect(result.id).toBeDefined();
        expect(typeof result.id).toBe('string');
        expect(result.key).toBeDefined();
        expect(typeof result.key).toBe('string');
      }
    );

    apiTest(
      'should successfully convert multiple Elasticsearch API keys in a single request',
      async ({ apiClient, samlAuth }) => {
        const esApiKey1 = await grantNativeEsApiKey(samlAuth, apiClient);
        const esApiKey2 = await grantNativeEsApiKey(samlAuth, apiClient);

        const convertResponse = await apiClient.post('test_endpoints/uiam/api_keys/_convert', {
          headers: { ...COMMON_UNSAFE_HEADERS },
          responseType: 'json',
          body: {
            keys: [esApiKey1.encoded, esApiKey2.encoded],
          },
        });

        expect(convertResponse).toHaveStatusCode(200);
        expect(convertResponse.body.results).toHaveLength(2);

        for (const result of convertResponse.body.results) {
          expect(result.status).toBe('success');
          expect(result.id).toBeDefined();
          expect(result.key).toBeDefined();
        }
      }
    );

    apiTest(
      'should return a failed result for an invalid Elasticsearch API key',
      async ({ apiClient }) => {
        const convertResponse = await apiClient.post('test_endpoints/uiam/api_keys/_convert', {
          headers: { ...COMMON_UNSAFE_HEADERS },
          responseType: 'json',
          body: { keys: ['dGhpcy1pcy1ub3QtYS12YWxpZC1rZXk='] },
        });

        expect(convertResponse).toHaveStatusCode(200);
        expect(convertResponse.body.results).toHaveLength(1);
        expect(convertResponse.body.results[0].status).toBe('failed');
      }
    );

    apiTest(
      'should handle a mix of valid and invalid keys in a single request',
      async ({ apiClient, samlAuth }) => {
        const esApiKey = await grantNativeEsApiKey(samlAuth, apiClient);

        const convertResponse = await apiClient.post('test_endpoints/uiam/api_keys/_convert', {
          headers: { ...COMMON_UNSAFE_HEADERS },
          responseType: 'json',
          body: {
            keys: [esApiKey.encoded, 'dGhpcy1pcy1ub3QtYS12YWxpZC1rZXk='],
          },
        });

        expect(convertResponse).toHaveStatusCode(200);
        expect(convertResponse.body.results).toHaveLength(2);

        const [validResult, invalidResult] = convertResponse.body.results;
        expect(validResult.status).toBe('success');
        expect(validResult.id).toBeDefined();
        expect(validResult.key).toBeDefined();
        expect(invalidResult.status).toBe('failed');
      }
    );
  }
);
