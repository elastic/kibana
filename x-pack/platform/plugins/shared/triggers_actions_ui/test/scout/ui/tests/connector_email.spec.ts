/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Migrated from: x-pack/platform/test/functional_with_es_ssl/apps/triggers_actions_ui/email.ts
//
// Test 1 (ses defaults) uses EuiSelect (native <select>) — selectOption() works.
// Tests 2-6 (recipient validation) create a connector via API and exercise the
// test tab's To/Cc/Bcc validation logic.

import type { KbnClient, ScoutPage } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test, CONNECTORS_APP_PATH, CONNECTORS_LIST_SELECTORS } from '../fixtures';

const createEmailConnector = async (kbnClient: KbnClient, name: string) => {
  const resp = await kbnClient.request<{ id: string }>({
    method: 'POST',
    path: '/api/actions/connector',
    headers: { 'kbn-xsrf': 'scout' },
    body: {
      name,
      connector_type_id: '.email',
      config: { service: '__json', from: 'me@example.com', hasAuth: false },
      secrets: {},
    },
  });
  return resp.data;
};

const deleteConnector = async (kbnClient: KbnClient, id: string) => {
  await kbnClient.request({
    method: 'DELETE',
    path: `/api/actions/connector/${id}`,
    headers: { 'kbn-xsrf': 'scout' },
  });
};

const openTestTab = async (page: ScoutPage, connectorName: string) => {
  const searchBox = page.locator(CONNECTORS_LIST_SELECTORS.SEARCH_INPUT);
  await searchBox.fill(connectorName);
  await searchBox.press('Enter');
  await page.locator(CONNECTORS_LIST_SELECTORS.TABLE_LOADED).waitFor();
  await page.locator('[data-test-subj="connectorsTableCell-name"] button').click();
  await page.testSubj.click('testConnectorTab');
  await page.testSubj.locator('test-connector-form').waitFor({ state: 'visible' });
};

const fillSubjectAndMessage = async (page: ScoutPage) => {
  await page.testSubj.locator('subjectInput').fill('test subject');
  await page.testSubj.locator('messageTextArea').fill('test message');
};

const closeFlyout = async (page: ScoutPage) => {
  await page.testSubj.click('edit-connector-flyout-close-btn');
  const confirmBtn = page.testSubj.locator('confirmModalConfirmButton');
  if (await confirmBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await confirmBtn.click();
  }
  await expect(page.testSubj.locator('edit-connector-flyout-close-btn')).toBeHidden();
};

