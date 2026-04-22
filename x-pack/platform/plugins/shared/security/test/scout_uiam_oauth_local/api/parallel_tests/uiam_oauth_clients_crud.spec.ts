/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse as parseCookie } from 'tough-cookie';

import { createSAMLResponse } from '@kbn/mock-idp-utils';
import { apiTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

import { COMMON_UNSAFE_HEADERS } from '../fixtures';

const CLIENTS_BASE = 'internal/security/oauth/clients';

apiTest.describe(
  '[NON-MKI] UIAM OAuth client CRUD via Kibana proxy',
  { tag: [...tags.serverless.security.complete] },
  () => {
    let authHeaders: Record<string, string>;

    apiTest.beforeAll(async ({ apiClient, kbnUrl, config: { organizationId, projectType } }) => {
      const samlResponse = await createSAMLResponse({
        kibanaUrl: kbnUrl.get('/api/security/saml/callback'),
        username: '1234567890',
        email: 'elastic_admin@elastic.co',
        roles: ['admin'],
        serverless: {
          uiamEnabled: true,
          organizationId: organizationId!,
          projectType: projectType!,
        },
      });

      const samlCallback = await apiClient.post('api/security/saml/callback', {
        body: `SAMLResponse=${encodeURIComponent(samlResponse)}`,
      });
      const cookie = parseCookie(samlCallback.headers['set-cookie'][0])!.cookieString();

      authHeaders = { ...COMMON_UNSAFE_HEADERS, Cookie: cookie };
    });

    apiTest(
      'creates, reads, lists, patches (incl. redirect_uris), and revokes a client',
      async ({ apiClient }) => {
        const clientName = `scout-crud-${Date.now()}`;
        const resource = `urn:scout-crud:${Date.now()}`;
        const initialRedirectUri = 'https://example.test/callback';
        const secondRedirectUri = 'https://example.test/callback-2';

        const createResponse = await apiClient.post(CLIENTS_BASE, {
          headers: authHeaders,
          responseType: 'json',
          body: {
            resource,
            client_name: clientName,
            client_type: 'public',
            client_metadata: { owner: 'scout-crud' },
            redirect_uris: [initialRedirectUri],
          },
        });
        expect(createResponse.statusCode).toBe(200);
        const created = createResponse.body;
        expect(created.id).toBeDefined();
        expect(created.client_name).toBe(clientName);
        expect(created.type).toBe('public');
        expect(created.redirect_uris).toStrictEqual([initialRedirectUri]);

        const clientId: string = created.id;

        try {
          const getResponse = await apiClient.get(
            `${CLIENTS_BASE}/${encodeURIComponent(clientId)}`,
            { headers: authHeaders, responseType: 'json' }
          );
          expect(getResponse.statusCode).toBe(200);
          expect(getResponse.body.id).toBe(clientId);
          expect(getResponse.body.redirect_uris).toStrictEqual([initialRedirectUri]);

          const listResponse = await apiClient.get(CLIENTS_BASE, {
            headers: authHeaders,
            responseType: 'json',
          });
          expect(listResponse.statusCode).toBe(200);
          const listed = (listResponse.body.clients as Array<{ id: string }>).find(
            (c) => c.id === clientId
          );
          expect(listed).toBeDefined();

          const patchResponse = await apiClient.patch(
            `${CLIENTS_BASE}/${encodeURIComponent(clientId)}`,
            {
              headers: authHeaders,
              responseType: 'json',
              body: {
                client_name: `${clientName}-renamed`,
                client_metadata: { owner: 'scout-crud', updated: 'true' },
                redirect_uris: [initialRedirectUri, secondRedirectUri],
              },
            }
          );
          expect(patchResponse.statusCode).toBe(200);
          expect(patchResponse.body.client_name).toBe(`${clientName}-renamed`);
          const patchedUris: string[] = patchResponse.body.redirect_uris ?? [];
          expect(patchedUris).toContain(initialRedirectUri);
          expect(patchedUris).toContain(secondRedirectUri);
        } finally {
          const revokeResponse = await apiClient.post(
            `${CLIENTS_BASE}/${encodeURIComponent(clientId)}/_revoke`,
            {
              headers: authHeaders,
              responseType: 'json',
              body: { reason: 'scout cleanup' },
            }
          );
          expect([200, 204]).toContain(revokeResponse.statusCode);
        }
      }
    );

    apiTest(
      'rejects malformed create payloads at the Kibana schema layer',
      async ({ apiClient }) => {
        const badClientType = await apiClient.post(CLIENTS_BASE, {
          headers: authHeaders,
          responseType: 'json',
          body: {
            resource: 'urn:scout-crud:bad',
            client_name: 'scout-bad',
            client_type: 'not-a-valid-type',
          },
        });
        expect(badClientType.statusCode).toBe(400);

        const badLogoMedia = await apiClient.post(CLIENTS_BASE, {
          headers: authHeaders,
          responseType: 'json',
          body: {
            resource: 'urn:scout-crud:bad2',
            client_name: 'scout-bad2',
            client_type: 'public',
            client_logo: { media_type: 'application/json', data: 'abc' },
          },
        });
        expect(badLogoMedia.statusCode).toBe(400);
      }
    );
  }
);
