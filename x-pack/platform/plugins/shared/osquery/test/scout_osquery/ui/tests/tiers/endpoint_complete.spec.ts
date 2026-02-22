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

// This test runs against the security_complete domain (osquery config set),
// which uses the default full complete tier — including endpoint complete.
// With endpoint complete active, response actions should be available.
test.describe(
  'App Features for Endpoint Complete PLI',
  { tag: [...tags.serverless.security.complete] },
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

    test('response actions should be available', async ({ page, kbnUrl }) => {
      await checkOsqueryResponseActionsPermissions(page, kbnUrl, true);
    });
  }
);
