/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FtrProviderContext } from '../ftr_provider_context';

interface SaveModalArgs {
  addToDashboard?: 'new' | 'existing' | null;
  saveToLibrary?: boolean;
  dashboardId?: string;
  saveAsNew?: boolean;
  redirectToOrigin?: boolean;
}

type DashboardPickerOption =
  | 'add-to-library-option'
  | 'existing-dashboard-option'
  | 'new-dashboard-option';

export function TimeToVisualizePageProvider({ getService, getPageObjects }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const log = getService('log');
  const find = getService('find');
  const { common, dashboard } = getPageObjects(['common', 'dashboard']);

  class TimeToVisualizePage {
    public async ensureSaveModalIsOpen() {
      await testSubjects.exists('savedObjectSaveModal', { timeout: 5000 });
    }

    public async ensureDashboardOptionsAreDisabled() {
      const dashboardSelector = await testSubjects.find('add-to-dashboard-options');
      await dashboardSelector.findByCssSelector(`input[id="new-dashboard-option"]:disabled`);
      await dashboardSelector.findByCssSelector(`input[id="existing-dashboard-option"]:disabled`);

      const librarySelector = await testSubjects.find('add-to-library-checkbox');
      await librarySelector.findByCssSelector(`input[id="add-to-library-checkbox"]:disabled`);
    }

    public async resetNewDashboard() {
      await common.navigateToApp('dashboard');
      await dashboard.gotoDashboardLandingPage(true);
      await dashboard.clickNewDashboard(false);
    }

    public async setSaveModalValues(
      vizName: string,
      {
        saveAsNew,
        redirectToOrigin,
        addToDashboard,
        dashboardId,
        saveToLibrary,
      }: SaveModalArgs = {}
    ) {
      await testSubjects.setValue('savedObjectTitle', vizName);

      const hasSaveAsNew = await testSubjects.exists('saveAsNewCheckbox');
      if (hasSaveAsNew && saveAsNew !== undefined) {
        const state = saveAsNew ? 'check' : 'uncheck';
        log.debug('save as new checkbox exists. Setting its state to', state);
        await testSubjects.setEuiSwitch('saveAsNewCheckbox', state);
      }

      const hasDashboardSelector = await testSubjects.exists('add-to-dashboard-options');
      if (hasDashboardSelector && addToDashboard !== undefined) {
        let option: DashboardPickerOption = 'add-to-library-option';
        if (addToDashboard) {
          option = dashboardId ? 'existing-dashboard-option' : 'new-dashboard-option';
        }
        log.debug('save modal dashboard selector, choosing option:', option);
        const dashboardSelector = await testSubjects.find('add-to-dashboard-options');
        const label = await dashboardSelector.findByCssSelector(`label[for="${option}"]`);
        await label.click();

        if (dashboardId) {
          await testSubjects.setValue('dashboardPickerInput', dashboardId);
          await find.clickByButtonText(dashboardId);
        }
      }

      const hasSaveToLibrary = await testSubjects.exists('add-to-library-checkbox');
      if (hasSaveToLibrary && saveToLibrary !== undefined) {
        const libraryCheckbox = await find.byCssSelector('#add-to-library-checkbox');
        const isChecked = await libraryCheckbox.isSelected();
        const needsClick = isChecked !== saveToLibrary;
        const state = saveToLibrary ? 'check' : 'uncheck';

        log.debug('save to library checkbox exists. Setting its state to', state);
        if (needsClick) {
          const selector = await testSubjects.find('add-to-library-checkbox');
          const label = await selector.findByCssSelector(`label[for="add-to-library-checkbox"]`);
          await label.click();
        }
      }

      const hasRedirectToOrigin = await testSubjects.exists('returnToOriginModeSwitch');
      if (hasRedirectToOrigin && redirectToOrigin !== undefined) {
        const state = redirectToOrigin ? 'check' : 'uncheck';
        log.debug('redirect to origin checkbox exists. Setting its state to', state);
        await testSubjects.setEuiSwitch('returnToOriginModeSwitch', state);
      }
    }

    public async libraryNotificationExists(panelTitle: string) {
      log.debug('searching for library modal on panel:', panelTitle);
      const panel = await testSubjects.find(
        `embeddablePanelHeading-${panelTitle.replace(/ /g, '')}`
      );
      const libraryActionExists = await testSubjects.descendantExists(
        'embeddablePanelNotification-ACTION_LIBRARY_NOTIFICATION',
        panel
      );
      return libraryActionExists;
    }

    public async saveFromModal(
      vizName: string,
      saveModalArgs: SaveModalArgs = { addToDashboard: null }
    ) {
      await this.ensureSaveModalIsOpen();

      await this.setSaveModalValues(vizName, saveModalArgs);
      log.debug('Click Save Visualization button');

      await testSubjects.click('confirmSaveSavedObjectButton');

      await common.waitForSaveModalToClose();
    }
  }

  return new TimeToVisualizePage();
}
