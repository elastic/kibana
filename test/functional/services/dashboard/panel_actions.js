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

const REMOVE_PANEL_DATA_TEST_SUBJ = 'dashboardPanelAction-deletePanel';
const EDIT_PANEL_DATA_TEST_SUBJ = 'dashboardPanelAction-editPanel';
const TOGGLE_EXPAND_PANEL_DATA_TEST_SUBJ = 'dashboardPanelAction-togglePanel';
const CUSTOMIZE_PANEL_DATA_TEST_SUBJ = 'dashboardPanelAction-customizePanel';
const OPEN_CONTEXT_MENU_ICON_DATA_TEST_SUBJ = 'dashboardPanelToggleMenuIcon';
const OPEN_INSPECTOR_TEST_SUBJ = 'dashboardPanelAction-openInspector';

export function DashboardPanelActionsProvider({ getService, getPageObjects }) {
  const log = getService('log');
  const retry = getService('retry');
  const remote = getService('remote');
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['header', 'common']);

  return new class DashboardPanelActions {

    async isContextMenuOpen(parent) {
      log.debug('isContextMenuOpen');
      // Full screen toggle was chosen because it's available in both view and edit mode.
      return this.toggleExpandActionExists(parent);
    }

    async findContextMenu(parent) {
      return parent ?
        await testSubjects.findDescendant(OPEN_CONTEXT_MENU_ICON_DATA_TEST_SUBJ, parent) :
        await testSubjects.find(OPEN_CONTEXT_MENU_ICON_DATA_TEST_SUBJ);
    }

    async isContextMenuIconVisible() {
      log.debug('isContextMenuIconVisible');
      return await testSubjects.exists(OPEN_CONTEXT_MENU_ICON_DATA_TEST_SUBJ);
    }

    async openContextMenu(parent) {
      log.debug('openContextMenu');
      const panelOpen = await this.isContextMenuOpen(parent);
      if (!panelOpen) {
        await retry.try(async () => {
          await (parent ? remote.moveMouseTo(parent) : testSubjects.moveMouseTo('dashboardPanelTitle'));
          const toggleMenuItem = await this.findContextMenu(parent);
          await toggleMenuItem.click();
          const panelOpen = await this.isContextMenuOpen(parent);
          if (!panelOpen) { throw new Error('Context menu still not open'); }
        });
      }
    }

    async toggleExpandPanel(parent) {
      log.debug('toggleExpandPanel');
      await (parent ? remote.moveMouseTo(parent) : testSubjects.moveMouseTo('dashboardPanelTitle'));
      const expandShown = await this.toggleExpandActionExists();
      if (!expandShown) {
        await this.openContextMenu(parent);
      }
      await this.toggleExpandPanel();
    }

    async clickEdit() {
      log.debug('clickEdit');
      await this.openContextMenu();

      // Edit link may sometimes be disabled if the embeddable isn't rendered yet.
      await retry.try(async () => {
        const editExists = await this.editPanelActionExists();
        if (editExists) {
          await testSubjects.click(EDIT_PANEL_DATA_TEST_SUBJ);
        }
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.common.waitForTopNavToBeVisible();
        const current = await remote.getCurrentUrl();
        if (current.indexOf('dashboard') >= 0) {
          throw new Error('Still on dashboard');
        }
      });
    }

    async toggleExpandPanel() {
      log.debug('toggleExpandPanel');
      await this.openContextMenu();
      await testSubjects.click(TOGGLE_EXPAND_PANEL_DATA_TEST_SUBJ);
    }

    async removePanel() {
      log.debug('removePanel');
      await this.openContextMenu();
      await testSubjects.click(REMOVE_PANEL_DATA_TEST_SUBJ);
    }

    async customizePanel(parent) {
      await this.openContextMenu(parent);
      await testSubjects.click(CUSTOMIZE_PANEL_DATA_TEST_SUBJ);
    }

    async openInspector(parent) {
      await this.openContextMenu(parent);
      await testSubjects.click(OPEN_INSPECTOR_TEST_SUBJ);
    }

    async removePanelActionExists() {
      log.debug('removePanelActionExists');
      return await testSubjects.exists(REMOVE_PANEL_DATA_TEST_SUBJ);
    }

    async editPanelActionExists() {
      log.debug('editPanelActionExists');
      return await testSubjects.exists(EDIT_PANEL_DATA_TEST_SUBJ);
    }

    async toggleExpandActionExists() {
      log.debug('toggleExpandActionExists');
      return await testSubjects.exists(TOGGLE_EXPAND_PANEL_DATA_TEST_SUBJ);
    }

    async customizePanelActionExists(parent) {
      return parent ?
        await testSubjects.descendantExists(CUSTOMIZE_PANEL_DATA_TEST_SUBJ, parent) :
        await testSubjects.exists(CUSTOMIZE_PANEL_DATA_TEST_SUBJ);
    }

    async getPanelHeading(title) {
      return await testSubjects.find(`dashboardPanelHeading-${title.replace(/\s/g, '')}`);
    }

    /**
     *
     * @param customTitle
     * @param originalTitle - optional to specify which panel to change the title on.
     * @return {Promise<void>}
     */
    async setCustomPanelTitle(customTitle, originalTitle) {
      log.debug(`setCustomPanelTitle(${customTitle}, ${originalTitle})`);
      let panelOptions = null;
      if (originalTitle) {
        panelOptions = await this.getPanelHeading(originalTitle);
      }
      await this.customizePanel(panelOptions);
      await testSubjects.setValue('customDashboardPanelTitleInput', customTitle);
    }

    async resetCustomPanelTitle(panel) {
      log.debug('resetCustomPanelTitle');
      await this.customizePanel(panel);
      await testSubjects.click('resetCustomDashboardPanelTitle');
    }
  };
}
