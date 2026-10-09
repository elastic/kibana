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
 * Observability Complete re-enables Significant Events via
 * serverless.oblt.complete.yml; classic/stateful keeps the schema default.
 * Global setup forces the availability feature flag on for this Scout suite.
 */
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

        expect(response).toHaveStatusCode(200);
        expect(response.body).toMatchObject({ available: true });
      }
    );
  }
);
