/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags, type KibanaRole } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { spaceTest } from '../fixtures';

/**
 * Provides dashboards + data views so the analytics no-data page is skipped.
 */
const DASHBOARD_ARCHIVE =
  'src/platform/test/functional/fixtures/kbn_archiver/dashboard/current/kibana';

const dashboardRole: KibanaRole = {
  elasticsearch: {
    cluster: ['monitor'],
    indices: [{ names: ['*'], privileges: ['read'] }],
  },
  kibana: [
    {
      base: [],
      feature: {
        dashboard_v2: ['all'],
      },
      spaces: ['*'],
    },
  ],
};

spaceTest.describe('Custom content panel create flow', { tag: [...tags.stateful.classic] }, () => {
  spaceTest.beforeAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.cleanStandardList();
    await scoutSpace.savedObjects.load(DASHBOARD_ARCHIVE);
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginWithCustomRole(dashboardRole);
    await pageObjects.dashboard.openNewDashboard();
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.savedObjects.cleanStandardList();
  });

  spaceTest(
    'saves template and ES|QL query and renders HTML in the panel',
    async ({ pageObjects }) => {
      const { dashboard, customContentPanel } = pageObjects;

      await dashboard.openAddPanelFlyout();
      await customContentPanel.openFromAddPanelFlyout();

      await expect(customContentPanel.createFlyoutTitle).toBeVisible();

      await customContentPanel.setTemplate('<p id="greeting">{{ rows[0]["greeting"].value }}</p>');
      await customContentPanel.setEsqlQuery('ROW greeting = "hello"');
      await customContentPanel.applyAndClose();

      await expect(customContentPanel.panel).toBeVisible();
      const iframe = customContentPanel.getPanelIframe();
      await expect(iframe.locator('#greeting')).toHaveText('hello');
    }
  );

  spaceTest(
    'previews rendered content before saving, and re-previews after an edit',
    async ({ pageObjects }) => {
      const { dashboard, customContentPanel } = pageObjects;

      await dashboard.openAddPanelFlyout();
      await customContentPanel.openFromAddPanelFlyout();

      await customContentPanel.setTemplate(
        '<p id="preview-result">{{ rows[0]["greeting"].value }}</p>'
      );
      await customContentPanel.setEsqlQuery('ROW greeting = "hello"');

      await expect(customContentPanel.runPreviewButton).toBeEnabled();
      await customContentPanel.runPreview();

      const iframe = customContentPanel.getPanelIframe();
      await expect(iframe.locator('#preview-result')).toHaveText('hello');

      await expect(customContentPanel.runPreviewButton).toBeEnabled();

      await customContentPanel.setTemplate(
        '<p id="preview-result">{{ rows[0]["greeting"].value }}!</p>'
      );
      await customContentPanel.runPreview();
      await expect(iframe.locator('#preview-result')).toHaveText('hello!');
    }
  );

  spaceTest(
    'cancelling the flyout on a new panel removes it from the dashboard',
    async ({ pageObjects }) => {
      const { dashboard, customContentPanel } = pageObjects;

      await dashboard.openAddPanelFlyout();
      await customContentPanel.openFromAddPanelFlyout();

      await expect(customContentPanel.createFlyoutTitle).toBeVisible();

      await customContentPanel.cancel();

      await expect(customContentPanel.panel).toBeHidden();
    }
  );

  spaceTest('editing an existing panel updates its rendered content', async ({ pageObjects }) => {
    const { dashboard, customContentPanel } = pageObjects;

    await dashboard.openAddPanelFlyout();
    await customContentPanel.openFromAddPanelFlyout();
    await customContentPanel.setTemplate('<p id="v1">version one</p>');
    await customContentPanel.applyAndClose();

    await expect(customContentPanel.panel).toBeVisible();
    const iframe = customContentPanel.getPanelIframe();
    await expect(iframe.locator('#v1')).toHaveText('version one');

    await dashboard.clickPanelAction('embeddablePanelAction-editPanel');
    await expect(customContentPanel.editFlyoutTitle).toBeVisible();

    await customContentPanel.setTemplate('<p id="v2">version two</p>');
    await customContentPanel.applyAndClose();

    await expect(iframe.locator('#v2')).toHaveText('version two');
  });

  spaceTest(
    'cancelling the flyout on an existing panel does not remove it',
    async ({ pageObjects }) => {
      const { dashboard, customContentPanel } = pageObjects;

      await dashboard.openAddPanelFlyout();
      await customContentPanel.openFromAddPanelFlyout();
      await customContentPanel.setTemplate('<p>keep me</p>');
      await customContentPanel.applyAndClose();

      await expect(customContentPanel.panel).toBeVisible();

      await dashboard.clickPanelAction('embeddablePanelAction-editPanel');
      await expect(customContentPanel.editFlyoutTitle).toBeVisible();
      await customContentPanel.cancel();

      await expect(customContentPanel.panel).toBeVisible();
    }
  );
});
