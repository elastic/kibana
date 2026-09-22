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
 * Logs Essentials inherits `xpack.significantEvents.enabled: false` from
 * serverless.yml, so the Significant Events plugin is unloaded and its routes
 * must return 404 (not a soft-gate 403).
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
