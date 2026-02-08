/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-security';
import { test } from '../../fixtures';
import { socManagerRole } from '../../../common/roles';
import { loadRule, cleanupRule } from '../../../common/api_helpers';

// NOTE: This test requires serverless mode with specific product tier configuration
// which is not available in the current stateful Scout test setup.
// TODO: Enable when serverless Scout testing is configured.
test.describe.skip('App Features for Endpoint Essentials PLI', { tag: ['@svlSecurity'] }, () => {
  let ruleId: string;

  test.afterEach(async ({ kbnClient }) => {
    if (ruleId) {
      await cleanupRule(kbnClient, ruleId);
    }
  });

  test.beforeEach(async ({ kbnClient, browserAuth }) => {
    const rule = await loadRule(kbnClient);
    ruleId = rule.id;
    await browserAuth.loginWithCustomRole(socManagerRole);
  });

  test('response actions should not be available', async ({ page }) => {
    // Navigate to rule edit and check response actions
    await page.goto(`/app/security/rules/id/${ruleId}/edit`);
    // TODO: Check that osquery response actions are not available in Endpoint Essentials tier
    // This would typically involve checking for the absence of response action UI elements
  });
});
