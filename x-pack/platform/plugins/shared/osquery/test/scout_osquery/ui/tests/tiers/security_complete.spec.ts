/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { test } from '../../fixtures';
import { socManagerRole } from '../../common/roles';
import { loadRule, cleanupRule } from '../../common/api_helpers';
import { checkOsqueryResponseActionsPermissions } from '../../common/response_actions';
import { waitForPageReady } from '../../common/constants';

// This test requires a server config with ONLY security complete PLI (no endpoint).
// The osquery serverless security_complete config inherits from the default config
// which includes endpoint complete. Response actions are thus available, so this
// test would fail. Cypress achieves the security-only tier via env.ftrConfig.productTypes
// override; Scout uses a single server config per run and cannot override per-test.
// Skipped in Scout; covered by Cypress security_complete.cy.ts.
test.describe.skip(
  'App Features for Security Complete PLI (no Endpoint)',
  { tag: [...tags.serverless.security.complete] },
  () => {
    let ruleId: string;

    test.beforeEach(async ({ kbnClient, browserAuth, page, kbnUrl }) => {
      const rule = await loadRule(kbnClient);
      ruleId = rule.id;
      await browserAuth.loginWithCustomRole(socManagerRole);
      await page.goto(kbnUrl.get(`/app/security/rules/id/${ruleId}/edit`));
      await waitForPageReady(page);
    });

    test.afterEach(async ({ kbnClient }) => {
      if (ruleId) {
        await cleanupRule(kbnClient, ruleId);
      }
    });

    test('response actions should not be available', async ({ page, kbnUrl }) => {
      await checkOsqueryResponseActionsPermissions(page, kbnUrl, false);
    });
  }
);
