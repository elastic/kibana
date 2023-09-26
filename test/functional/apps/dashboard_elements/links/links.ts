/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const browser = getService('browser');
  const find = getService('find');
  const retry = getService('retry');
  const esArchiver = getService('esArchiver');
  const security = getService('security');
  const queryBar = getService('queryBar');
  const filterBar = getService('filterBar');
  const testSubjects = getService('testSubjects');
  const kibanaServer = getService('kibanaServer');
  const dashboardAddPanel = getService('dashboardAddPanel');
  const dashboardPanelActions = getService('dashboardPanelActions');
  const deployment = getService('deployment');
  const comboBox = getService('comboBox');
  const PageObjects = getPageObjects([
    'dashboardControls',
    'dashboard',
    'common',
    'header',
    'timePicker',
  ]);

  // TODO much of this could be added to a new PageObjects

  async function addExternalLink(
    destination: string,
    openInNewTab: boolean = true,
    encodeUrl: boolean = true,
    linkLabel?: string
  ) {
    await testSubjects.click('links--panelEditor--addLinkBtn');
    await testSubjects.exists('links--linkEditor--flyout');
    const option = await testSubjects.find('links--linkEditor--externalLink--radioBtn');
    const label = await option.findByCssSelector('label[for="externalLink"]');
    await label.click();
    await testSubjects.setValue('links--linkEditor--externalLink--input', destination);
    if (linkLabel) {
      await testSubjects.setValue('links--linkEditor--linkLabel--input', linkLabel);
    }
    await testSubjects.setEuiSwitch('urlDrilldownOpenInNewTab', openInNewTab ? 'check' : 'uncheck');
    await testSubjects.setEuiSwitch('urlDrilldownEncodeUrl', encodeUrl ? 'check' : 'uncheck');

    await testSubjects.clickWhenNotDisabled('links--linkEditor--saveBtn');
  }

  async function addDashboardLink(
    destination: string,
    useCurrentFilters: boolean = true,
    useCurrentDateRange: boolean = true,
    openInNewTab: boolean = false,
    linkLabel?: string
  ) {
    await testSubjects.click('links--panelEditor--addLinkBtn');
    await testSubjects.exists('links--linkEditor--flyout');
    const radioOption = await testSubjects.find('links--linkEditor--dashboardLink--radioBtn');
    const label = await radioOption.findByCssSelector('label[for="dashboardLink"]');
    await label.click();

    await comboBox.set('links--linkEditor--dashboardLink--comboBox', destination);
    if (linkLabel) {
      await testSubjects.setValue('links--linkEditor--linkLabel--input', linkLabel);
    }

    await testSubjects.setEuiSwitch(
      'dashboardDrillDownOptions--useCurrentFilters--checkbox',
      useCurrentFilters ? 'check' : 'uncheck'
    );
    await testSubjects.setEuiSwitch(
      'dashboardDrillDownOptions--useCurrentDateRange--checkbox',
      useCurrentDateRange ? 'check' : 'uncheck'
    );
    await testSubjects.setEuiSwitch(
      'dashboardDrillDownOptions--openInNewTab--checkbox',
      openInNewTab ? 'check' : 'uncheck'
    );

    await testSubjects.clickWhenNotDisabled('links--linkEditor--saveBtn');
  }

  async function createSomeLinks() {
    await testSubjects.exists('links--panelEditor--flyout');

    await addExternalLink(`${deployment.getHostPort()}/app/foo`, true, true, 'Link to new tab');
    await addExternalLink(`${deployment.getHostPort()}/app/bar`, false, true);

    await addDashboardLink(DASHBOARD_NAME);
    await addDashboardLink('links 001', false, true, false, 'Does not pass filters');
    await addDashboardLink('links 002', true, false, false, 'Does not pass date range');
    await addDashboardLink('links 003', true, true, true, 'Opens in new tab');
  }

  const DASHBOARD_NAME = 'Test Links panel';
  const LINKS_PANEL_NAME = 'Some links';

  const FROM_TIME = 'Oct 22, 2018 @ 00:00:00.000';
  const TO_TIME = 'Dec 3, 2018 @ 00:00:00.000';

  describe('links panel', () => {
    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await security.testUser.setRoles([
        'kibana_admin',
        'kibana_sample_admin',
        'test_logstash_reader',
      ]);
      await esArchiver.load('test/functional/fixtures/es_archiver/kibana_sample_data_flights');
      await kibanaServer.importExport.load(
        'test/functional/fixtures/kbn_archiver/dashboard/current/kibana'
      );
      await kibanaServer.importExport.load(
        'test/functional/fixtures/kbn_archiver/kibana_sample_data_flights_index_pattern'
      );
      await kibanaServer.uiSettings.replace({
        defaultIndex: '0bf35f60-3dc9-11e8-8660-4d65aa086b3c',
      });
      await PageObjects.common.setTime({
        from: FROM_TIME,
        to: TO_TIME,
      });

      await PageObjects.dashboard.navigateToApp();
      await PageObjects.dashboard.preserveCrossAppState();
      await PageObjects.dashboard.gotoDashboardLandingPage();
      await PageObjects.dashboard.clickNewDashboard();
      await PageObjects.dashboard.saveDashboard(DASHBOARD_NAME, { exitFromEditMode: false });
    });

    after(async () => {
      await kibanaServer.importExport.unload(
        'test/functional/fixtures/kbn_archiver/kibana_sample_data_flights_index_pattern'
      );
      await esArchiver.unload('test/functional/fixtures/es_archiver/kibana_sample_data_flights');
      await kibanaServer.uiSettings.unset('defaultIndex');
      await PageObjects.common.unsetTime();
      await security.testUser.restoreDefaults();
    });

    describe('creation and editing', async () => {
      it('can create a new by-reference links panel', async () => {
        // TODO this test takes a long time to run. Maybe we don't need to add so many links?
        await PageObjects.dashboard.loadSavedDashboard(DASHBOARD_NAME);
        await PageObjects.dashboard.switchToEditMode();
        await dashboardAddPanel.clickEditorMenuButton();
        await dashboardAddPanel.clickAddNewEmbeddableLink('links');

        await createSomeLinks();
        await testSubjects.setEuiSwitch('links--panelEditor--saveByReferenceSwitch', 'check');
        await testSubjects.clickWhenNotDisabled('links--panelEditor--saveBtn');

        await testSubjects.exists('savedObjectSaveModal');
        await testSubjects.setValue('savedObjectTitle', LINKS_PANEL_NAME);
        await testSubjects.click('confirmSaveSavedObjectButton');
        await PageObjects.common.waitForSaveModalToClose();
        await testSubjects.exists('addObjectToDashboardSuccess');

        expect(await testSubjects.existOrFail('links--component'));
        await PageObjects.dashboard.clickDiscardChanges();
      });

      it('can create a new by-value links panel', async () => {});

      it('can reorder links in an existing panel', async () => {
        await PageObjects.dashboard.loadSavedDashboard('links 001');
        await PageObjects.dashboard.switchToEditMode();

        await dashboardPanelActions.openContextMenu();
        await dashboardPanelActions.clickEdit();
        await testSubjects.exists('links--panelEditor--flyout');

        // Move the third link up one step
        const linksFormRow = await testSubjects.find('links--panelEditor--linksAreaDroppable');
        const linkToMove = await linksFormRow.findByCssSelector(
          `[data-test-subj="links--panelEditor--draggableLink"]:nth-child(3)`
        );
        const draggableButton = await linkToMove.findByTestSubject(`panelEditorLink--dragHandle`);
        expect(await draggableButton.getAttribute('data-rfd-drag-handle-draggable-id')).to.equal(
          'link003'
        );
        await draggableButton.focus();
        await retry.try(async () => {
          await browser.pressKeys(browser.keys.SPACE);
          linkToMove.elementHasClass('euiDraggable--isDragging');
        });
        await browser.pressKeys(browser.keys.UP);
        await browser.pressKeys(browser.keys.SPACE);
        await retry.try(async () => {
          expect(await linkToMove.elementHasClass('euiDraggable--isDragging')).to.be(false);
        });

        await testSubjects.clickWhenNotDisabled('links--panelEditor--saveBtn');
        await PageObjects.header.waitUntilLoadingHasFinished();

        // The second link in the component should be the link we moved
        const listGroup = await testSubjects.find('links--component--listGroup');
        const listItem = await listGroup.findByCssSelector(`li:nth-child(2)`);
        expect(await listItem.getVisibleText()).to.equal('links 003 - external');
      });
    });

    describe('embeddable panel', () => {
      afterEach(async () => {
        await PageObjects.dashboard.clickDiscardChanges();
      });

      it('adds links panel to top of dashboard', async () => {
        await PageObjects.dashboard.loadSavedDashboard('links 003');
        await PageObjects.dashboard.switchToEditMode();
        await dashboardAddPanel.addEmbeddable('a few links', 'links');
        const topPanelTitle = (await PageObjects.dashboard.getPanelTitles())[0];
        expect(topPanelTitle).to.equal('a few links');
      });

      it('sets panel dimensions for horizontal layout', async () => {
        await PageObjects.dashboard.loadSavedDashboard(DASHBOARD_NAME);
        await PageObjects.dashboard.switchToEditMode();
        await dashboardAddPanel.clickEditorMenuButton();
        await dashboardAddPanel.clickAddNewEmbeddableLink('links');
        await testSubjects.click('links--panelEditor--horizontalLayoutBtn');
        await createSomeLinks();
        await testSubjects.setEuiSwitch('links--panelEditor--saveByReferenceSwitch', 'uncheck');
        await testSubjects.clickWhenNotDisabled('links--panelEditor--saveBtn');
        await testSubjects.exists('addObjectToDashboardSuccess');

        expect(await testSubjects.existOrFail('links--component'));
        const { width, height } = (await PageObjects.dashboard.getPanelDimensions())[0];
        expect(width).to.equal(1584);
        expect(height).to.equal(104);
      });

      it('sets panel dimensions for vertical layout', async () => {
        await PageObjects.dashboard.loadSavedDashboard(DASHBOARD_NAME);
        await PageObjects.dashboard.switchToEditMode();
        await dashboardAddPanel.clickEditorMenuButton();
        await dashboardAddPanel.clickAddNewEmbeddableLink('links');
        await testSubjects.click('links--panelEditor--verticalLayoutBtn');
        await createSomeLinks();
        await testSubjects.setEuiSwitch('links--panelEditor--saveByReferenceSwitch', 'uncheck');
        await testSubjects.clickWhenNotDisabled('links--panelEditor--saveBtn');
        await testSubjects.exists('addObjectToDashboardSuccess');

        expect(await testSubjects.existOrFail('links--component'));
        const { width, height } = (await PageObjects.dashboard.getPanelDimensions())[0];
        expect(width).to.equal(257);
        expect(height).to.equal(272);
      });
    });

    describe('dashboard links', () => {
      afterEach(async () => {
        // close any new tabs that were opened
        const windowHandlers = await browser.getAllWindowHandles();
        if (windowHandlers.length > 1) {
          await browser.closeCurrentWindow();
          await browser.switchToWindow(windowHandlers[0]);
        }
      });

      it('useCurrentFilters should pass filter pills and query', async () => {
        /**
         * dashboard links002 has a saved filter and query bar.
         * The link to dashboard links001 only has useCurrentFilters enabled
         * so the link should pass the filters and query to dashboard links001
         * but should not override the date range.
         */
        await PageObjects.dashboard.loadSavedDashboard('links 002');
        await testSubjects.click('dashboardLink--link001');
        expect(await PageObjects.dashboard.getDashboardIdFromCurrentUrl()).to.equal(
          '0930f310-5bc2-11ee-9a85-7b86504227bc'
        );
        // Should pass the filters
        expect(await filterBar.getFilterCount()).to.equal(2);
        const filterLabels = await filterBar.getFiltersLabel();
        expect(
          filterLabels.includes('This filter should only pass from links002 to links001')
        ).to.equal(true);
        expect(
          filterLabels.includes('This filter should not pass from links001 to links002')
        ).to.equal(true);

        // Should not pass the date range
        const time = await PageObjects.timePicker.getTimeConfig();
        expect(time.start).to.be('Oct 31, 2018 @ 00:00:00.000');
        expect(time.end).to.be('Nov 1, 2018 @ 00:00:00.000');

        await PageObjects.dashboard.clickDiscardChanges();
      });

      it('useCurrentDateRange should pass date range', async () => {
        /**
         * dashboard links001 has saved filters and a saved date range.
         * dashboard links002 has a different saved date range than links001.
         * The link to dashboard links002 only has useCurrentDateRange enabled
         * so the link should override the date range on dashboard links002
         * but should not pass its filters.
         */
        await PageObjects.dashboard.loadSavedDashboard('links 001');
        await testSubjects.click('dashboardLink--link002');
        expect(await PageObjects.dashboard.getDashboardIdFromCurrentUrl()).to.equal(
          '24751520-5bc2-11ee-9a85-7b86504227bc'
        );
        // Should pass the date range
        const time = await PageObjects.timePicker.getTimeConfig();
        expect(time.start).to.be('Oct 31, 2018 @ 00:00:00.000');
        expect(time.end).to.be('Nov 1, 2018 @ 00:00:00.000');

        // Should not pass the filters
        expect(await filterBar.getFilterCount()).to.equal(1);
        const filterLabels = await filterBar.getFiltersLabel();
        expect(
          filterLabels.includes('This filter should only pass from links002 to links001')
        ).to.equal(true);
        expect(
          filterLabels.includes('This filter should not pass from links001 to links002')
        ).to.equal(false);

        await PageObjects.dashboard.clickDiscardChanges();
      });

      it('openInNewTab should create an external link', async () => {
        /**
         * The link to dashboard links003 only has openInNewTab enabled.
         * Clicking the link should open a new tab.
         * Other dashboards should not pass their filters or date range
         * to dashboard links003.
         */
        await PageObjects.dashboard.loadSavedDashboard('links 001');
        await testSubjects.click('dashboardLink--link003');

        // Should have opened another tab
        const windowHandlers = await browser.getAllWindowHandles();
        expect(windowHandlers.length).to.equal(2);
        await browser.switchToWindow(windowHandlers[1]);
        expect(await PageObjects.dashboard.getDashboardIdFromCurrentUrl()).to.equal(
          '27398c50-5bc2-11ee-9a85-7b86504227bc'
        );

        // Should not pass any filters
        expect((await filterBar.getFiltersLabel()).length).to.equal(0);

        // Should not pass any date range
        const time = await PageObjects.timePicker.getTimeConfig();
        expect(time.start).to.be('Dec 24, 2018 @ 00:00:00.000');
        expect(time.end).to.be('Dec 26, 2018 @ 00:00:00.000');
      });
    });

    describe('external links', () => {
      it('should create an external link by default', async () => {});

      it('should open in same tab when openInNewTab is disabled', async () => {});
    });
  });
}
