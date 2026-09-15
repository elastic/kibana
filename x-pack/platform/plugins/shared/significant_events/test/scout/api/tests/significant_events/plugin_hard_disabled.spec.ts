/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import { tags } from '@kbn/scout';
import { significantEventsApiTest as apiTest } from '../../fixtures';
import { COMMON_API_HEADERS } from '../../fixtures/constants';

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
