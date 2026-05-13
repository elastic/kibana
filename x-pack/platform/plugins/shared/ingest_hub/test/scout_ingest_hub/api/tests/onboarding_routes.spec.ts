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
  'Ingest Hub onboarding routes — FF enabled',
  { tag: tags.stateful.classic },
  () => {
    apiTest(
      'returns 200 for user with Fleet integrations privileges',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser(
          testData.FLEET_INTEGRATIONS_ALL_ROLE
        );
        const response = await apiClient.get(testData.ONBOARDING_AWS_API_PATH, {
          headers: { ...testData.COMMON_HEADERS, ...cookieHeader },
        });

        expect(response).toHaveStatusCode(200);
      }
    );

    apiTest(
      'returns 403 for user without Fleet integrations privileges',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser(testData.NO_FLEET_ROLE);
        const response = await apiClient.get(testData.ONBOARDING_AWS_API_PATH, {
          headers: { ...testData.COMMON_HEADERS, ...cookieHeader },
        });

        expect(response).toHaveStatusCode(403);
      }
    );
  }
);
