/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { test, tags } from '@kbn/scout';
import fs from 'fs';
import os from 'os';

const defaultSettings = {
  defaultIndex: 'kibana_sample_data_logs',
  'dateFormat:tz': 'UTC',
};

// Shared across tests + afterEach cleanup; safe because Playwright runs tests in a file serially
let downloadedFilePath: string | null = null;

const selectAllKeys = process.platform === 'darwin' ? 'Meta+a' : 'Control+a';

// Tracks saved objects created during each test for afterEach cleanup
const createdArtifacts: Array<{ type: string; title?: string }> = [];

test.describe('Dashboard app', { tag: tags.stateful.classic }, () => {
  test.beforeAll(async ({ kbnClient, apiServices }) => {
    await apiServices.sampleData.install('logs');
    await kbnClient.uiSettings.update(defaultSettings);
  });

  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.dashboard.goto();
  });

  test.afterEach(async ({ kbnClient }) => {
    if (downloadedFilePath && fs.existsSync(downloadedFilePath)) {
      fs.unlinkSync(downloadedFilePath);
      downloadedFilePath = null;
    }

    if (createdArtifacts.length > 0) {
      const uniqueTypes = [...new Set(createdArtifacts.map((a) => a.type))];
      for (const type of uniqueTypes) {
        const response = await kbnClient.savedObjects.find<{ title: string }>({ type });
        const artifactsOfType = createdArtifacts.filter((a) => a.type === type);
        const cleanAll = artifactsOfType.some((a) => !a.title);

        const objectsToDelete = cleanAll
          ? response.saved_objects
          : response.saved_objects.filter((so) =>
              artifactsOfType.some((a) => a.title === so.attributes.title)
            );

        if (objectsToDelete.length > 0) {
          await kbnClient.savedObjects.bulkDelete({
            objects: objectsToDelete.map((so) => ({ type: so.type, id: so.id })),
          });
        }
      }
      createdArtifacts.length = 0;
    }
  });

  test.afterAll(async ({ kbnClient, apiServices }) => {
    await apiServices.sampleData.remove('logs');
    await kbnClient.savedObjects.cleanStandardList();
  });

  test('should create dashboard with ES|QL, Lens, and Custom visualization panels', async ({
    page,
    pageObjects,
  }) => {
    const dashboardName = 'Test Dashboard with Multiple Panels';
    createdArtifacts.push({ type: 'dashboard', title: dashboardName });

    await pageObjects.dashboard.openNewDashboard();

    await test.step('add ES|QL panel', async () => {
      await pageObjects.dashboard.addNewPanel('ES|QL');
      await pageObjects.dashboard.applyAndCloseESQLPanel();
      await expect(page.testSubj.locator('lnsVisualizationContainer')).toBeVisible();
    });

    await test.step('add Lens panel', async () => {
      await pageObjects.dashboard.addNewPanel('Lens');
      await pageObjects.lens.dragFieldToWorkspace('records');
      await pageObjects.lens.saveAndReturn();
      await expect(page.testSubj.locator('xyVisChart')).toBeVisible();
    });

    await test.step('add Custom visualization panel', async () => {
      await pageObjects.dashboard.addNewPanel('Custom visualization');
      await pageObjects.dashboard.clickVisualizeSaveAndReturn();
      await expect.poll(async () => await page.testSubj.locator('dashboardPanel').count()).toBe(3);
    });

    await pageObjects.dashboard.saveDashboard(dashboardName);
    const heading = page.testSubj.locator('breadcrumb last');
    await expect(heading).toHaveText('Editing ' + dashboardName);
  });

  test('should edit existing dashboard and add map and custom visualization panels', async ({
    page,
    pageObjects,
  }) => {
    const logsDashboardTitle = '[Logs] Web Traffic';

    await pageObjects.dashboard.clickDashboardTitleLink(logsDashboardTitle);
    await expect.poll(async () => await page.locator('.dshDashboardGrid__item').count()).toBe(12);

    await pageObjects.dashboard.switchToEditMode();

    await test.step('add a Map panel', async () => {
      await pageObjects.dashboard.addNewPanel('Maps');
      await pageObjects.maps.addDocumentsLayer('Kibana Sample Data Logs');
      await expect.poll(async () => await page.locator('.dshDashboardGrid__item').count()).toBe(13);
    });

    await test.step('add a Custom visualization panel', async () => {
      await pageObjects.dashboard.addNewPanel('Custom visualization');
      await pageObjects.dashboard.clickVisualizeSaveAndReturn();
      await expect.poll(async () => await page.locator('.dshDashboardGrid__item').count()).toBe(14);
    });

    await pageObjects.dashboard.saveChangesToExistingDashboard();
  });

  test('should duplicate an existing dashboard and preserve panels', async ({
    page,
    pageObjects,
  }) => {
    const logsDashboardTitle = '[Logs] Web Traffic';
    const duplicatedDashboardTitle = `${logsDashboardTitle} (1)`;
    createdArtifacts.push({ type: 'dashboard', title: duplicatedDashboardTitle });

    await pageObjects.dashboard.clickDashboardTitleLink(logsDashboardTitle);

    if (!(await pageObjects.dashboard.getIsInViewMode())) {
      await pageObjects.dashboard.clickCancelOutOfEditMode();
    }

    const originalPanelCount = await page.locator('.dshDashboardGrid__item').count();

    await pageObjects.dashboard.saveDashboard(duplicatedDashboardTitle);

    await pageObjects.dashboard.goto();

    await test.step('verify both dashboards exist in listing', async () => {
      const originalLink = page.testSubj.locator(
        `dashboardListingTitleLink-${logsDashboardTitle.split(' ').join('-')}`
      );
      const duplicatedLink = page.testSubj.locator(
        `dashboardListingTitleLink-${duplicatedDashboardTitle.split(' ').join('-')}`
      );
      await expect(originalLink).toBeVisible();
      await expect(duplicatedLink).toBeVisible();
    });

    await test.step('verify duplicated dashboard has same panels', async () => {
      await pageObjects.dashboard.clickDashboardTitleLink(duplicatedDashboardTitle);
      await expect
        .poll(async () => await page.locator('.dshDashboardGrid__item').count())
        .toBe(originalPanelCount);
    });
  });

  test('should add dashboard and URL link types to a dashboard', async ({ page, pageObjects }) => {
    const dashboardName = 'Test Dashboard with Links';
    createdArtifacts.push({ type: 'dashboard', title: dashboardName });

    await pageObjects.dashboard.openNewDashboard();

    await test.step('add a Links panel with dashboard and URL links', async () => {
      await pageObjects.dashboard.addNewPanel('Links');
      await pageObjects.dashboardLinks.expectPanelEditorFlyoutIsOpen();
      await pageObjects.dashboardLinks.addDashboardLink('[Logs] Web Traffic');
      await pageObjects.dashboardLinks.addExternalLink('https://www.elastic.co', {
        linkLabel: 'Elastic Website',
      });
      await pageObjects.dashboardLinks.clickPanelEditorSaveButton();
      await expect
        .poll(async () => await pageObjects.dashboardLinks.getNumberOfLinksInPanel())
        .toBe(2);
    });

    await pageObjects.dashboard.saveDashboard(dashboardName);
    const heading = page.testSubj.locator('breadcrumb last');
    await expect(heading).toHaveText('Editing ' + dashboardName);
  });

  test('should perform lens panel custom actions - explore in Discover', async ({
    page,
    pageObjects,
  }) => {
    const panelTitle = 'Test Lens Panel';
    const dashboardName = 'Test Dashboard Lens Panel Actions';
    createdArtifacts.push({ type: 'dashboard', title: dashboardName });
    createdArtifacts.push({ type: 'lens', title: 'Saved Lens Panel' });

    await pageObjects.dashboard.openNewDashboard();

    await test.step('add a Lens panel with a title', async () => {
      await pageObjects.dashboard.addNewPanel('Lens');
      await pageObjects.lens.dragFieldToWorkspace('records');
      await pageObjects.lens.saveAndReturn();

      await pageObjects.dashboard.openCustomizePanel();
      await pageObjects.dashboard.setCustomPanelTitle(panelTitle);
      await pageObjects.dashboard.saveCustomizePanel();
    });

    await pageObjects.dashboard.saveDashboard(dashboardName);

    await test.step('click Explore in Discover and validate navigation', async () => {
      const newPagePromise = page.context().waitForEvent('page');
      await pageObjects.dashboard.clickPanelAction(
        'embeddablePanelAction-ACTION_OPEN_IN_DISCOVER',
        panelTitle
      );
      const discoverPage = await newPagePromise;
      await discoverPage.waitForLoadState();
      await expect(discoverPage.locator('[data-test-subj="unifiedHistogramChart"]')).toBeVisible();
      await discoverPage.close();
    });

    await test.step('save panel to library', async () => {
      await pageObjects.dashboard.saveToLibrary('Saved Lens Panel', panelTitle);
    });
  });

  test('should enter and exit fullscreen mode', async ({ page, pageObjects }) => {
    const logsDashboardTitle = '[Logs] Web Traffic';

    await pageObjects.dashboard.clickDashboardTitleLink(logsDashboardTitle);

    if (!(await pageObjects.dashboard.getIsInViewMode())) {
      await pageObjects.dashboard.clickCancelOutOfEditMode();
    }

    await test.step('enter fullscreen', async () => {
      await page.testSubj.click('dashboardFullScreenMode');
      await expect(page.locator('.dshDashboardViewportWrapper--isFullscreen')).toBeVisible();
      await expect(page.testSubj.locator('exitFullScreenModeButton')).toBeVisible();
    });

    await test.step('exit fullscreen via Escape', async () => {
      await page.keyboard.press('Escape');
      await expect(page.locator('.dshDashboardViewportWrapper--isFullscreen')).toBeHidden();
      await expect(page.testSubj.locator('exitFullScreenModeButton')).toBeHidden();
    });
  });

  test('should update dashboard settings', async ({ page, pageObjects }) => {
    const logsDashboardTitle = '[Logs] Web Traffic';

    await pageObjects.dashboard.clickDashboardTitleLink(logsDashboardTitle);
    await pageObjects.dashboard.switchToEditMode();

    await pageObjects.dashboard.openSettingsFlyout();
    await expect(page.testSubj.locator('dashboardSettingsFlyout')).toBeVisible();

    const updatedTitle = '[Logs] Web Traffic Updated';

    await test.step('update title', async () => {
      const titleInput = page.testSubj.locator('dashboardTitleInput');
      await titleInput.fill(updatedTitle);
      await expect(titleInput).toHaveValue(updatedTitle);
    });

    await test.step('update description', async () => {
      const descriptionInput = page.testSubj.locator('dashboardDescriptionInput');
      await descriptionInput.fill('Updated description for testing');
      await expect(descriptionInput).toHaveValue('Updated description for testing');
    });

    await test.step('toggle store time with dashboard', async () => {
      const storeTimeSwitch = page.testSubj.locator('storeTimeWithDashboard');
      const wasChecked = (await storeTimeSwitch.getAttribute('aria-checked')) === 'true';
      await storeTimeSwitch.click();
      const expectedState = wasChecked ? 'false' : 'true';
      await expect(storeTimeSwitch).toHaveAttribute('aria-checked', expectedState);
    });

    await test.step('enable sync cursor and toggle sync tooltips', async () => {
      const syncCursorSwitch = page.testSubj.locator('dashboardSyncCursorCheckbox');
      const syncTooltipsSwitch = page.testSubj.locator('dashboardSyncTooltipsCheckbox');

      if ((await syncCursorSwitch.getAttribute('aria-checked')) !== 'true') {
        await syncCursorSwitch.click();
        await expect(syncCursorSwitch).toHaveAttribute('aria-checked', 'true');
      }

      await expect(syncTooltipsSwitch).toBeEnabled();
      const tooltipsWasChecked = (await syncTooltipsSwitch.getAttribute('aria-checked')) === 'true';
      await syncTooltipsSwitch.click();
      const expectedTooltipsState = tooltipsWasChecked ? 'false' : 'true';
      await expect(syncTooltipsSwitch).toHaveAttribute('aria-checked', expectedTooltipsState);
    });

    await pageObjects.dashboard.applyDashboardSettings();
    await expect(page.testSubj.locator('dashboardSettingsFlyout')).toBeHidden();

    await test.step('verify title updated in dashboard heading', async () => {
      const heading = page.locator('#dashboardTitle');
      await expect(heading).toContainText(updatedTitle);
    });
  });

  test('should open a dashboard in view mode and duplicate it', async ({ page, pageObjects }) => {
    const logsDashboardTitle = '[Logs] Web Traffic';
    const duplicatedTitle = '[Logs] Web Traffic Copy';
    createdArtifacts.push({ type: 'dashboard', title: duplicatedTitle });

    await pageObjects.dashboard.clickDashboardTitleLink(logsDashboardTitle);

    if (!(await pageObjects.dashboard.getIsInViewMode())) {
      await pageObjects.dashboard.clickCancelOutOfEditMode();
    }

    const originalPanelCount = await page.locator('.dshDashboardGrid__item').count();

    await pageObjects.dashboard.saveDashboard(duplicatedTitle);

    await pageObjects.dashboard.goto();

    await test.step('verify both original and duplicate exist in listing', async () => {
      const originalLink = page.testSubj.locator(
        `dashboardListingTitleLink-${logsDashboardTitle.split(' ').join('-')}`
      );
      const duplicateLink = page.testSubj.locator(
        `dashboardListingTitleLink-${duplicatedTitle.split(' ').join('-')}`
      );
      await expect(originalLink).toBeVisible();
      await expect(duplicateLink).toBeVisible();
    });

    await test.step('verify duplicate has same panel count', async () => {
      await pageObjects.dashboard.clickDashboardTitleLink(duplicatedTitle);
      await expect
        .poll(async () => await page.locator('.dshDashboardGrid__item').count())
        .toBe(originalPanelCount);
    });
  });

  for (const format of ['PDF', 'PNG'] as const) {
    test(`should export dashboard as ${format} and download the report`, async ({
      page,
      pageObjects,
    }) => {
      const logsDashboardTitle = '[Logs] Web Traffic';

      await pageObjects.dashboard.clickDashboardTitleLink(logsDashboardTitle);

      if (!(await pageObjects.dashboard.getIsInViewMode())) {
        await pageObjects.dashboard.clickCancelOutOfEditMode();
      }

      await test.step(`trigger ${format} export from share menu`, async () => {
        await page.testSubj.click('exportTopNavButton');
        await expect(page.testSubj.locator(`exportMenuItem-${format}`)).toBeVisible();
        await page.testSubj.click(`exportMenuItem-${format}`);
        await expect(page.testSubj.locator('exportItemDetailsFlyout')).toBeVisible();
        await page.testSubj.click('generateReportButton');
      });

      await test.step('wait for report to be queued', async () => {
        await expect(page.testSubj.locator('queueReportSuccess')).toBeVisible({
          timeout: 60_000,
        });
      });

      await test.step('wait for report completion and download', async () => {
        const downloadButton = page.testSubj.locator('downloadCompletedReportButton');
        await expect(downloadButton).toBeVisible({ timeout: 120_000 });

        const downloadPromise = page.waitForEvent('download');
        await downloadButton.click();
        const download = await downloadPromise;

        downloadedFilePath = `${os.tmpdir()}/${download.suggestedFilename()}`;
        await download.saveAs(downloadedFilePath);

        expect(fs.existsSync(downloadedFilePath)).toBe(true);
        const stats = fs.statSync(downloadedFilePath);
        expect(stats.size).toBeGreaterThan(0);
      });
    });
  }

  test('should maximize a panel', async ({ page, pageObjects }) => {
    const logsDashboardTitle = '[Logs] Web Traffic';

    await pageObjects.dashboard.clickDashboardTitleLink(logsDashboardTitle);

    if (!(await pageObjects.dashboard.getIsInViewMode())) {
      await pageObjects.dashboard.clickCancelOutOfEditMode();
    }

    const panels = page.locator('.embPanel__hoverActionsAnchor');
    const panelCount = await panels.count();
    expect(panelCount).toBeGreaterThan(0);
    const randomIndex = Math.floor(Math.random() * panelCount);
    const selectedPanel = panels.nth(randomIndex);

    await test.step('maximize a random panel', async () => {
      await selectedPanel.scrollIntoViewIfNeeded();
      await selectedPanel.hover();
      const toggleAction = selectedPanel.locator(
        '[data-test-subj="embeddablePanelAction-togglePanel"]'
      );
      if (await toggleAction.isVisible()) {
        await toggleAction.click();
      } else {
        const menuIcon = selectedPanel.locator('[data-test-subj="embeddablePanelToggleMenuIcon"]');
        await menuIcon.click();
        await page.testSubj.click('embeddablePanelAction-togglePanel');
      }
      await expect(page.locator('.dshLayout-isMaximizedPanel')).toBeVisible();
    });
  });

  test('should display created by for a newly created dashboard', async ({ page, pageObjects }) => {
    const dashboardName = 'Created By Test Dashboard';
    createdArtifacts.push({ type: 'dashboard', title: dashboardName });

    await test.step('create and save a new dashboard', async () => {
      await pageObjects.dashboard.openNewDashboard();
      await pageObjects.dashboard.saveDashboard(dashboardName);
    });

    await test.step('navigate back to dashboard listing', async () => {
      await pageObjects.dashboard.goto();
    });

    await test.step('verify created by column is visible', async () => {
      const createdByHeader = page.testSubj
        .locator('userFilterPopoverButton')
        .filter({ hasText: 'Created by' });
      await expect(createdByHeader).toBeVisible();
    });

    await test.step('verify the new dashboard row shows the creator avatar', async () => {
      const dashboardRow = page.testSubj
        .locator(`dashboardListingTitleLink-${dashboardName.split(' ').join('-')}`)
        .locator('xpath=ancestor::tr');
      await expect(dashboardRow).toBeVisible();

      const creatorAvatar = dashboardRow.locator('[data-test-subj="userAvatarTip-elastic_admin"]');
      await expect(creatorAvatar).toBeVisible();
    });
  });

  test('should add panels from library to dashboard', async ({ page, pageObjects }) => {
    createdArtifacts.push({ type: 'lens', title: 'Lib Lens Panel' });
    createdArtifacts.push({ type: 'dashboard', title: 'Dashboard with Library Panels' });
    createdArtifacts.push({ type: 'dashboard', title: 'Dashboard from Library' });

    await test.step('save a lens panel to the library', async () => {
      await pageObjects.dashboard.openNewDashboard();
      await pageObjects.dashboard.addNewPanel('Lens');
      await pageObjects.lens.dragFieldToWorkspace('records');
      await pageObjects.lens.saveAndReturn();

      await pageObjects.dashboard.openCustomizePanel();
      await pageObjects.dashboard.setCustomPanelTitle('Lib Lens Panel');
      await pageObjects.dashboard.saveCustomizePanel();
      await pageObjects.dashboard.saveToLibrary('Lib Lens Panel', 'Lib Lens Panel');
      await pageObjects.dashboard.saveDashboard('Dashboard with Library Panels');
    });

    await test.step('add the library panel to a new dashboard', async () => {
      await pageObjects.dashboard.goto();
      await pageObjects.dashboard.openNewDashboard();
      await pageObjects.dashboard.addPanelFromLibrary('Lib Lens Panel');
      await expect.poll(async () => await page.testSubj.locator('dashboardPanel').count()).toBe(1);
      await page.testSubj.click('euiFlyoutCloseButton');
    });

    await test.step('verify the panel is linked to the library', async () => {
      await pageObjects.dashboard.expectLinkedToLibrary('Lib Lens Panel');
    });

    await pageObjects.dashboard.saveDashboard('Dashboard from Library');
  });

  test('should add a URL drilldown to a lens panel', async ({ page, pageObjects }) => {
    const panelTitle = 'Drilldown Test Panel';
    const dashboardName = 'Test Dashboard Drilldown';
    createdArtifacts.push({ type: 'dashboard', title: dashboardName });

    await pageObjects.dashboard.openNewDashboard();

    await test.step('create a Lens panel with a title', async () => {
      await pageObjects.dashboard.addNewPanel('Lens');
      await pageObjects.lens.dragFieldToWorkspace('records');
      await pageObjects.lens.saveAndReturn();

      await pageObjects.dashboard.openCustomizePanel();
      await pageObjects.dashboard.setCustomPanelTitle(panelTitle);
      await pageObjects.dashboard.saveCustomizePanel();
    });

    await pageObjects.dashboard.saveDashboard(dashboardName);

    await test.step('open drilldown creation flyout', async () => {
      await pageObjects.dashboard.clickPanelAction(
        'embeddablePanelAction-OPEN_FLYOUT_ADD_DRILLDOWN',
        panelTitle
      );
      await expect(page.testSubj.locator('createDrilldownFlyout')).toBeVisible();
    });

    await test.step('create a URL drilldown', async () => {
      await page.testSubj.click('drilldownFactoryItem-url_drilldown');
      await page.testSubj.locator('drilldownNameInput').fill('Go to Elastic');

      const monacoEditor = page.locator(
        '[data-test-subj="url-template-editor-container"] .monaco-editor'
      );
      await monacoEditor.click();
      await page.keyboard.press(selectAllKeys);
      await page.keyboard.type('https://www.elastic.co');

      await page.testSubj.click('drilldownWizardSubmit');
      await expect(page.testSubj.locator('createDrilldownFlyout')).toBeHidden();
    });
  });
});
