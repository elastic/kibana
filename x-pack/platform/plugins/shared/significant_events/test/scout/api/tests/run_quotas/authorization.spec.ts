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

interface RunQuotaSnapshot {
  enabled: boolean;
  limits: {
    detection: number;
    investigation: number;
    ki_extraction: number;
  };
  counts: {
    detection: number;
    investigation: number;
    ki_extraction: number;
  };
  window: {
    start: string;
    resetsAt: string;
    timezone: string;
  };
  canManage: boolean;
}

apiTest.describe(
  'Significant Events run quota authorization',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    apiTest(
      'allows a Streams reader to inspect the deployment-wide snapshot',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asStreamsReadOnly();

        const response = await apiClient.get(RUN_QUOTAS_ENDPOINT, {
          headers: { ...COMMON_API_HEADERS, ...cookieHeader },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        const snapshot = response.body as RunQuotaSnapshot;
        expect(typeof snapshot.enabled).toBe('boolean');
        expect(typeof snapshot.limits.detection).toBe('number');
        expect(typeof snapshot.limits.investigation).toBe('number');
        expect(typeof snapshot.limits.ki_extraction).toBe('number');
        expect(typeof snapshot.counts.detection).toBe('number');
        expect(typeof snapshot.counts.investigation).toBe('number');
        expect(typeof snapshot.counts.ki_extraction).toBe('number');
        expect(typeof snapshot.window.start).toBe('string');
        expect(typeof snapshot.window.resetsAt).toBe('string');
        expect(snapshot.window.timezone).toBe('UTC');
        expect(snapshot.canManage).toBe(false);
      }
    );

    apiTest(
      'denies a manager whose Streams privilege is limited to one space',
      async ({ apiClient, samlAuth, config }) => {
        const streamsAdmin = getStreamsUsers(config).streamsAdmin;
        const oneSpaceManager = {
          ...streamsAdmin,
          kibana: streamsAdmin.kibana.map((entry) => ({ ...entry, spaces: ['default'] })),
        };
        const { cookieHeader } = await samlAuth.asInteractiveUser(oneSpaceManager);
        const readResponse = await apiClient.get(RUN_QUOTAS_ENDPOINT, {
          headers: { ...COMMON_API_HEADERS, ...cookieHeader },
          responseType: 'json',
        });
        expect(readResponse).toHaveStatusCode(200);

        const current = readResponse.body as RunQuotaSnapshot;
        const response = await apiClient.put(RUN_QUOTAS_ENDPOINT, {
          headers: { ...COMMON_API_HEADERS, ...cookieHeader },
          body: { enabled: !current.enabled },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(403);
      }
    );

    apiTest(
      'allows an all-spaces Streams manager to update and restore settings',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asStreamsAdmin();
        const headers = { ...COMMON_API_HEADERS, ...cookieHeader };
        const readResponse = await apiClient.get(RUN_QUOTAS_ENDPOINT, {
          headers,
          responseType: 'json',
        });
        expect(readResponse).toHaveStatusCode(200);
        const original = readResponse.body as RunQuotaSnapshot;
        const nextDetectionLimit =
          original.limits.detection === 10_000
            ? original.limits.detection - 1
            : original.limits.detection + 1;
        let settingsChanged = false;
        let restoreStatusCode: number | undefined;

        try {
          const response = await apiClient.put(RUN_QUOTAS_ENDPOINT, {
            headers,
            body: { limits: { detection: nextDetectionLimit } },
            responseType: 'json',
          });
          settingsChanged = response.statusCode === 200;

          expect(response).toHaveStatusCode(200);
          expect(response.body).toMatchObject({
            enabled: original.enabled,
            limits: {
              ...original.limits,
              detection: nextDetectionLimit,
            },
            counts: original.counts,
            canManage: true,
          });
        } finally {
          if (settingsChanged) {
            const restoreResponse = await apiClient.put(RUN_QUOTAS_ENDPOINT, {
              headers,
              body: {
                enabled: original.enabled,
                limits: original.limits,
              },
              responseType: 'json',
            });
            restoreStatusCode = restoreResponse.statusCode;
          }
        }
        expect(restoreStatusCode).toBe(200);
      }
    );
  }
);
