/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags, type ApiClientFixture } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { significantEventsApiTest as apiTest } from '../../fixtures';
import { COMMON_API_HEADERS } from '../../fixtures/constants';

const RUN_QUOTAS_ENDPOINT = 'internal/significant_events/run_quotas';

type RunQuotaGroup = 'detection' | 'investigation' | 'ki_extraction';
type RunQuotaConsumeBody =
  | { group: 'detection' }
  | { group: 'ki_extraction' }
  | { group: 'investigation'; critical: boolean };

interface RunQuotaSnapshot {
  enabled: boolean;
  limits: Record<RunQuotaGroup, number>;
  counts: Record<RunQuotaGroup, number>;
  window: {
    start: string;
    resetsAt: string;
    timezone: string;
  };
  canManage: boolean;
}

apiTest.describe(
  'Significant Events run quota API',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let cookieHeader: Record<string, string>;
    let original: RunQuotaSnapshot;
    let settingsChanged = false;

    const headers = () => ({ ...COMMON_API_HEADERS, ...cookieHeader });

    const readSnapshot = async (apiClient: ApiClientFixture): Promise<RunQuotaSnapshot> => {
      const response = await apiClient.get(RUN_QUOTAS_ENDPOINT, {
        headers: headers(),
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);
      return response.body as RunQuotaSnapshot;
    };

    const updateSettings = async (
      apiClient: ApiClientFixture,
      desired: {
        enabled?: boolean;
        limits?: Partial<Record<RunQuotaGroup, number>>;
      }
    ): Promise<RunQuotaSnapshot> => {
      const current = await readSnapshot(apiClient);
      const limits = Object.fromEntries(
        Object.entries(desired.limits ?? {}).filter(
          ([group, limit]) => current.limits[group as RunQuotaGroup] !== limit
        )
      ) as Partial<Record<RunQuotaGroup, number>>;
      const body = {
        ...(desired.enabled !== undefined && desired.enabled !== current.enabled
          ? { enabled: desired.enabled }
          : {}),
        ...(Object.keys(limits).length > 0 ? { limits } : {}),
      };

      if (Object.keys(body).length === 0) {
        return current;
      }

      const response = await apiClient.put(RUN_QUOTAS_ENDPOINT, {
        headers: headers(),
        body,
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);
      settingsChanged = true;
      return response.body as RunQuotaSnapshot;
    };

    const consume = async (apiClient: ApiClientFixture, body: RunQuotaConsumeBody) =>
      apiClient.post(`${RUN_QUOTAS_ENDPOINT}/_consume`, {
        headers: headers(),
        body,
        responseType: 'json',
      });

    const consumeAllowed = async (
      apiClient: ApiClientFixture,
      body: RunQuotaConsumeBody
    ): Promise<void> => {
      const response = await consume(apiClient, body);
      expect(response).toHaveStatusCode(200);
      expect(response.body).toStrictEqual({ allowed: true });
    };

    apiTest.beforeAll(async ({ samlAuth }) => {
      ({ cookieHeader } = await samlAuth.asStreamsAdmin());
    });

    apiTest.beforeEach(async ({ apiClient }) => {
      original = await readSnapshot(apiClient);
      settingsChanged = false;
    });

    apiTest.afterEach(async ({ apiClient }) => {
      if (settingsChanged) {
        await updateSettings(apiClient, {
          enabled: original.enabled,
          limits: original.limits,
        });
      }
    });

    apiTest(
      'records admissions while enforcement is disabled and the limit is unlimited',
      async ({ apiClient }) => {
        const before = await updateSettings(apiClient, {
          enabled: false,
          limits: { detection: 0 },
        });

        const response = await consume(apiClient, { group: 'detection' });

        expect(response).toHaveStatusCode(200);
        expect(response.body).toStrictEqual({ allowed: true });
        const after = await readSnapshot(apiClient);
        expect(after.enabled).toBe(false);
        expect(after.limits.detection).toBe(0);
        expect(after.counts.detection).toBe(before.counts.detection + 1);
      }
    );

    apiTest(
      'denies a non-critical admission at a finite limit without incrementing',
      async ({ apiClient }) => {
        let before = await readSnapshot(apiClient);
        if (before.counts.ki_extraction === 0) {
          await updateSettings(apiClient, {
            enabled: false,
            limits: { ki_extraction: 0 },
          });
          await consumeAllowed(apiClient, { group: 'ki_extraction' });
          before = await readSnapshot(apiClient);
        }
        const finiteLimit = Math.min(before.counts.ki_extraction, 10_000);
        before = await updateSettings(apiClient, {
          enabled: true,
          limits: { ki_extraction: finiteLimit },
        });

        const response = await consume(apiClient, { group: 'ki_extraction' });

        expect(response).toHaveStatusCode(200);
        expect(response.body).toStrictEqual({ allowed: false });
        const after = await readSnapshot(apiClient);
        expect(after.counts.ki_extraction).toBe(before.counts.ki_extraction);
      }
    );

    apiTest(
      'allows and counts a critical investigation beyond its finite limit',
      async ({ apiClient }) => {
        let before = await readSnapshot(apiClient);
        if (before.counts.investigation === 0) {
          await updateSettings(apiClient, {
            enabled: false,
            limits: { investigation: 0 },
          });
          await consumeAllowed(apiClient, {
            group: 'investigation',
            critical: false,
          });
          before = await readSnapshot(apiClient);
        }
        const finiteLimit = Math.min(before.counts.investigation, 10_000);
        before = await updateSettings(apiClient, {
          enabled: true,
          limits: { investigation: finiteLimit },
        });

        const deniedResponse = await consume(apiClient, {
          group: 'investigation',
          critical: false,
        });
        expect(deniedResponse).toHaveStatusCode(200);
        expect(deniedResponse.body).toStrictEqual({ allowed: false });

        const criticalResponse = await consume(apiClient, {
          group: 'investigation',
          critical: true,
        });
        expect(criticalResponse).toHaveStatusCode(200);
        expect(criticalResponse.body).toStrictEqual({ allowed: true });

        const after = await readSnapshot(apiClient);
        expect(after.counts.investigation).toBe(before.counts.investigation + 1);
      }
    );
  }
);
