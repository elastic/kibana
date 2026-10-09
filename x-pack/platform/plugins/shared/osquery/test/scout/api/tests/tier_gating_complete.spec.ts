/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RoleSessionCredentials } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { tags } from '@kbn/scout';
import { apiTest, testData } from '../fixtures';

/**
 * Tests that Endpoint Complete PLI permits osquery response actions.
 * Replaces cypress/e2e/tiers/endpoint_complete.cy.ts (serverless only).
 *
 * Note: The "Security Complete only" (no Endpoint) case is not tested separately —
 * the same Endpoint Complete PLI gate is already verified by tier_gating_essentials.spec.ts.
 * A dedicated config set (osquery/serverless/security_complete_only) exists for future use
 * if distinct PLI coverage is needed.
 */

apiTest.describe(
  'Osquery tier gating - Endpoint Complete permits response actions',
  {
    tag: [...tags.serverless.security.complete],
  },
  () => {
    let adminCredentials: RoleSessionCredentials;
    let ruleId: string;

    apiTest.beforeAll(async ({ samlAuth, kbnClient }) => {
      adminCredentials = await samlAuth.asInteractiveUser('admin');

      // Create a detection rule with osquery response action
      const ruleResponse = await kbnClient.request({
        method: 'POST',
        path: testData.API_PATHS.DETECTION_RULES,
        body: testData.getMinimalRule({
          enabled: false,
          response_actions: [
            {
              params: {
                query: 'SELECT * FROM os_version;',
              },
              action_type_id: '.osquery',
            },
          ],
        }),
      });

      ruleId = (ruleResponse.data as Record<string, any>).id;
    });

    apiTest.afterAll(async ({ kbnClient }) => {
      if (ruleId) {
        await kbnClient.request({
          method: 'DELETE',
          path: `${testData.API_PATHS.DETECTION_RULES}?id=${ruleId}`,
          ignoreErrors: [404],
        });
      }
    });

    apiTest('allows creating a rule with osquery response action', async ({ apiClient }) => {
      // The rule was created successfully in beforeAll — verify it exists via GET
      const response = await apiClient.get(`${testData.API_PATHS.DETECTION_RULES}?id=${ruleId}`, {
        headers: {
          ...testData.COMMON_HEADERS,
          ...adminCredentials.cookieHeader,
        },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
    });
  }
);
