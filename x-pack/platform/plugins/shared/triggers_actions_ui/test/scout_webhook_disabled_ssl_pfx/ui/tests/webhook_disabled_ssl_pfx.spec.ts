/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Migrated from:
//   x-pack/platform/test/functional_with_es_ssl/apps/triggers_actions_ui/connectors/webhook_disabled_ssl_pfx/webhook.ts
//
// 1 of 1 tests migrated.
// Requires --xpack.actions.webhook.ssl.pfx.enabled=false (set in the
// webhook_disabled_ssl_pfx Scout config set).

import { tags, test } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

const CONNECTORS_APP_PATH = '/app/management/insightsAndAlerting/triggersActionsConnectors';

test.describe(
  'Webhook connector — PFX disabled config',
  {
    tag: tags.stateful.classic,
  },
  () => {
    test.beforeEach(async ({ browserAuth, page, kbnUrl }) => {
      await browserAuth.loginAsAdmin();
      await page.goto(kbnUrl.get(CONNECTORS_APP_PATH));
    });

    test('should not render the pfx tab for ssl auth', async ({ page }) => {
      await page.testSubj.click('createConnectorButton');
      await page.testSubj.click('.webhook-card');
      await page.testSubj.click('authSSL');

      const certTypeTabs = page.testSubj.locator('webhookCertTypeTabs').locator('.euiTab');

      await expect(certTypeTabs).toHaveCount(1);
      await expect(page.testSubj.locator('webhookCertTypeCRTab')).toBeVisible();
    });
  }
);
