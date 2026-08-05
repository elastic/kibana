/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import { tags } from '@kbn/scout';
import { significantEventsApiTest as apiTest } from '../../fixtures';
import { COMMON_API_HEADERS, PUBLIC_API_HEADERS } from '../../fixtures/constants';

const PUBLIC_SIGNIFICANT_EVENTS_PATH =
  'api/streams/logs.scout_plugin_availability/significant_events?from=2025-06-17T00:00:00.000Z&to=2025-06-17T00:00:00.000Z&bucketSize=1m';
const AVAILABILITY_PATH = 'internal/significant_events/availability';

/**
 * Verifies the serverless hard-disable for Significant Events:
 * - Logs Essentials inherits `xpack.significantEvents.enabled: false` from serverless.yml
 * - Observability Complete re-enables the plugin and keeps routes registered
 *
 * Soft feature-flag gating is covered elsewhere; these tests assert plugin load vs unload.
 */
apiTest.describe(
  'Significant Events plugin hard-disable (Logs Essentials)',
  { tag: [...tags.serverless.observability.logs_essentials] },
  () => {
    apiTest(
      'public significant events API returns 404 when the plugin is unloaded',
      async ({ apiClient, requestAuth }) => {
        const { apiKeyHeader } = await requestAuth.getApiKeyForAdmin();

        const response = await apiClient.get(PUBLIC_SIGNIFICANT_EVENTS_PATH, {
          headers: { ...PUBLIC_API_HEADERS, ...apiKeyHeader },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(404);
      }
    );

    apiTest(
      'availability API returns 404 when the plugin is unloaded',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser('admin');

        const response = await apiClient.get(AVAILABILITY_PATH, {
          headers: { ...COMMON_API_HEADERS, ...cookieHeader },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(404);
      }
    );
  }
);

apiTest.describe(
  'Significant Events plugin loaded (Complete / classic)',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    apiTest(
      'availability API is registered when the plugin is enabled',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asStreamsAdmin();

        const response = await apiClient.get(AVAILABILITY_PATH, {
          headers: { ...COMMON_API_HEADERS, ...cookieHeader },
          responseType: 'json',
        });

        // Global setup forces the availability flag on; assert the route exists and reports available.
        expect(response).toHaveStatusCode(200);
        expect(response.body).toMatchObject({ available: true });
      }
    );
  }
);
