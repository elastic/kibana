/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse as parseCookie } from 'tough-cookie';
import {
  deriveInternalCallerAttestation,
  HTTPAuthorizationHeader,
  UIAM_INTERNAL_CALLER_ATTESTATION_HEADER,
} from '@kbn/core-security-server';
import {
  createSAMLResponse,
  MOCK_IDP_ATTRIBUTE_UIAM_ACCESS_TOKEN,
  MOCK_IDP_UIAM_SHARED_SECRET,
} from '@kbn/mock-idp-utils';
import type { ApiClientFixture } from '@kbn/scout';
import { apiTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

const HEADERS = {
  'kbn-xsrf': 'scout',
  'x-elastic-internal-origin': 'kibana',
  'elastic-api-version': '2023-10-31',
};

/**
 * Returns the value of a SAML attribute from a decoded SAML response.
 */
const getSamlAttribute = (samlResponse: string, name: string) => {
  const [, value] =
    samlResponse.match(
      new RegExp(
        `Name="${name}"[\\s\\S]*?<saml:AttributeValue[^>]*>([\\s\\S]*?)<\\/saml:AttributeValue>`
      )
    ) ?? [];
  if (!value) {
    throw new Error(`SAML attribute ${name} is missing`);
  }
  return value.trim();
};

/**
 * UIAM API keys cannot be matched to the user who created them yet
 * (https://github.com/elastic/kibana/issues/271760), so object-level security gives them general
 * access only: even the creator's own key cannot see the creator's restricted connectors.
 */
apiTest.describe(
  '[NON-MKI] Connectors with UIAM API keys',
  { tag: tags.serverless.security.complete },
  () => {
    let sessionHeaders: Record<string, string>;
    let keyHeaders: Record<string, string>;
    const connectorIds: string[] = [];

    apiTest.beforeAll(async ({ apiClient, config: { organizationId, projectType } }) => {
      const samlResponse = await createSAMLResponse({
        // The mock UIAM backend takes numeric user IDs.
        username: String(Date.now()),
        email: 'ols-uiam@elastic.co',
        // A project role that manages connectors without wildcard privileges, so it has no recovery.
        roles: ['soc_manager'],
        serverless: {
          uiamEnabled: true,
          organizationId: organizationId!,
          projectType: projectType!,
        },
      });
      const callback = await apiClient.post('api/security/saml/callback', {
        body: `SAMLResponse=${encodeURIComponent(samlResponse)}`,
      });
      expect(callback.headers['set-cookie'], JSON.stringify(callback.body)).toBeDefined();
      sessionHeaders = {
        ...HEADERS,
        cookie: parseCookie(callback.headers['set-cookie'][0])!.cookieString(),
      };

      // The user's own UIAM API key, sent the way Kibana's own callers send internal keys.
      const accessToken = getSamlAttribute(
        Buffer.from(samlResponse, 'base64').toString('utf-8'),
        MOCK_IDP_ATTRIBUTE_UIAM_ACCESS_TOKEN
      );
      const granted = await apiClient.post('test_endpoints/uiam/api_keys/_grant', {
        headers: HEADERS,
        responseType: 'json',
        body: { name: 'ols-uiam-key', authcScheme: 'Bearer', credential: accessToken },
      });
      expect(granted).toHaveStatusCode(200);
      const credential = new HTTPAuthorizationHeader('ApiKey', granted.body.api_key);
      keyHeaders = {
        ...HEADERS,
        authorization: credential.toString(),
        [UIAM_INTERNAL_CALLER_ATTESTATION_HEADER]: deriveInternalCallerAttestation(
          MOCK_IDP_UIAM_SHARED_SECRET,
          credential
        ),
      };
    });

    apiTest.afterAll(async ({ apiClient }) => {
      for (const id of connectorIds) {
        await apiClient.delete(`api/actions/connector/${id}`, { headers: sessionHeaders });
      }
    });

    const createConnector = async (apiClient: ApiClientFixture, generalAccess: string) => {
      const response = await apiClient.post('api/actions/connector', {
        headers: sessionHeaders,
        responseType: 'json',
        body: {
          name: `ols-uiam-${generalAccess}`,
          connector_type_id: '.webhook',
          config: { url: 'http://localhost:5620/api/status', method: 'post', hasAuth: false },
          secrets: {},
          access_control: { general_access: generalAccess },
        },
      });
      expect(response, JSON.stringify(response.body)).toHaveStatusCode(200);
      connectorIds.push(response.body.id);
      return response.body.id as string;
    };

    apiTest('gives a UIAM API key general access only', async ({ apiClient }) => {
      const publicId = await createConnector(apiClient, 'edit');
      const privateId = await createConnector(apiClient, 'none');

      // The session resolves to the user, who owns both connectors.
      for (const id of [publicId, privateId]) {
        expect(
          await apiClient.get(`api/actions/connector/${id}`, { headers: sessionHeaders })
        ).toHaveStatusCode(200);
      }

      const get = (id: string) =>
        apiClient.get(`api/actions/connector/${id}`, { headers: keyHeaders });
      // The connector's own result does not matter here, only that the key may run it.
      const execute = (id: string) =>
        apiClient.post(`api/actions/connector/${id}/_execute`, {
          headers: keyHeaders,
          body: { params: { body: '{}' } },
        });
      expect(await get(publicId)).toHaveStatusCode(200);
      expect(await execute(publicId)).toHaveStatusCode(200);

      // The same user's key cannot be matched to the owner, so the private connector is hidden.
      expect(await get(privateId)).toHaveStatusCode(404);
      expect(await execute(privateId)).toHaveStatusCode(404);
      const list = await apiClient.get('api/actions/connectors', {
        headers: keyHeaders,
        responseType: 'json',
      });
      expect(list).toHaveStatusCode(200);
      const ids = (list.body as Array<{ id: string }>).map(({ id }) => id);
      expect(ids).toContain(publicId);
      expect(ids).not.toContain(privateId);
    });
  }
);
