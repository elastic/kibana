/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest, testData } from '../fixtures';

apiTest.describe(
  'Ingest Hub onboarding routes — FF disabled (default)',
  { tag: tags.stateful.classic },
  () => {
    apiTest(
      'returns 404 when onboarding feature flag is disabled',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser({
          elasticsearch: { cluster: [] },
          kibana: [{ base: [], feature: { fleet: ['all'], fleetv2: ['all'] }, spaces: ['*'] }],
        });
        const response = await apiClient.get(testData.ONBOARDING_AWS_API_PATH, {
          headers: { ...testData.COMMON_HEADERS, ...cookieHeader },
        });

        expect(response).toHaveStatusCode(404);
      }
    );
  }
);
