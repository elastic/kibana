/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Migrated from:
//   x-pack/platform/test/functional_with_es_ssl/apps/triggers_actions_ui/connectors/with_email_services_enabled_kbn_config/email.ts
//
// 1 of 1 tests migrated.
// Requires --xpack.actions.email.services.enabled (set in the
// email_services_enabled Scout config set).

import { tags, test } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

const CONNECTORS_APP_PATH = '/app/management/insightsAndAlerting/triggersActionsConnectors';

test.describe(
  'Email connector — services-enabled Kibana config',
  {
    tag: tags.stateful.classic,
  },
  () => {
    test.beforeEach(async ({ browserAuth, page, kbnUrl }) => {
      await browserAuth.loginAsAdmin();
      await page.goto(kbnUrl.get(CONNECTORS_APP_PATH));
    });

    test('should use the kibana config for enabled services', async ({ page }) => {
      await page.testSubj.click('createConnectorButton');
      await page.testSubj.click('.email-card');

      const serviceSelect = page.testSubj.locator('emailServiceSelectInput');
      const options = serviceSelect.locator('option');

      await expect(options).toHaveCount(2);
      await expect(serviceSelect.locator('option:nth-child(1)')).toHaveText('Gmail');
      await expect(serviceSelect.locator('option:nth-child(2)')).toHaveText('Amazon SES');
    });
  }
);
