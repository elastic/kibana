/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import type { RoleApiCredentials } from '@kbn/scout';
import { ALERTING_V2_MATCHER_VALUE_SUGGESTIONS_API_PATH } from '@kbn/alerting-v2-constants';
import { apiTest } from '../fixtures';

apiTest.describe('Matcher value suggestions API', { tag: '@local-stateful-classic' }, () => {
  let adminCredentials: RoleApiCredentials;
  let adminHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ requestAuth }) => {
    adminCredentials = await requestAuth.getApiKeyForAdmin();
    adminHeaders = { ...adminCredentials.apiKeyHeader };
  });

  apiTest(
    'validation: rejects body with unknown top-level keys (strict schema)',
    async ({ apiClient }) => {
      const response = await apiClient.post(ALERTING_V2_MATCHER_VALUE_SUGGESTIONS_API_PATH, {
        headers: adminHeaders,
        body: {
          field: 'rule.name',
          query: 'test',
          unknownField: 'x',
        },
      });

      expect(response).toHaveStatusCode(400);
    }
  );
});
