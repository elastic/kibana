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
  const PageObjects = getPageObjects(['dashboardControls', 'dashboard', 'common', 'header']);

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
    await addDashboardLink('im empty', false, true, false, 'Does not pass filters');
    await addDashboardLink('im empty too', true, false, false, 'Does not pass date range');
    await addDashboardLink('couple panels', true, true, true, 'Opens in new tab');
  }

  const DASHBOARD_NAME = 'Test Links panel';
  const LINKS_PANEL_NAME = 'Some links';

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
        from: 'Oct 22, 2018 @ 00:00:00.000',
        to: 'Dec 3, 2018 @ 00:00:00.000',
      });
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
        await PageObjects.dashboard.navigateToApp();
        await PageObjects.dashboard.preserveCrossAppState();
        await PageObjects.dashboard.gotoDashboardLandingPage();
        await PageObjects.dashboard.clickNewDashboard();
        await PageObjects.dashboard.saveDashboard(DASHBOARD_NAME, { exitFromEditMode: false });

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
        await PageObjects.dashboard.clearUnsavedChanges();
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
        expect(await listItem.getVisibleText()).to.equal('links 003');
      });
    });

    describe('embeddable panel', () => {
      // TODO complete this test
      it.skip('adds links panel to top of dashboard', async () => {
        await PageObjects.dashboard.loadSavedDashboard('links 003');
        await PageObjects.dashboard.switchToEditMode();
        await dashboardAddPanel.addEmbeddable('a few links', 'links');
        // how do I check that the panel is the top one?
      });
    });

    describe('dashboard links', () => {
      it('useCurrentFilters should pass filter pills and query', async () => {
        /**
         * dashboard links002 has a saved filter and query bar.
         * The link to dashboard links001 only has useCurrentFilters enabled
         * so the link should pass the filters and query to dashboard links001
         * but should not override the date range.
         */
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
        // TODO check the date range and filters
      });

      it('openInNewTab should create an external link', async () => {
        /**
         * The link to dashboard links003 only has openInNewTab enabled.
         * Clicking the link should open a new tab.
         * Other dashboards should not pass their filters or date range
         * to dashboard links003.
         */
      });
    });

    describe('external links', () => {
      it('should create an external link by default', async () => {});

      it('should open in same tab when openInNewTab is disabled', async () => {});
    });
  });
}
