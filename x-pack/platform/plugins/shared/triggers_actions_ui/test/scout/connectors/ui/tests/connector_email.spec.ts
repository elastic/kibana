/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiServicesFixture, ScoutPage } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import {
  test,
  CONNECTORS_ROLE,
  navigateToConnectors,
  searchAndOpenConnector,
  closeFlyoutIfOpen,
} from '../fixtures';

const openTestTab = async (page: ScoutPage, connectorName: string) => {
  await searchAndOpenConnector(page, connectorName);
  // The flyout header renders immediately from props, but its body's ConnectorForm
  // mounts and lazy-loads afterwards. Switching tabs while the body is still in that
  // transitional state can leave the Test tab content from rendering. Wait for the
  // configuration form to be fully loaded (its nameInput) before switching tabs.
  await page.testSubj.locator('nameInput').waitFor({ state: 'visible' });
  await page.testSubj.click('testConnectorTab');
  await page.testSubj.locator('test-connector-form').waitFor({ state: 'visible' });
};

const waitForTestModeForm = async (page: ScoutPage) => {
  // Test mode hides subject/message and shows a fixed-content callout instead.
  await page.testSubj.locator('emailTestModeFixedMessageCallout').waitFor({ state: 'visible' });
};

test.describe('Email connector', { tag: tags.stateful.classic }, () => {
  const createdConnectorIds: string[] = [];

  const createEmailConnector = async (apiServices: ApiServicesFixture, name: string) => {
    const connector = await apiServices.alerting.connectors.create({
      name,
      connectorTypeId: '.email',
      config: { service: '__json', from: 'me@example.com', hasAuth: false },
      secrets: {},
    });
    createdConnectorIds.push(connector.id);
    return connector;
  };

  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginWithCustomRole(CONNECTORS_ROLE);
  });

  test.afterEach(async ({ page, apiServices }) => {
    await closeFlyoutIfOpen(page);
    await Promise.allSettled(
      createdConnectorIds.map((id) => apiServices.alerting.connectors.delete(id))
    );
    createdConnectorIds.length = 0;
  });

  test('should use the kibana config for aws ses defaults', async ({ page, kbnUrl }) => {
    await navigateToConnectors(page, kbnUrl);

    await page.testSubj.click('createConnectorButton');
    await page.testSubj.locator('.email-card').waitFor({ state: 'visible' });
    await page.testSubj.click('.index-card');
    const backBtn = page.testSubj.locator('create-connector-flyout-back-btn');
    await backBtn.waitFor({ state: 'visible' });
    await backBtn.click();
    await page.testSubj.click('.email-card');
    await page.testSubj.locator('nameInput').waitFor({ state: 'visible' });
    await page.testSubj.locator('emailServiceSelectInput').selectOption('ses');

    await expect(page.testSubj.locator('emailHostInput')).toHaveValue(
      'email-smtp.us-east-1.amazonaws.com',
      { timeout: 10_000 }
    );
    await expect(page.testSubj.locator('emailPortInput')).toHaveValue('465');
    await expect(page.testSubj.locator('emailSecureSwitch')).toHaveAttribute(
      'aria-checked',
      'true'
    );
  });

  test('validates the To/Cc/Bcc recipients field on the test tab', async ({
    page,
    kbnUrl,
    apiServices,
  }) => {
    const connectorName = `scout-email-${Date.now()}`;
    await createEmailConnector(apiServices, connectorName);
    await navigateToConnectors(page, kbnUrl);

    const reopenTestTab = async () => {
      await closeFlyoutIfOpen(page);
      await openTestTab(page, connectorName);
      await waitForTestModeForm(page);
    };

    await test.step('disables Run and shows recipients-required error when To/Cc/Bcc are all empty', async () => {
      await reopenTestTab();

      // Touch and blur the To combobox to surface the field-level error
      await page.testSubj.locator('toEmailAddressInput').locator('input').click();
      await page.testSubj.click('edit-connector-flyout-header');

      await expect(
        page.testSubj.locator('test-connector-form').locator('.euiFormErrorText')
      ).toContainText('At least one recipient is required.');
      await expect(page.testSubj.locator('executeActionButton')).toBeDisabled();
    });

    await test.step('disables Run when the only To entry is whitespace', async () => {
      await reopenTestTab();

      const toInput = page.testSubj.locator('toEmailAddressInput').locator('input');
      await toInput.fill('   ');
      await toInput.press('Enter');
      await page.testSubj.click('edit-connector-flyout-header');

      await expect(
        page.testSubj.locator('test-connector-form').locator('.euiFormErrorText')
      ).toContainText('At least one recipient is required.');
      await expect(page.testSubj.locator('executeActionButton')).toBeDisabled();
    });

    await test.step('shows invalid email error for address with leading hyphen in local part', async () => {
      await reopenTestTab();

      const toInput = page.testSubj.locator('toEmailAddressInput').locator('input');
      await toInput.fill('-user@example.com');
      await toInput.press('Enter');
      await page.testSubj.click('edit-connector-flyout-header');

      await expect(
        page.testSubj.locator('test-connector-form').locator('.euiFormErrorText')
      ).toContainText('is not valid');
    });

    await test.step('shows invalid email error for address with leading hyphen in domain', async () => {
      await reopenTestTab();

      const toInput = page.testSubj.locator('toEmailAddressInput').locator('input');
      await toInput.fill('user@-example.com');
      await toInput.press('Enter');
      await page.testSubj.click('edit-connector-flyout-header');

      await expect(
        page.testSubj.locator('test-connector-form').locator('.euiFormErrorText')
      ).toContainText('is not valid');
    });

    await test.step('clears recipients-required error when only Cc has a valid recipient', async () => {
      await reopenTestTab();

      // Trigger the recipients-required error
      await page.testSubj.locator('toEmailAddressInput').locator('input').click();
      await page.testSubj.click('edit-connector-flyout-header');

      await expect(
        page.testSubj.locator('test-connector-form').locator('.euiFormErrorText')
      ).toContainText('At least one recipient is required.');

      // Adding a valid Cc address must clear the error from all fields
      await page.testSubj.click('emailAddCcButton');
      const ccInput = page.testSubj.locator('ccEmailAddressInput').locator('input');
      await ccInput.fill('cc@example.com');
      await ccInput.press('Enter');

      await expect(
        page.testSubj
          .locator('test-connector-form')
          .locator('.euiFormErrorText', { hasText: 'At least one recipient is required.' })
      ).toHaveCount(0);
    });
  });
});
