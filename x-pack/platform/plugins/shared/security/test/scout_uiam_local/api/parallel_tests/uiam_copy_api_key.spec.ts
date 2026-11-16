/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'node:fs';
import { Agent, fetch } from 'undici';

import { getKbnServerlessUiamCert } from '@kbn/dev-utils';
import {
  createSAMLResponse,
  MOCK_IDP_ATTRIBUTE_UIAM_ACCESS_TOKEN,
  MOCK_IDP_UIAM_SERVICE_URL,
  MOCK_IDP_UIAM_SHARED_SECRET,
} from '@kbn/mock-idp-utils';
import { apiTest, tags } from '@kbn/scout';
import type { ApiClientFixture } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

import { ES_CLIENT_AUTHENTICATION_HEADER } from '../../../../common/constants';
import { COMMON_UNSAFE_HEADERS, extractAttributeValue, UIAM_PROJECT_TYPES } from '../fixtures';

const UIAM_AUTHENTICATE_URL = `${MOCK_IDP_UIAM_SERVICE_URL}/uiam/api/v1/authentication/_authenticate`;

const USERNAME = '1234567890';
const USER_CREATOR = { type: 'user', user_id: Number(USERNAME) };

interface UiamCreator {
  type: string;
  user_id?: number;
  api_key_id?: string;
}

