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

// This test runs against the security_essentials domain (osquery config set),
// which sets productTypes to security + endpoint essentials tiers.
// Without endpoint complete, response actions should NOT be available.
test.describe(
  'App Features for Security Essentials PLI',
  { tag: [...tags.serverless.security.essentials] },
  () => {
    let ruleId: string;

    test.beforeEach(async ({ kbnClient, browserAuth, page, kbnUrl }) => {
      const rule = await loadRule(kbnClient);
      ruleId = rule.id;
      await browserAuth.loginWithCustomRole(socManagerRole);
      await page.goto(kbnUrl.get(`/app/security/rules/id/${ruleId}/edit`));
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
