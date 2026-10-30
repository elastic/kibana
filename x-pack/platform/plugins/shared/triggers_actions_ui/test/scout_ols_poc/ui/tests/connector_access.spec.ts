/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'node:crypto';
import type { KibanaRole, KibanaUrl, ScoutPage } from '@kbn/scout';
import { test } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

const CONNECTORS_APP_PATH = '/app/management/insightsAndAlerting/triggersActionsConnectors';
const TABLE_LOADED = '.euiBasicTable[data-test-subj="actionsTable"]:not(.euiBasicTable-loading)';
const API_HEADERS = { 'kbn-xsrf': 'scout', 'x-elastic-internal-origin': 'kibana' };

// Same connector privileges as the owner: only the connector's ACL separates them.
const GRANTEE_ROLE: KibanaRole = {
  elasticsearch: { cluster: [], indices: [] },
  kibana: [{ base: [], feature: { actions: ['all'] }, spaces: ['*'] }],
};

interface Person {
  uid: string;
  displayName: string;
}

const openConnectorsList = async (page: ScoutPage, kbnUrl: KibanaUrl, name: string) => {
  await page.goto(kbnUrl.get(CONNECTORS_APP_PATH));
  await page.locator(TABLE_LOADED).waitFor();
  const search = page.testSubj.locator('actionsList').getByRole('searchbox');
  await search.fill(name);
  await search.press('Enter');
  await page.locator(TABLE_LOADED).waitFor();
};

const openConnector = async (page: ScoutPage, kbnUrl: KibanaUrl, name: string) => {
  await openConnectorsList(page, kbnUrl, name);
  await page
    .locator('[data-test-subj="connectorsTableCell-name"] button', { hasText: name })
    .click();
  await page.testSubj.locator('edit-connector-flyout-header').waitFor();
};

const openAccessTab = async (page: ScoutPage) => {
  await page.testSubj.click('accessConnectorTab');
  await expect(page.testSubj.locator('accessPanel')).toBeVisible();
};

const pickPerson = async (page: ScoutPage, picker: string, person: Person) => {
  await page.testSubj.locator(picker).locator('input').fill(person.displayName);
  await page.testSubj.click(`${picker}Option-${person.uid}`);
};

const selectGeneralAccess = async (page: ScoutPage, level: 'none' | 'use' | 'edit') => {
  await page.testSubj.click('accessPanelGeneralAccess');
  await page.testSubj.click(`accessPanelGeneralAccessOption-${level}`);
};

