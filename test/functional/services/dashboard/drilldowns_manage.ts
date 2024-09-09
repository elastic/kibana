/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Key } from 'selenium-webdriver';
import { FtrProviderContext } from '../../ftr_provider_context';

const CREATE_DRILLDOWN_FLYOUT_DATA_TEST_SUBJ = 'createDrilldownFlyout';
const MANAGE_DRILLDOWNS_FLYOUT_DATA_TEST_SUBJ = 'editDrilldownFlyout';
const DESTINATION_DASHBOARD_SELECT = 'dashboardDrilldownSelectDashboard';
const DRILLDOWN_WIZARD_SUBMIT = 'drilldownWizardSubmit';

export function DashboardDrilldownsManageProvider({ getService }: FtrProviderContext) {
  const log = getService('log');
  const testSubjects = getService('testSubjects');
  const flyout = getService('flyout');
  const comboBox = getService('comboBox');
  const find = getService('find');
  const browser = getService('browser');
  const kibanaServer = getService('kibanaServer');
  return new (class DashboardDrilldownsManage {
    readonly DASHBOARD_WITH_PIE_CHART_NAME = 'Dashboard with Pie Chart';
    readonly DASHBOARD_WITH_AREA_CHART_NAME = 'Dashboard With Area Chart';

    async loadData() {
      log.debug('loadData');
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.importExport.load(
        'x-pack/test/functional/fixtures/kbn_archiver/dashboard_drilldowns/drilldowns'
      );
    }

    async unloadData() {
      log.debug('unloadData');
      await kibanaServer.savedObjects.cleanStandardList();
    }

    async expectsCreateDrilldownFlyoutOpen() {
      log.debug('expectsCreateDrilldownFlyoutOpen');
      await testSubjects.existOrFail(CREATE_DRILLDOWN_FLYOUT_DATA_TEST_SUBJ);
    }

    async expectsManageDrilldownsFlyoutOpen() {
      log.debug('expectsManageDrilldownsFlyoutOpen');
      await testSubjects.existOrFail(MANAGE_DRILLDOWNS_FLYOUT_DATA_TEST_SUBJ);
    }

    async expectsCreateDrilldownFlyoutClose() {
      log.debug('expectsCreateDrilldownFlyoutClose');
      await testSubjects.missingOrFail(CREATE_DRILLDOWN_FLYOUT_DATA_TEST_SUBJ);
    }

    async expectsManageDrilldownsFlyoutClose() {
      log.debug('expectsManageDrilldownsFlyoutClose');
      await testSubjects.missingOrFail(MANAGE_DRILLDOWNS_FLYOUT_DATA_TEST_SUBJ);
    }

    async fillInDashboardToDashboardDrilldownWizard({
      drilldownName,
      destinationDashboardTitle,
    }: {
      drilldownName: string;
      destinationDashboardTitle: string;
    }) {
      await this.fillInDrilldownName(drilldownName);
      await this.selectDestinationDashboard(destinationDashboardTitle);
    }

    async fillInDashboardToURLDrilldownWizard({
      drilldownName,
      destinationURLTemplate,
      trigger,
    }: {
      drilldownName: string;
      destinationURLTemplate: string;
      trigger: 'VALUE_CLICK_TRIGGER' | 'SELECT_RANGE_TRIGGER' | 'IMAGE_CLICK_TRIGGER';
    }) {
      await this.fillInDrilldownName(drilldownName);
      await this.selectTriggerIfNeeded(trigger);
      await this.fillInURLTemplate(destinationURLTemplate);
    }

    async fillInDrilldownName(name: string) {
      await testSubjects.setValue('drilldownNameInput', name);
    }

    async selectDestinationDashboard(title: string) {
      await comboBox.set(DESTINATION_DASHBOARD_SELECT, title);
    }

    async selectTriggerIfNeeded(
      trigger: 'VALUE_CLICK_TRIGGER' | 'SELECT_RANGE_TRIGGER' | 'IMAGE_CLICK_TRIGGER'
    ) {
      if (await testSubjects.exists(`triggerPicker`)) {
        const container = await testSubjects.find(`triggerPicker-${trigger}`);
        const radio = await container.findByCssSelector('input[type=radio]');
        await radio.click();
      }
    }

    async eraseInput(maxChars: number) {
      const keys = [
        ...Array(maxChars).fill(Key.ARROW_RIGHT),
        ...Array(maxChars).fill(Key.BACK_SPACE),
      ];
      await browser
        .getActions()
        .sendKeys(...keys)
        .perform();
    }

    async fillInURLTemplate(destinationURLTemplate: string) {
      const monaco = await find.byCssSelector('.urlTemplateEditor__container .monaco-editor');
      await monaco.clickMouseButton();
      await this.eraseInput(300);
      await browser.pressKeys(destinationURLTemplate);
    }

    async saveChanges() {
      await testSubjects.click(DRILLDOWN_WIZARD_SUBMIT);
    }

    async deleteDrilldownsByTitles(titles: string[]) {
      const drilldowns = await testSubjects.findAll('listManageDrilldownsItem');

      for (const drilldown of drilldowns) {
        const nameColumn = await drilldown.findByTestSubject('drilldownListItemName');
        const name = await nameColumn.getVisibleText();
        if (titles.includes(name)) {
          const checkbox = await drilldown.findByTagName('input');
          await checkbox.click();
        }
      }
      const deleteBtn = await testSubjects.find('listManageDeleteDrilldowns');
      await deleteBtn.click();
    }

    async closeFlyout() {
      await flyout.ensureAllClosed();
    }
  })();
}
