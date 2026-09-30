/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { X509Certificate } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { Agent, fetch } from 'undici';

import { KBN_CERT_PATH, KBN_KEY_PATH } from '@kbn/dev-utils';
import {
  MOCK_IDP_UIAM_ORGANIZATION_ID,
  MOCK_IDP_UIAM_PROJECT_ID,
  MOCK_IDP_UIAM_SERVICE_URL,
  MOCK_IDP_UIAM_SHARED_SECRET,
} from '@kbn/mock-idp-utils';
import { apiTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

import { ES_CLIENT_AUTHENTICATION_HEADER } from '../../../../common/constants';
import { COMMON_UNSAFE_HEADERS } from '../fixtures';

const UIAM_AUTHENTICATE_URL = `${MOCK_IDP_UIAM_SERVICE_URL}/uiam/api/v1/authentication/_authenticate`;

/**
 * The certificate identity UIAM derives Kibana's project service account from: the `EIDENT.…` DNS
 * SAN of the client certificate Kibana presents to UIAM. A cross-region destination (the Nightshift
 * Relay) receives this SAN from its ingress proxy and forwards it to UIAM as `X-Client-Sans`.
 */
const kibanaClientSans = (() => {
  const { subjectAltName } = new X509Certificate(readFileSync(KBN_CERT_PATH));
  const eident = subjectAltName
    ?.split(',')
    .map((san) => san.trim())
    .find((san) => san.startsWith('DNS:EIDENT.'));
  if (!eident) {
    throw new Error(`Kibana dev certificate has no EIDENT SAN: ${subjectAltName}`);
  }
  return eident.replace('DNS:', 'DNS=');
})();

// Plays the role of the cross-region destination: it authenticates to UIAM with its own service
// certificate (locally, the same dev certificate) and forwards the caller's identity.
const destinationAgent = new Agent({
  connect: {
    cert: readFileSync(KBN_CERT_PATH),
    key: readFileSync(KBN_KEY_PATH),
    rejectUnauthorized: false,
  },
});
const anonymousAgent = new Agent({ connect: { rejectUnauthorized: false } });

const authenticateAtUiam = (token: string, headers: Record<string, string>, agent: Agent) =>
  fetch(UIAM_AUTHENTICATE_URL, {
    method: 'POST',
    headers: {
      'User-Agent': 'Kibana-Scout/1.0 (IntegrationTest; Security)',
      Authorization: `Bearer ${token}`,
      ...headers,
    },
    dispatcher: agent,
  });

// These tests cannot be run on MKI because they talk to UIAM directly with the local dev certificate.
apiTest.describe('[NON-MKI] UIAM system identity', { tag: tags.serverless.all }, () => {
  const mintToken = async (apiClient: { post: (url: string, options?: any) => Promise<any> }) => {
    const response = await apiClient.post('test_endpoints/uiam/system_identity/_token', {
      headers: COMMON_UNSAFE_HEADERS,
      responseType: 'json',
    });
    expect(response).toHaveStatusCode(200);
    expect(typeof response.body.token).toBe('string');
    return response.body.token as string;
  };

  apiTest('should mint a fresh ephemeral token on every call', async ({ apiClient }) => {
    const first = await mintToken(apiClient);
    const second = await mintToken(apiClient);

    expect(first).toMatch(/^essu_/);
    expect(second).toMatch(/^essu_/);
    expect(second).not.toBe(first);
  });

  apiTest(
    "should be accepted by UIAM when a destination forwards it with Kibana's certificate identity",
    async ({ apiClient }) => {
      const token = await mintToken(apiClient);

      const response = await authenticateAtUiam(
        token,
        { 'X-Client-Sans': kibanaClientSans },
        destinationAgent
      );
      expect(response.status).toBe(200);

      const body = (await response.json()) as {
        type: string;
        project_id: string;
        organization_id: string;
        credentials: { type: string; internal: boolean };
        client: { type: string; upstream?: { project_id: string } };
      };
      expect(body.type).toBe('project');
      expect(body.project_id).toBe(MOCK_IDP_UIAM_PROJECT_ID);
      expect(body.organization_id).toBe(MOCK_IDP_UIAM_ORGANIZATION_ID);
      expect(body.credentials.type).toBe('token');
      expect(body.credentials.internal).toBe(true);
      expect(body.client.type).toBe('service');
      expect(body.client.upstream?.project_id).toBe(MOCK_IDP_UIAM_PROJECT_ID);
    }
  );

  apiTest('should be rejected by UIAM when presented alone', async ({ apiClient }) => {
    const token = await mintToken(apiClient);
    expect((await authenticateAtUiam(token, {}, anonymousAgent)).status).toBe(401);
  });

  apiTest(
    'should be rejected by UIAM when presented over mTLS without the forwarded SANs',
    async ({ apiClient }) => {
      const token = await mintToken(apiClient);
      expect((await authenticateAtUiam(token, {}, destinationAgent)).status).toBe(401);
    }
  );

  apiTest(
    'should be rejected by UIAM when presented with the forwarded SANs but not over mTLS',
    async ({ apiClient }) => {
      const token = await mintToken(apiClient);
      expect(
        (await authenticateAtUiam(token, { 'X-Client-Sans': kibanaClientSans }, anonymousAgent))
          .status
      ).toBe(401);
    }
  );

  apiTest(
    "should be accepted by UIAM when presented with Kibana's shared secret",
    async ({ apiClient }) => {
      const token = await mintToken(apiClient);
      const response = await authenticateAtUiam(
        token,
        { [ES_CLIENT_AUTHENTICATION_HEADER]: MOCK_IDP_UIAM_SHARED_SECRET },
        anonymousAgent
      );
      expect(response.status).toBe(200);
      expect(((await response.json()) as { type: string }).type).toBe('project');
    }
  );
});
