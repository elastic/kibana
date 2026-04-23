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
 * Tests that detection rule creation with osquery response actions succeeds on
 * Essentials tiers at the API level.
 * Replaces cypress/e2e/tiers/endpoint_essentials.cy.ts and
 * cypress/e2e/tiers/security_essentials.cy.ts (serverless only).
 *
 * Note: PLI-based gating for osquery response actions is enforced at the UI
 * level via the `osqueryAutomatedResponseActions` feature key and upselling
 * components — not at the API level. The API validates user privileges (PR
 * #260947) but does not block based on tier.
 *
 * The original Cypress tests verified the NEGATIVE case (UI shows upselling
 * message + disabled button). This test verifies only the POSITIVE case (API
 * accepts). The UI-level blocking assertions are tracked in Phase 2 spec:
 * "Tier gating upselling component tests (deferred from Phase 1)".
 */

apiTest.describe(
  'Osquery tier gating - Essentials tiers accept rule with response actions at API level',
  {
    tag: [...tags.serverless.security.essentials],
  },
  () => {
    let adminCredentials: RoleSessionCredentials;
    let ruleId: string;

    apiTest.beforeAll(async ({ samlAuth }) => {
      adminCredentials = await samlAuth.asInteractiveUser('admin');
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

    apiTest(
      'allows creating a rule with osquery response action on essentials tier',
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

        // API allows rule creation on all tiers — PLI gating is UI-side only
        expect(ruleResponse).toHaveStatusCode(200);
        ruleId = ruleResponse.body.id;
      }
    );
  }
);
