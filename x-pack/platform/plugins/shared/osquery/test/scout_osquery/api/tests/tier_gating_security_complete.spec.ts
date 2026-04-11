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
 * Tests that Security Complete WITHOUT Endpoint Complete blocks osquery response actions.
 * Replaces cypress/e2e/tiers/security_complete.cy.ts (serverless only).
 *
 * This test runs under the `osquery` config set (auto-detected from the
 * `scout_osquery` directory name), which configures only `security:complete`
 * without any Endpoint product line — unlike the default `security_complete`
 * config that includes both Security and Endpoint Complete.
 */

apiTest.describe(
  'Osquery tier gating - Security Complete (without Endpoint) blocks response actions',
  {
    tag: [...tags.serverless.security.complete],
  },
  () => {
    let adminCredentials: RoleSessionCredentials;

    apiTest.beforeAll(async ({ samlAuth }) => {
      adminCredentials = await samlAuth.asInteractiveUser('admin');
    });

    apiTest(
      'blocks creating a rule with osquery response action on security complete without endpoint',
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

        // Security Complete without Endpoint Complete should block osquery response actions
        expect(ruleResponse).toHaveStatusCode(400);
      }
    );
  }
);
