/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test } from '../../fixtures';
import { socManagerRole } from '../../common/roles';
import { loadRule, cleanupRule } from '../../common/api_helpers';
import { checkOsqueryResponseActionsPermissions } from '../../common/response_actions';
import { waitForPageReady } from '../../common/constants';

// NOTE: This test requires serverless mode with specific product tier configuration:
//   productTypes: [
//     { product_line: 'security', product_tier: 'essentials' },
//     { product_line: 'endpoint', product_tier: 'essentials' },
//   ]
// Scout does not yet support product tier configuration.
// TODO: Enable when serverless Scout tier configuration is available.
test.describe.skip('App Features for Security Essentials PLI', { tag: ['@svlSecurity'] }, () => {
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
});
