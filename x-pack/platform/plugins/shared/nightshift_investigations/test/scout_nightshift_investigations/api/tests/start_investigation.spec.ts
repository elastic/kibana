/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import { tags } from '@kbn/scout';
import type { KibanaRole } from '@kbn/scout';
import { apiTest, COMMON_HEADERS } from '../fixtures';

const INVESTIGATIONS_WRITE_ROLE: KibanaRole = {
  elasticsearch: { cluster: [], indices: [] },
  kibana: [{ base: [], feature: { agentBuilder: ['all'] }, spaces: ['*'] }],
};

const START_PATH = 'internal/nightshift/investigations';

apiTest.describe(
  'POST /internal/nightshift/investigations',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    apiTest('returns 400 when the request body is empty', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser(INVESTIGATIONS_WRITE_ROLE);
      const response = await apiClient.post(START_PATH, {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
        body: {},
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(400);
    });

    apiTest('returns 400 for an invalid subject type', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser(INVESTIGATIONS_WRITE_ROLE);
      const response = await apiClient.post(START_PATH, {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
        body: { subject: { type: 'not_a_valid_type', id: 'some-id' } },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(400);
    });

    apiTest(
      'returns 400 when subject.id exceeds 500 characters',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser(INVESTIGATIONS_WRITE_ROLE);
        const response = await apiClient.post(START_PATH, {
          headers: { ...COMMON_HEADERS, ...cookieHeader },
          body: { subject: { type: 'alert', id: 'x'.repeat(501) } },
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(400);
      }
    );

    // Without this, every negative test above would still pass if the alert branch rejected
    // every body it was given. A well-formed alert body passes validation and reaches the
    // server-side alert lookup, which returns 404 because the alert does not exist.
    apiTest(
      'returns 404 for a well-formed alert body whose alert does not exist',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser(INVESTIGATIONS_WRITE_ROLE);
        const response = await apiClient.post(START_PATH, {
          headers: { ...COMMON_HEADERS, ...cookieHeader },
          body: { subject: { type: 'alert', id: 'alert-uuid-1' } },
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(404);
      }
    );

    apiTest(
      'returns 403 for a user without agentBuilder:write',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser('viewer');
        const response = await apiClient.post(START_PATH, {
          headers: { ...COMMON_HEADERS, ...cookieHeader },
          body: { subject: { type: 'alert', id: 'some-id' } },
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(403);
      }
    );
  }
);