test.describe.serial('Connector access', { tag: '@local-stateful-classic' }, () => {
  // Every connector this suite creates starts with the prefix, so that one search finds them all.
  const prefix = `ols-ui-${randomUUID().slice(0, 8)}`;
  const connectorName = `${prefix}-shared`;
  const publicName = `${prefix}-public`;
  let connectorId: string;
  let ownerHeaders: Record<string, string>;
  let granteeHeaders: Record<string, string>;
  let grantee: Person;

  test.beforeAll(async ({ apiClient, samlAuth }) => {
    ownerHeaders = { ...API_HEADERS, ...(await samlAuth.asInteractiveUser('editor')).cookieHeader };
    const created = await apiClient.post('api/actions/connector', {
      headers: ownerHeaders,
      body: { name: connectorName, connector_type_id: '.server-log', config: {}, secrets: {} },
      responseType: 'json',
    });
    expect(created.statusCode).toBe(200);
    connectorId = created.body.id;
    await apiClient.post('api/actions/connector', {
      headers: ownerHeaders,
      body: { name: publicName, connector_type_id: '.server-log', config: {}, secrets: {} },
    });

    // Activates the grantee's profile, so that it appears in the people picker.
    await samlAuth.setCustomRole(GRANTEE_ROLE);
    const granteeData = await samlAuth.session.getUserData(samlAuth.customRoleName);
    granteeHeaders = {
      ...API_HEADERS,
      ...(await samlAuth.asInteractiveUser(GRANTEE_ROLE)).cookieHeader,
    };
    const profile = await apiClient.get('internal/security/user_profile', {
      headers: granteeHeaders,
      responseType: 'json',
    });
    grantee = {
      uid: profile.body.uid,
      displayName: granteeData.full_name || granteeData.email || granteeData.username,
    };
  });

  test.afterAll(async ({ apiClient }) => {
    // The suite ends with the grantee owning the shared connector, so both delete what they own.
    for (const headers of [ownerHeaders, granteeHeaders]) {
      const { body } = await apiClient.get('api/actions/connectors', {
        headers,
        responseType: 'json',
      });
      for (const { id, name } of body as Array<{ id: string; name: string }>) {
        if (name.startsWith(prefix)) {
          await apiClient.delete(`api/actions/connector/${id}`, { headers });
        }
      }
    }
  });

  test('the owner restricts a connector to a person who can run it', async ({
    page,
    browserAuth,
    kbnUrl,
  }) => {
    await browserAuth.loginAsPrivilegedUser();
    await openConnector(page, kbnUrl, connectorName);
    await openAccessTab(page);

    await expect(page.testSubj.locator('accessPanelOwner')).toContainText('(you)');
    // The configuration Save button belongs to the configuration, not to access.
    await expect(page.testSubj.locator('edit-connector-flyout-save-btn')).toHaveCount(0);

    await selectGeneralAccess(page, 'none');
    await pickPerson(page, 'accessPanelPrincipalPicker', grantee);
    await expect(page.testSubj.locator(`accessPanelEntry-${grantee.uid}`)).toContainText('Can run');

    await page.testSubj.click('accessPanelSave');
    await expect(page.getByText('Access saved.')).toBeVisible();
    await expect(page.testSubj.locator('accessPanelSave')).toBeDisabled();
  });

  test('the grantee can run the connector, but not edit it or its access', async ({
    page,
    browserAuth,
    kbnUrl,
  }) => {
    await browserAuth.loginWithCustomRole(GRANTEE_ROLE);
    await openConnector(page, kbnUrl, connectorName);

    await expect(page.testSubj.locator('connectorReadOnlyAccessCallout')).toBeVisible();
    await expect(page.testSubj.locator('edit-connector-flyout-save-btn')).toHaveCount(0);
    await expect(page.testSubj.locator('testConnectorTab')).toBeVisible();

    await openAccessTab(page);
    await expect(page.testSubj.locator('accessPanelReadOnly')).toBeVisible();
    await expect(page.testSubj.locator('accessPanelPermission-use')).toContainText('Run and test');
    await expect(page.testSubj.locator('accessPanelPrincipalPicker')).toHaveCount(0);
  });

  test('people without access see only public connectors', async ({
    page,
    browserAuth,
    kbnUrl,
  }) => {
    await browserAuth.loginAsViewer();
    await openConnectorsList(page, kbnUrl, prefix);

    const names = page.testSubj.locator('connectorsTableCell-name');
    await expect(names.filter({ hasText: publicName })).toHaveCount(1);
    await expect(names.filter({ hasText: connectorName })).toHaveCount(0);
  });

  test('stale access changes show a conflict that a reload resolves', async ({
    page,
    browserAuth,
    kbnUrl,
    apiClient,
  }) => {
    await browserAuth.loginAsPrivilegedUser();
    await openConnector(page, kbnUrl, connectorName);
    await openAccessTab(page);

    // Someone else changes access while the panel is open.
    const accessPath = `internal/security/access_control/action/${connectorId}`;
    const state = await apiClient.get(accessPath, { headers: ownerHeaders, responseType: 'json' });
    const changed = await apiClient.put(accessPath, {
      headers: ownerHeaders,
      body: { version: state.body.version, general_access: 'use', entries: [] },
      responseType: 'json',
    });
    expect(changed.statusCode).toBe(200);

    await selectGeneralAccess(page, 'edit');
    await page.testSubj.click('accessPanelSave');
    await expect(page.testSubj.locator('accessPanelConflict')).toBeVisible();

    await page.testSubj.click('accessPanelConflictReload');
    await expect(page.testSubj.locator('accessPanelConflict')).toHaveCount(0);
    await expect(page.testSubj.locator('accessPanelGeneralAccess')).toContainText(
      'Everyone in this space can run'
    );
  });

  test('the owner creates a private connector in one step', async ({
    page,
    browserAuth,
    kbnUrl,
    apiClient,
    samlAuth,
  }) => {
    const name = `${prefix}-private`;
    await browserAuth.loginAsPrivilegedUser();
    await page.goto(kbnUrl.get(CONNECTORS_APP_PATH));
    await page.testSubj.click('createConnectorButton');
    await page.testSubj.click('.server-log-card');
    await page.testSubj.fill('nameInput', name);

    await page.testSubj
      .locator('connectorAccessSection')
      .getByRole('button', { name: /^Access/, expanded: false })
      .click();
    await selectGeneralAccess(page, 'none');
    await page.testSubj.click('create-connector-flyout-save-btn');
    await expect(page.getByText(`Created '${name}'`)).toBeVisible();

    const viewerHeaders = {
      ...API_HEADERS,
      ...(await samlAuth.asInteractiveUser('viewer')).cookieHeader,
    };
    const list = await apiClient.get('api/actions/connectors', {
      headers: viewerHeaders,
      responseType: 'json',
    });
    expect(
      (list.body as Array<{ name: string }>).some((connector) => connector.name === name)
    ).toBe(false);
  });

  test('a recovery administrator manages access to a connector it cannot edit', async ({
    page,
    browserAuth,
    kbnUrl,
    apiClient,
  }) => {
    const accessPath = `internal/security/access_control/action/${connectorId}`;
    const state = await apiClient.get(accessPath, { headers: ownerHeaders, responseType: 'json' });
    await apiClient.put(accessPath, {
      headers: ownerHeaders,
      body: { version: state.body.version, general_access: 'none', entries: [] },
    });

    await browserAuth.loginAsAdmin();
    await openConnector(page, kbnUrl, connectorName);
    await expect(page.testSubj.locator('connectorReadOnlyAccessCallout')).toBeVisible();

    await openAccessTab(page);
    await expect(page.testSubj.locator('accessPanelRecovery')).toBeVisible();

    await page.testSubj.click('accessPanelTransfer');
    await pickPerson(page, 'accessPanelTransferPicker', grantee);
    await page.testSubj.click('accessPanelTransferConfirm');
    await expect(page.getByText('Ownership transferred.')).toBeVisible();
    await expect(page.testSubj.locator('accessPanelOwner')).toContainText(grantee.displayName);
  });
});
