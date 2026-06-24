/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Migrated from three custom-config FTR suites that each required a dedicated
// Kibana config (now consolidated into the `connectors_custom_config` server config set):
//   - connectors/with_email_services_enabled_kbn_config/email.ts
//   - connectors/with_email_aws_ses_kbn_config/email.ts
//   - connectors/webhook_disabled_ssl_pfx/webhook.ts

import type { ScoutPage } from '@kbn/scout';
import { tags, test } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

const CONNECTORS_APP_PATH = '/app/management/insightsAndAlerting/triggersActionsConnectors';

// Mirrors the `xpack.actions.email.services.ses.*` overrides in the
// connectors_custom_config server config set.
const SES_HOST = 'email-fips.ca-central-1.amazonaws.com';
const SES_PORT = '25439';

// The card grid can drop the first click while it is still mounting. Selecting a
// different card and coming back forces the grid to settle before we open the one
// we want — the same dance the default-config connector specs use.
const openConnectorCard = async (page: ScoutPage, cardSubj: string) => {
  await page.testSubj.click('createConnectorButton');
  await page.testSubj.locator(cardSubj).waitFor({ state: 'visible' });
  await page.testSubj.click('.index-card');
  const backBtn = page.testSubj.locator('create-connector-flyout-back-btn');
  await backBtn.waitFor({ state: 'visible' });
  await backBtn.click();
  await page.testSubj.click(cardSubj);
};

test.describe('Connector custom Kibana config', { tag: tags.stateful.classic }, () => {
  test.beforeEach(async ({ browserAuth, page, kbnUrl }) => {
    await browserAuth.loginAsAdmin();
    await page.goto(kbnUrl.get(CONNECTORS_APP_PATH));
  });

  test('email connector lists only the enabled services (Gmail + Amazon SES)', async ({ page }) => {
    await openConnectorCard(page, '.email-card');
    await page.testSubj.locator('nameInput').waitFor({ state: 'visible' });

    const options = page.testSubj.locator('emailServiceSelectInput').locator('option');
    await expect(options).toHaveCount(2);
    await expect(options).toHaveText(['Gmail', 'Amazon SES']);
  });

  test('email connector applies the AWS SES host/port from kibana config', async ({ page }) => {
    await openConnectorCard(page, '.email-card');
    await page.testSubj.locator('nameInput').waitFor({ state: 'visible' });

    await page.testSubj.locator('emailServiceSelectInput').selectOption('ses');

    await expect(page.testSubj.locator('emailHostInput')).toHaveValue(SES_HOST, {
      timeout: 10_000,
    });
    await expect(page.testSubj.locator('emailPortInput')).toHaveValue(SES_PORT);
    await expect(page.testSubj.locator('emailSecureSwitch')).toHaveAttribute(
      'aria-checked',
      'true'
    );
  });

  test('webhook connector hides the PFX cert tab when pfx is disabled', async ({ page }) => {
    await openConnectorCard(page, '.webhook-card');

    const authSSL = page.testSubj.locator('authSSL');
    await authSSL.waitFor({ state: 'visible' });
    await authSSL.click();

    const tabs = page.testSubj.locator('webhookCertTypeTabs').locator('.euiTab');
    await expect(tabs).toHaveCount(1);
    await expect(page.testSubj.locator('webhookCertTypeCRTab')).toBeVisible();
    await expect(page.testSubj.locator('webhookCertTypePFXTab')).toHaveCount(0);
  });
});
