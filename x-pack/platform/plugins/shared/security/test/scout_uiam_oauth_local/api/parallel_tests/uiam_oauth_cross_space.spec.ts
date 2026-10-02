/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { extractWWWAuthenticateParams } from '@modelcontextprotocol/sdk/client/auth.js';
import { Agent } from 'undici';

import { createUiamOAuthAccessToken } from '@kbn/mock-idp-utils';
import type { ApiClientFixture } from '@kbn/scout';
import { apiTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

import { COMMON_HEADERS } from '../fixtures';

const MCP_ENDPOINT = 'api/agent_builder/mcp';

const tlsAgent = new Agent({ connect: { rejectUnauthorized: false } });

const insecureFetch: typeof fetch = (url, init) => {
  return fetch(url, { ...init, dispatcher: tlsAgent } as RequestInit);
};

const mcpInitBody = (id: number) => ({
  jsonrpc: '2.0' as const,
  method: 'initialize',
  params: {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'test-client', version: '1.0.0' },
  },
  id,
});

apiTest.describe(
  '[NON-MKI] Cross-space OAuth token audience isolation',
  { tag: [...tags.serverless.security.complete] },
  () => {
    const SPACE_A = 'oauth-space-a';
    const SPACE_B = 'oauth-space-b';

    let kibanaBaseUrl: string;
    let tokenForDefault: string;
    let tokenForSpaceA: string;
    let tokenForSpaceB: string;

    apiTest.beforeAll(async ({ kbnUrl, apiServices, config: { organizationId, projectType } }) => {
      kibanaBaseUrl = new URL(kbnUrl.get()).origin;

      await apiServices.spaces.create({ id: SPACE_A, name: 'OAuth Space A' });
      await apiServices.spaces.create({ id: SPACE_B, name: 'OAuth Space B' });

      const commonTokenOpts = {
        username: '1234567890',
        organizationId: organizationId!,
        projectType: projectType!,
        roles: ['admin'],
        email: 'elastic_admin@elastic.co',
      };

      [tokenForDefault, tokenForSpaceA, tokenForSpaceB] = await Promise.all([
        createUiamOAuthAccessToken({
          ...commonTokenOpts,
          audience: `${kibanaBaseUrl}/${MCP_ENDPOINT}`,
        }),
        createUiamOAuthAccessToken({
          ...commonTokenOpts,
          audience: `${kibanaBaseUrl}/s/${SPACE_A}/${MCP_ENDPOINT}`,
        }),
        createUiamOAuthAccessToken({
          ...commonTokenOpts,
          audience: `${kibanaBaseUrl}/s/${SPACE_B}/${MCP_ENDPOINT}`,
        }),
      ]);
    });

    apiTest.afterAll(async ({ apiServices }) => {
      await Promise.allSettled([
        apiServices.spaces.delete(SPACE_A),
        apiServices.spaces.delete(SPACE_B),
      ]);
    });

    // Helper: POST MCP initialize with the given bearer token to a space-aware endpoint.
    // Uses raw apiClient.post to prevent the SDK from silently reauthorizing.
    const postMcp = (apiClient: ApiClientFixture, spacePath: string, token: string) =>
      apiClient.post(spacePath, {
        headers: { ...COMMON_HEADERS, Authorization: `Bearer ${token}` },
        responseType: 'json',
        body: mcpInitBody(1),
      });

    // ── Same-space controls (prove tokens work in their target space) ──

    apiTest('token for default space succeeds on default space', async ({ apiClient }) => {
      const response = await postMcp(apiClient, MCP_ENDPOINT, tokenForDefault);
      expect(response.statusCode).toBe(200);
    });

    apiTest('token for Space A succeeds on Space A', async ({ apiClient }) => {
      const response = await postMcp(apiClient, `s/${SPACE_A}/${MCP_ENDPOINT}`, tokenForSpaceA);
      expect(response.statusCode).toBe(200);
    });

    apiTest('token for Space B succeeds on Space B', async ({ apiClient }) => {
      const response = await postMcp(apiClient, `s/${SPACE_B}/${MCP_ENDPOINT}`, tokenForSpaceB);
      expect(response.statusCode).toBe(200);
    });

    // ── Cross-space rejection (audience mismatch, not permission denial) ──

    apiTest('token for Space A is rejected on Space B', async ({ apiClient }) => {
      const response = await postMcp(apiClient, `s/${SPACE_B}/${MCP_ENDPOINT}`, tokenForSpaceA);
      expect(response.statusCode).toBe(400);
    });

    apiTest('token for Space B is rejected on Space A', async ({ apiClient }) => {
      const response = await postMcp(apiClient, `s/${SPACE_A}/${MCP_ENDPOINT}`, tokenForSpaceB);
      expect(response.statusCode).toBe(400);
    });

    // ── Default-space ↔ custom-space rejection ──

    apiTest('token for default space is rejected on Space A', async ({ apiClient }) => {
      const response = await postMcp(apiClient, `s/${SPACE_A}/${MCP_ENDPOINT}`, tokenForDefault);
      expect(response.statusCode).toBe(400);
    });

    apiTest('token for default space is rejected on Space B', async ({ apiClient }) => {
      const response = await postMcp(apiClient, `s/${SPACE_B}/${MCP_ENDPOINT}`, tokenForDefault);
      expect(response.statusCode).toBe(400);
    });

    apiTest('token for Space A is rejected on default space', async ({ apiClient }) => {
      const response = await postMcp(apiClient, MCP_ENDPOINT, tokenForSpaceA);
      expect(response.statusCode).toBe(400);
    });

    apiTest('token for Space B is rejected on default space', async ({ apiClient }) => {
      const response = await postMcp(apiClient, MCP_ENDPOINT, tokenForSpaceB);
      expect(response.statusCode).toBe(400);
    });

    // ── WWW-Authenticate header includes space prefix ──

    apiTest(
      'WWW-Authenticate resource_metadata includes space prefix for custom space',
      async ({ apiClient }) => {
        // Use insecureFetch (not apiClient) for the unauthenticated request so the
        // response object exposes the raw WWW-Authenticate header for parsing.
        const response = await insecureFetch(
          new URL(`${kibanaBaseUrl}/s/${SPACE_A}/${MCP_ENDPOINT}`),
          {
            method: 'POST',
            headers: COMMON_HEADERS,
            body: JSON.stringify(mcpInitBody(1)),
          }
        );

        expect(response.status).toBe(401);

        const { resourceMetadataUrl } = extractWWWAuthenticateParams(response);
        expect(resourceMetadataUrl).toBeDefined();
        expect(resourceMetadataUrl!.pathname).toBe(
          `/.well-known/oauth-protected-resource/s/${SPACE_A}/${MCP_ENDPOINT}`
        );

        // Also verify via apiClient that the endpoint returns 401
        const apiResponse = await apiClient.post(`s/${SPACE_A}/${MCP_ENDPOINT}`, {
          headers: COMMON_HEADERS,
          responseType: 'json',
          body: mcpInitBody(2),
        });
        expect(apiResponse.statusCode).toBe(401);
      }
    );

    apiTest('path-aware discovery returns space-specific resource URL', async ({ apiClient }) => {
      const response = await apiClient.get(
        `.well-known/oauth-protected-resource/s/${SPACE_A}/${MCP_ENDPOINT}`,
        { headers: COMMON_HEADERS, responseType: 'json' }
      );

      expect(response.statusCode).toBe(200);
      const resourceUrl = new URL(response.body.resource);
      expect(resourceUrl.pathname).toBe(`/s/${SPACE_A}/${MCP_ENDPOINT}`);
    });
  }
);
