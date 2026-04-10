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
 * Note: The "Security Complete only" (no Endpoint) case requires a custom
 * config set (osquery/serverless/security_complete_only) — deferred to when
 * that config is validated.
 */

apiTest.describe(
  'Osquery tier gating - Endpoint Complete permits response actions',
  {
    tag: [...tags.serverless.security.complete],
  },
  () => {
    let adminCredentials: RoleSessionCredentials;
    let ruleId: string;

    apiTest.beforeAll(async ({ samlAuth, apiClient }) => {
      adminCredentials = await samlAuth.asInteractiveUser('admin');

      // Create a detection rule with osquery response action
      const ruleResponse = await apiClient.post(testData.API_PATHS.DETECTION_RULES, {
        headers: {
          ...testData.COMMON_HEADERS,
          ...adminCredentials.cookieHeader,
        },
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
        responseType: 'json',
      });

      expect(ruleResponse).toHaveStatusCode(200);
      ruleId = ruleResponse.body.id;
    });

    apiTest.afterAll(async ({ apiClient }) => {
      if (ruleId) {
        await apiClient.delete(`${testData.API_PATHS.DETECTION_RULES}?id=${ruleId}`, {
          headers: {
            ...testData.COMMON_HEADERS,
            ...adminCredentials.cookieHeader,
          },
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
