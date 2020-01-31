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

const REMOVE_PANEL_DATA_TEST_SUBJ = 'embeddablePanelAction-deletePanel';
const EDIT_PANEL_DATA_TEST_SUBJ = 'embeddablePanelAction-editPanel';
const TOGGLE_EXPAND_PANEL_DATA_TEST_SUBJ = 'embeddablePanelAction-togglePanel';
const CUSTOMIZE_PANEL_DATA_TEST_SUBJ = 'embeddablePanelAction-CUSTOMIZE_PANEL_ACTION_ID';
const OPEN_CONTEXT_MENU_ICON_DATA_TEST_SUBJ = 'embeddablePanelToggleMenuIcon';
const OPEN_INSPECTOR_TEST_SUBJ = 'embeddablePanelAction-openInspector';

export function DashboardPanelActionsProvider({ getService, getPageObjects }) {
  const log = getService('log');
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['header', 'common']);

  return new (class DashboardPanelActions {
    async findContextMenu(parent) {
      return parent
        ? await testSubjects.findDescendant(OPEN_CONTEXT_MENU_ICON_DATA_TEST_SUBJ, parent)
        : await testSubjects.find(OPEN_CONTEXT_MENU_ICON_DATA_TEST_SUBJ);
    }

    async isContextMenuIconVisible() {
      log.debug('isContextMenuIconVisible');
      return await testSubjects.exists(OPEN_CONTEXT_MENU_ICON_DATA_TEST_SUBJ);
    }

    async toggleContextMenu(parent) {
      log.debug('toggleContextMenu');
      await (parent ? parent.moveMouseTo() : testSubjects.moveMouseTo('dashboardPanelTitle'));
      const toggleMenuItem = await this.findContextMenu(parent);
      await toggleMenuItem.click();
    }

    async expectContextMenuToBeOpen() {
      await testSubjects.existOrFail('embeddablePanelContextMenuOpen');
    }

    async openContextMenu(parent) {
      log.debug(`openContextMenu(${parent}`);
      await this.toggleContextMenu(parent);
      await this.expectContextMenuToBeOpen();
    }

    async clickEdit() {
      log.debug('clickEdit');
      await testSubjects.clickWhenNotDisabled(EDIT_PANEL_DATA_TEST_SUBJ);
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.common.waitForTopNavToBeVisible();
    }

    async clickExpandPanelToggle() {
      await testSubjects.click(TOGGLE_EXPAND_PANEL_DATA_TEST_SUBJ);
    }

    async removePanel() {
      log.debug('removePanel');
      await this.openContextMenu();
      await testSubjects.click(REMOVE_PANEL_DATA_TEST_SUBJ);
    }

    async removePanelByTitle(title) {
      const header = await this.getPanelHeading(title);
      await this.openContextMenu(header);
      await testSubjects.click(REMOVE_PANEL_DATA_TEST_SUBJ);
    }

    async customizePanel(parent) {
      await this.openContextMenu(parent);
      await testSubjects.click(CUSTOMIZE_PANEL_DATA_TEST_SUBJ);
    }

    async openInspectorByTitle(title) {
      const header = await this.getPanelHeading(title);
      await this.openInspector(header);
    }

    async openInspector(parent) {
      await this.openContextMenu(parent);
      await testSubjects.click(OPEN_INSPECTOR_TEST_SUBJ);
    }

    async expectExistsRemovePanelAction() {
      log.debug('expectExistsRemovePanelAction');
      await testSubjects.existOrFail(REMOVE_PANEL_DATA_TEST_SUBJ);
    }

    async expectMissingRemovePanelAction() {
      log.debug('expectMissingRemovePanelAction');
      await testSubjects.missingOrFail(REMOVE_PANEL_DATA_TEST_SUBJ);
    }

    async expectExistsEditPanelAction() {
      log.debug('expectExistsEditPanelAction');
      await testSubjects.existOrFail(EDIT_PANEL_DATA_TEST_SUBJ);
    }

    async expectMissingEditPanelAction() {
      log.debug('expectMissingEditPanelAction');
      await testSubjects.missingOrFail(EDIT_PANEL_DATA_TEST_SUBJ);
    }

    async expectExistsToggleExpandAction() {
      log.debug('expectExistsToggleExpandAction');
      await testSubjects.existOrFail(TOGGLE_EXPAND_PANEL_DATA_TEST_SUBJ);
    }

    async getPanelHeading(title) {
      return await testSubjects.find(`embeddablePanelHeading-${title.replace(/\s/g, '')}`);
    }

    async clickHidePanelTitleToggle() {
      await testSubjects.click('customizePanelHideTitle');
    }

    async toggleHidePanelTitle(originalTitle) {
      log.debug(`hidePanelTitle(${originalTitle})`);
      let panelOptions = null;
      if (originalTitle) {
        panelOptions = await this.getPanelHeading(originalTitle);
      }
      await this.customizePanel(panelOptions);
      await this.clickHidePanelTitleToggle();
      await testSubjects.click('saveNewTitleButton');
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
      await testSubjects.setValue('customEmbeddablePanelTitleInput', customTitle);
      await testSubjects.click('saveNewTitleButton');
    }

    async resetCustomPanelTitle(panel) {
      log.debug('resetCustomPanelTitle');
      await this.customizePanel(panel);
      await testSubjects.click('resetCustomEmbeddablePanelTitle');
      await testSubjects.click('saveNewTitleButton');
      await this.toggleContextMenu(panel);
    }
  })();
}
