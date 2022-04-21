/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const dashboardVisualizations = getService('dashboardVisualizations');
  const dashboardPanelActions = getService('dashboardPanelActions');
  const testSubjects = getService('testSubjects');
  const kibanaServer = getService('kibanaServer');
  const find = getService('find');

  const PageObjects = getPageObjects([
    'header',
    'common',
    'discover',
    'dashboard',
    'visualize',
    'timePicker',
  ]);

  const fewPanelsTitle = 'few panels';
  const markdownTitle = 'Copy To Markdown';
  let fewPanelsPanelCount = 0;

  const openCopyToModal = async (panelName: string) => {
    await dashboardPanelActions.openCopyToModalByTitle(panelName);
    const modalIsOpened = await testSubjects.exists('copyToDashboardPanel');
    expect(modalIsOpened).to.be(true);
    const hasDashboardSelector = await testSubjects.exists('add-to-dashboard-options');
    expect(hasDashboardSelector).to.be(true);
  };

  describe('dashboard panel copy to', function viewEditModeTests() {
    before(async function () {
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.importExport.load(
        'test/functional/fixtures/kbn_archiver/dashboard/current/kibana'
      );
      await kibanaServer.uiSettings.replace({
        defaultIndex: '0bf35f60-3dc9-11e8-8660-4d65aa086b3c',
      });
      await PageObjects.common.navigateToApp('dashboard');
      await PageObjects.dashboard.preserveCrossAppState();
      await PageObjects.dashboard.loadSavedDashboard(fewPanelsTitle);
      await PageObjects.dashboard.waitForRenderComplete();
      fewPanelsPanelCount = await PageObjects.dashboard.getPanelCount();

      await PageObjects.dashboard.gotoDashboardLandingPage();
      await PageObjects.dashboard.clickNewDashboard();
      await PageObjects.timePicker.setHistoricalDataRange();
      await dashboardVisualizations.createAndAddMarkdown({
        name: markdownTitle,
        markdown: 'Please add me to some other dashboard',
      });
    });

    after(async function () {
      await PageObjects.dashboard.gotoDashboardLandingPage();
      await kibanaServer.savedObjects.cleanStandardList();
    });

    it('does not show the new dashboard option when on a new dashboard', async () => {
      await openCopyToModal(markdownTitle);
      const dashboardSelector = await testSubjects.find('add-to-dashboard-options');
      const isDisabled = await dashboardSelector.findByCssSelector(
        `input[id="new-dashboard-option"]:disabled`
      );
      expect(isDisabled).not.to.be(null);

      await testSubjects.click('cancelCopyToButton');
    });

    it('copies a panel to an existing dashboard', async () => {
      await openCopyToModal(markdownTitle);
      const dashboardSelector = await testSubjects.find('add-to-dashboard-options');
      const label = await dashboardSelector.findByCssSelector(
        `label[for="existing-dashboard-option"]`
      );
      await label.click();

      await testSubjects.setValue('dashboardPickerInput', fewPanelsTitle);
      await testSubjects.existOrFail(`dashboard-picker-option-few-panels`);
      await find.clickByButtonText(fewPanelsTitle);
      await testSubjects.click('confirmCopyToButton');

      await PageObjects.dashboard.waitForRenderComplete();
      await PageObjects.dashboard.expectOnDashboard(`Editing ${fewPanelsTitle}`);
      const newPanelCount = await PageObjects.dashboard.getPanelCount();
      expect(newPanelCount).to.be(fewPanelsPanelCount + 1);

      // Save & ensure that view mode is applied properly.
      await PageObjects.dashboard.clickQuickSave();
      await testSubjects.existOrFail('saveDashboardSuccess');

      await PageObjects.dashboard.clickCancelOutOfEditMode();
      const panelOptions = await dashboardPanelActions.getPanelHeading(markdownTitle);
      await dashboardPanelActions.openContextMenu(panelOptions);
      await dashboardPanelActions.expectMissingEditPanelAction();
    });

    it('does not show the current dashboard in the dashboard picker', async () => {
      await openCopyToModal(markdownTitle);
      const dashboardSelector = await testSubjects.find('add-to-dashboard-options');
      const label = await dashboardSelector.findByCssSelector(
        `label[for="existing-dashboard-option"]`
      );
      await label.click();

      await testSubjects.setValue('dashboardPickerInput', fewPanelsTitle);
      await testSubjects.missingOrFail(`dashboard-picker-option-few-panels`);

      await testSubjects.click('cancelCopyToButton');
    });

    it('copies a panel to a new dashboard', async () => {
      await openCopyToModal(markdownTitle);
      const dashboardSelector = await testSubjects.find('add-to-dashboard-options');
      const label = await dashboardSelector.findByCssSelector(`label[for="new-dashboard-option"]`);
      await label.click();
      await testSubjects.click('confirmCopyToButton');

      await PageObjects.dashboard.waitForRenderComplete();
      await PageObjects.dashboard.expectOnDashboard(`Editing New Dashboard`);
    });

    it('it always appends new panels instead of overwriting', async () => {
      const newPanelCount = await PageObjects.dashboard.getPanelCount();
      expect(newPanelCount).to.be(2);
    });
  });
}