test.describe('Email connector', { tag: tags.stateful.classic }, () => {
  test('should use the kibana config for aws ses defaults', async ({
    browserAuth,
    page,
    kbnUrl,
  }) => {
    await browserAuth.loginAsAdmin();
    await page.goto(kbnUrl.get(CONNECTORS_APP_PATH));
    await page.locator(CONNECTORS_LIST_SELECTORS.TABLE_LOADED).waitFor();

    await page.testSubj.click('createConnectorButton');
    await page.testSubj.click('.email-card');
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

    await page.testSubj.click('euiFlyoutCloseButton');
  });

  test('disables Run and shows recipients-required error when To/Cc/Bcc are all empty', async ({
    browserAuth,
    page,
    kbnUrl,
    kbnClient,
  }) => {
    await browserAuth.loginAsAdmin();
    const connectorName = `scout-email-${Date.now()}`;
    const { id: connectorId } = await createEmailConnector(kbnClient, connectorName);

    try {
      await page.goto(kbnUrl.get(CONNECTORS_APP_PATH));
      await page.locator(CONNECTORS_LIST_SELECTORS.TABLE_LOADED).waitFor();
      await openTestTab(page, connectorName);
      await fillSubjectAndMessage(page);

      // Touch and blur the To combobox to surface the field-level error
      await page.testSubj.locator('toEmailAddressInput').locator('input').click();
      await page.testSubj.click('edit-connector-flyout-header');

      await expect(page.locator('.euiFormErrorText')).toContainText(
        'At least one recipient is required.'
      );
      await expect(page.testSubj.locator('executeActionButton')).toBeDisabled();

      await closeFlyout(page);
    } finally {
      await deleteConnector(kbnClient, connectorId);
    }
  });

  test('disables Run when the only To entry is whitespace', async ({
    browserAuth,
    page,
    kbnUrl,
    kbnClient,
  }) => {
    await browserAuth.loginAsAdmin();
    const connectorName = `scout-email-${Date.now()}`;
    const { id: connectorId } = await createEmailConnector(kbnClient, connectorName);

    try {
      await page.goto(kbnUrl.get(CONNECTORS_APP_PATH));
      await page.locator(CONNECTORS_LIST_SELECTORS.TABLE_LOADED).waitFor();
      await openTestTab(page, connectorName);
      await fillSubjectAndMessage(page);

      const toInput = page.testSubj.locator('toEmailAddressInput').locator('input');
      await toInput.fill('   ');
      await toInput.press('Enter');
      await page.testSubj.click('edit-connector-flyout-header');

      await expect(page.locator('.euiFormErrorText')).toContainText(
        'At least one recipient is required.'
      );
      await expect(page.testSubj.locator('executeActionButton')).toBeDisabled();

      await closeFlyout(page);
    } finally {
      await deleteConnector(kbnClient, connectorId);
    }
  });

  test('shows invalid email error for address with leading hyphen in local part', async ({
    browserAuth,
    page,
    kbnUrl,
    kbnClient,
  }) => {
    await browserAuth.loginAsAdmin();
    const connectorName = `scout-email-${Date.now()}`;
    const { id: connectorId } = await createEmailConnector(kbnClient, connectorName);

    try {
      await page.goto(kbnUrl.get(CONNECTORS_APP_PATH));
      await page.locator(CONNECTORS_LIST_SELECTORS.TABLE_LOADED).waitFor();
      await openTestTab(page, connectorName);
      await fillSubjectAndMessage(page);

      const toInput = page.testSubj.locator('toEmailAddressInput').locator('input');
      await toInput.fill('-user@example.com');
      await toInput.press('Enter');
      await page.testSubj.click('edit-connector-flyout-header');

      await expect(page.locator('.euiFormErrorText')).toContainText('is not valid');

      await closeFlyout(page);
    } finally {
      await deleteConnector(kbnClient, connectorId);
    }
  });

  test('shows invalid email error for address with leading hyphen in domain', async ({
    browserAuth,
    page,
    kbnUrl,
    kbnClient,
  }) => {
    await browserAuth.loginAsAdmin();
    const connectorName = `scout-email-${Date.now()}`;
    const { id: connectorId } = await createEmailConnector(kbnClient, connectorName);

    try {
      await page.goto(kbnUrl.get(CONNECTORS_APP_PATH));
      await page.locator(CONNECTORS_LIST_SELECTORS.TABLE_LOADED).waitFor();
      await openTestTab(page, connectorName);
      await fillSubjectAndMessage(page);

      const toInput = page.testSubj.locator('toEmailAddressInput').locator('input');
      await toInput.fill('user@-example.com');
      await toInput.press('Enter');
      await page.testSubj.click('edit-connector-flyout-header');

      await expect(page.locator('.euiFormErrorText')).toContainText('is not valid');

      await closeFlyout(page);
    } finally {
      await deleteConnector(kbnClient, connectorId);
    }
  });

  test('clears recipients-required error when only Cc has a valid recipient', async ({
    browserAuth,
    page,
    kbnUrl,
    kbnClient,
  }) => {
    await browserAuth.loginAsAdmin();
    const connectorName = `scout-email-${Date.now()}`;
    const { id: connectorId } = await createEmailConnector(kbnClient, connectorName);

    try {
      await page.goto(kbnUrl.get(CONNECTORS_APP_PATH));
      await page.locator(CONNECTORS_LIST_SELECTORS.TABLE_LOADED).waitFor();
      await openTestTab(page, connectorName);
      await fillSubjectAndMessage(page);

      // Trigger the recipients-required error
      await page.testSubj.locator('toEmailAddressInput').locator('input').click();
      await page.testSubj.click('edit-connector-flyout-header');
      await expect(page.locator('.euiFormErrorText')).toContainText(
        'At least one recipient is required.'
      );

      // Adding a valid Cc address must clear the error from all fields
      await page.testSubj.click('emailAddCcButton');
      const ccInput = page.testSubj.locator('ccEmailAddressInput').locator('input');
      await ccInput.fill('cc@example.com');
      await ccInput.press('Enter');

      await expect(
        page.locator('.euiFormErrorText', { hasText: 'At least one recipient is required.' })
      ).toHaveCount(0);

      await closeFlyout(page);
    } finally {
      await deleteConnector(kbnClient, connectorId);
    }
  });
});
