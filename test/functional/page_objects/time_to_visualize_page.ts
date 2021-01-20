/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { FtrProviderContext } from '../ftr_provider_context';

interface SaveModalArgs {
  addToDashboard?: 'new' | 'existing' | null;
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
  const { common } = getPageObjects(['common']);

  class TimeToVisualizePage {
    public async ensureSaveModalIsOpen() {
      await testSubjects.exists('savedObjectSaveModal', { timeout: 5000 });
    }

    public async ensureDashboardOptionsAreDisabled() {
      const dashboardSelector = await testSubjects.find('add-to-dashboard-options');
      await dashboardSelector.findByCssSelector(`input[id="new-dashboard-option"]:disabled`);
      await dashboardSelector.findByCssSelector(`input[id="existing-dashboard-option"]:disabled`);
      await dashboardSelector.findByCssSelector(`input[id="add-to-library-option"]:disabled`);
    }

    public async setSaveModalValues(
      vizName: string,
      { saveAsNew, redirectToOrigin, addToDashboard, dashboardId }: SaveModalArgs = {}
    ) {
      await testSubjects.setValue('savedObjectTitle', vizName);

      if (saveAsNew) {
        const state = saveAsNew ? 'check' : 'uncheck';
        log.debug('save as new checkbox exists. Setting its state to', state);
        await testSubjects.setEuiSwitch('saveAsNewCheckbox', state);
      }

      if (redirectToOrigin) {
        const state = redirectToOrigin ? 'check' : 'uncheck';
        log.debug('redirect to origin checkbox exists. Setting its state to', state);
        await testSubjects.setEuiSwitch('returnToOriginModeSwitch', state);
      }

      if (addToDashboard !== undefined) {
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