// These tests cannot be run on MKI because we cannot obtain the raw UIAM tokens and spin up Mock IdP
// plugin, and because they ask UIAM directly who a key belongs to, with the local dev certificate.
apiTest.describe('[NON-MKI] UIAM API Keys copy', { tag: tags.serverless.all }, () => {
  let kibanaAgent: Agent;
  let loginForAccessToken: () => Promise<string>;

  apiTest.beforeAll(async ({ config: { organizationId, projectType } }) => {
    const { certPath, keyPath } = getKbnServerlessUiamCert(UIAM_PROJECT_TYPES[projectType ?? '']);
    kibanaAgent = new Agent({
      connect: {
        cert: readFileSync(certPath),
        key: readFileSync(keyPath),
        rejectUnauthorized: false,
      },
    });

    loginForAccessToken = async () => {
      const samlResponse = await createSAMLResponse({
        username: USERNAME,
        email: 'elastic_admin@elastic.co',
        roles: ['admin'],
        serverless: {
          uiamEnabled: true,
          organizationId: organizationId!,
          projectType: projectType!,
        },
      });
      return extractAttributeValue(
        Buffer.from(samlResponse, 'base64').toString('utf-8'),
        MOCK_IDP_ATTRIBUTE_UIAM_ACCESS_TOKEN
      );
    };
  });

  apiTest.afterAll(async () => {
    await kibanaAgent.close();
  });

  /** Asks UIAM, as Kibana, who an API key is, and so who created it. */
  const authenticateAtUiam = async (apiKey: string) => {
    const response = await fetch(UIAM_AUTHENTICATE_URL, {
      method: 'POST',
      headers: {
        'User-Agent': 'Kibana-Scout/1.0 (IntegrationTest; Security)',
        Authorization: `ApiKey ${apiKey}`,
        [ES_CLIENT_AUTHENTICATION_HEADER]: MOCK_IDP_UIAM_SHARED_SECRET,
      },
      dispatcher: kibanaAgent,
    });
    const body = (await response.json()) as { credentials?: { creator?: UiamCreator } };
    return { status: response.status, creator: body.credentials?.creator };
  };

  const callTestEndpoint = async (
    apiClient: ApiClientFixture,
    path: 'grant' | 'copy',
    body: { name: string; authcScheme: string; credential: string }
  ) =>
    apiClient.post(`test_endpoints/uiam/api_keys/_${path}`, {
      headers: { ...COMMON_UNSAFE_HEADERS },
      responseType: 'json',
      body,
    });

  /** An internal API key made from a user's session, so it is created by that user. */
  const createSourceKey = async (apiClient: ApiClientFixture) => {
    const accessToken = await loginForAccessToken();
    const response = await callTestEndpoint(apiClient, 'grant', {
      name: 'copy-test-source-key',
      authcScheme: 'Bearer',
      credential: accessToken,
    });
    expect(response).toHaveStatusCode(200);
    return { id: response.body.id as string, apiKey: response.body.api_key as string };
  };

  apiTest(
    'should copy an internal API key into a key created by the same user',
    async ({ apiClient }) => {
      const source = await createSourceKey(apiClient);
      const { creator: sourceCreator } = await authenticateAtUiam(source.apiKey);
      expect(sourceCreator).toStrictEqual(USER_CREATOR);

      const response = await callTestEndpoint(apiClient, 'copy', {
        name: 'copy-test-copy',
        authcScheme: 'ApiKey',
        credential: source.apiKey,
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.name).toBe('copy-test-copy');
      expect(response.body.id).not.toBe(source.id);
      expect(response.body.api_key).not.toBe(source.apiKey);

      const copy = await authenticateAtUiam(response.body.api_key);
      expect(copy.status).toBe(200);
      expect(copy.creator).toStrictEqual(sourceCreator);
    }
  );

  apiTest(
    'should leave a granted key created by the key it was granted from, unlike a copy',
    async ({ apiClient }) => {
      const source = await createSourceKey(apiClient);

      const response = await callTestEndpoint(apiClient, 'grant', {
        name: 'copy-test-grant-from-key',
        authcScheme: 'ApiKey',
        credential: source.apiKey,
      });

      expect(response).toHaveStatusCode(200);
      const granted = await authenticateAtUiam(response.body.api_key);
      expect(granted.creator?.type).toBe('api-key');
      expect(granted.creator?.api_key_id).toBe(source.id);
    }
  );

  apiTest(
    'should grant a key created by the user when the credential is not an API key',
    async ({ apiClient }) => {
      const accessToken = await loginForAccessToken();

      const response = await callTestEndpoint(apiClient, 'copy', {
        name: 'copy-test-from-token',
        authcScheme: 'Bearer',
        credential: accessToken,
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.name).toBe('copy-test-from-token');
      const copy = await authenticateAtUiam(response.body.api_key);
      expect(copy.creator).toStrictEqual(USER_CREATOR);
    }
  );

  apiTest('should keep a copy valid after its source key is invalidated', async ({ apiClient }) => {
    const source = await createSourceKey(apiClient);
    const response = await callTestEndpoint(apiClient, 'copy', {
      name: 'copy-test-outlives-source',
      authcScheme: 'ApiKey',
      credential: source.apiKey,
    });
    expect(response).toHaveStatusCode(200);

    const invalidated = await apiClient.post('test_endpoints/uiam/api_keys/_invalidate', {
      headers: { ...COMMON_UNSAFE_HEADERS },
      responseType: 'json',
      body: { id: source.id, authcScheme: 'ApiKey', credential: source.apiKey },
    });
    expect(invalidated).toHaveStatusCode(200);
    expect(invalidated.body.error_count).toBe(0);

    expect((await authenticateAtUiam(source.apiKey)).status).not.toBe(200);
    expect((await authenticateAtUiam(response.body.api_key)).status).toBe(200);
  });

  apiTest(
    'should fail, not fall back to a grant, when the source key is invalidated',
    async ({ apiClient }) => {
      const source = await createSourceKey(apiClient);
      const invalidated = await apiClient.post('test_endpoints/uiam/api_keys/_invalidate', {
        headers: { ...COMMON_UNSAFE_HEADERS },
        responseType: 'json',
        body: { id: source.id, authcScheme: 'ApiKey', credential: source.apiKey },
      });
      expect(invalidated).toHaveStatusCode(200);

      const response = await callTestEndpoint(apiClient, 'copy', {
        name: 'copy-test-from-revoked',
        authcScheme: 'ApiKey',
        credential: source.apiKey,
      });

      expect(response).toHaveStatusCode(500);
      // UIAM's refusal of an invalid source key, not the outcome of a grant.
      expect(response.body.message).toContain('0x824009');
    }
  );

  apiTest('should reject copying a non-UIAM credential', async ({ apiClient }) => {
    const response = await callTestEndpoint(apiClient, 'copy', {
      name: 'copy-test-invalid',
      authcScheme: 'Bearer',
      credential: 'some-invalid-token',
    });

    expect(response).toHaveStatusCode(500);
    expect(response.body.message).toContain('not compatible with UIAM');
  });
});
