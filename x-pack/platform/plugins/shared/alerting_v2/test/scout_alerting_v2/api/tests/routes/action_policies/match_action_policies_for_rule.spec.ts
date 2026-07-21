/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import type { RoleApiCredentials } from '@kbn/scout';
import { ALERTING_V2_ACTION_POLICIES_READ_ROLE, apiTest, testData } from '../../../fixtures';

const MATCH_ACTION_POLICIES_FOR_RULE_URL = `${testData.ACTION_POLICY_API_PATH}/_match_for_rule`;

apiTest.describe('Match action policies for rule API', { tag: '@local-stateful-classic' }, () => {
  let readerCredentials: RoleApiCredentials;
  let readerHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ requestAuth }) => {
    readerCredentials = await requestAuth.getApiKeyForCustomRole(
      ALERTING_V2_ACTION_POLICIES_READ_ROLE
    );
    readerHeaders = { ...testData.COMMON_HEADERS, ...readerCredentials.apiKeyHeader };
  });

  apiTest(
    'validation: rejects body with unknown top-level keys (strict schema)',
    async ({ apiClient }) => {
      const response = await apiClient.post(MATCH_ACTION_POLICIES_FOR_RULE_URL, {
        headers: readerHeaders,
        body: {
          rule: { id: 'rule-1' },
          unknownField: 'x',
        },
      });

      expect(response).toHaveStatusCode(400);
    }
  );
});
