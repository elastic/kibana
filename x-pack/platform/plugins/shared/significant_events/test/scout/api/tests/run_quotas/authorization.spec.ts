/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { significantEventsApiTest as apiTest, getStreamsUsers } from '../../fixtures';
import { COMMON_API_HEADERS } from '../../fixtures/constants';

const RUN_QUOTAS_ENDPOINT = 'internal/significant_events/run_quotas';

apiTest.describe(
  'Significant Events run quota authorization',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    apiTest(
      'allows Streams readers to inspect status and limits',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asStreamsReadOnly();

        const [limitsResponse, statusResponse] = await Promise.all([
          apiClient.get(RUN_QUOTAS_ENDPOINT, {
            headers: { ...COMMON_API_HEADERS, ...cookieHeader },
            responseType: 'json',
          }),
          apiClient.get(`${RUN_QUOTAS_ENDPOINT}/_status`, {
            headers: { ...COMMON_API_HEADERS, ...cookieHeader },
            responseType: 'json',
          }),
        ]);

        expect(limitsResponse).toHaveStatusCode(200);
        expect(statusResponse).toHaveStatusCode(200);
        expect(statusResponse.body.canManageLimits).toBe(false);
      }
    );

    apiTest('rejects readers without Streams access', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser({
        kibana: [
          {
            base: [],
            feature: { discover: ['read'] },
            spaces: ['*'],
          },
        ],
        elasticsearch: {
          cluster: [],
          indices: [],
        },
      });

      const response = await apiClient.get(`${RUN_QUOTAS_ENDPOINT}/_status`, {
        headers: { ...COMMON_API_HEADERS, ...cookieHeader },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(403);
    });

    apiTest(
      'requires Streams manage across all spaces for limit writes',
      async ({ apiClient, samlAuth, config }) => {
        const streamsAdmin = getStreamsUsers(config).streamsAdmin;
        const defaultSpaceOnlyRole = {
          ...streamsAdmin,
          kibana: streamsAdmin.kibana.map((entry) => ({ ...entry, spaces: ['default'] })),
        };
        const { cookieHeader } = await samlAuth.asInteractiveUser(defaultSpaceOnlyRole);

        const response = await apiClient.put(RUN_QUOTAS_ENDPOINT, {
          headers: { ...COMMON_API_HEADERS, ...cookieHeader },
          body: {
            limits: {
              detection: { enabled: true, max: 100 },
            },
          },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(403);
      }
    );

    apiTest(
      'allows an all-spaces Streams manager to save a limit',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asStreamsAdmin();

        const response = await apiClient.put(RUN_QUOTAS_ENDPOINT, {
          headers: { ...COMMON_API_HEADERS, ...cookieHeader },
          body: {
            limits: {
              detection: { enabled: true, max: 100 },
            },
          },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
      }
    );

    apiTest(
      'rejects plumbing calls without an active managed execution chain',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asStreamsAdmin();
        const headers = {
          ...COMMON_API_HEADERS,
          ...cookieHeader,
          'x-kibana-workflow-execution-id': 'missing-execution',
        };

        const responses = await Promise.all([
          apiClient.post(`${RUN_QUOTAS_ENDPOINT}/_heartbeat?group=detection`, {
            headers,
            body: { executionId: 'missing-execution' },
            responseType: 'json',
          }),
          apiClient.post(`${RUN_QUOTAS_ENDPOINT}/_consume?group=detection`, {
            headers,
            body: { executionId: 'missing-execution' },
            responseType: 'json',
          }),
          apiClient.post(`${RUN_QUOTAS_ENDPOINT}/investigation/_reserve`, {
            headers,
            body: {
              executionId: 'missing-execution',
              eventId: 'missing-event',
              eventUuid: 'missing-event-uuid',
            },
            responseType: 'json',
          }),
        ]);

        for (const response of responses) {
          expect(response).toHaveStatusCode(403);
        }
      }
    );

    apiTest(
      'redacts enforcement ownership for a one-space reader',
      async ({ apiClient, samlAuth }) => {
        const admin = await samlAuth.asStreamsAdmin();

        const enableResponse = await apiClient.post(`${RUN_QUOTAS_ENDPOINT}/_enforcement`, {
          headers: { ...COMMON_API_HEADERS, ...admin.cookieHeader },
          body: {
            enabled: true,
            limits: { ki_extraction: { enabled: false, max: 0 } },
          },
          responseType: 'json',
        });
        expect(enableResponse).toHaveStatusCode(200);

        try {
          const reader = await samlAuth.asStreamsReadOnly();
          const statusResponse = await apiClient.get(`${RUN_QUOTAS_ENDPOINT}/_status`, {
            headers: { ...COMMON_API_HEADERS, ...reader.cookieHeader },
            responseType: 'json',
          });

          expect(statusResponse).toHaveStatusCode(200);
          expect(statusResponse.body.enabled).toBe(true);
          expect('enabledBy' in statusResponse.body).toBe(false);
          expect('enabledAt' in statusResponse.body).toBe(false);
        } finally {
          const cleanupAdmin = await samlAuth.asStreamsAdmin();
          await apiClient.post(`${RUN_QUOTAS_ENDPOINT}/_enforcement`, {
            headers: { ...COMMON_API_HEADERS, ...cleanupAdmin.cookieHeader },
            body: { enabled: false },
            responseType: 'json',
          });
        }
      }
    );
  }
);
