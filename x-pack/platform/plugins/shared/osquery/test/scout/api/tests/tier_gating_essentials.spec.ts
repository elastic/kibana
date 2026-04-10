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
 * Tests that Essentials tiers block osquery response actions.
 * Replaces cypress/e2e/tiers/endpoint_essentials.cy.ts and
 * cypress/e2e/tiers/security_essentials.cy.ts (serverless only).
 *
 * The security_essentials config sets both security AND endpoint to essentials,
 * covering both blocked cases.
 */

apiTest.describe(
  'Osquery tier gating - Essentials tiers block response actions',
  {
    tag: [...tags.serverless.security.essentials],
  },
  () => {
    let adminCredentials: RoleSessionCredentials;

    apiTest.beforeAll(async ({ samlAuth }) => {
      adminCredentials = await samlAuth.asInteractiveUser('admin');
    });

    apiTest(
      'blocks creating a rule with osquery response action on essentials tier',
      async ({ apiClient }) => {
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

        // Essentials tier should block osquery response actions
        expect(ruleResponse).toHaveStatusCode(400);
      }
    );
  }
);
