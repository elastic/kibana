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

import { FtrProviderContext } from '../../ftr_provider_context';
import { WebElementWrapper } from '../lib/web_element_wrapper';

const REMOVE_PANEL_DATA_TEST_SUBJ = 'embeddablePanelAction-deletePanel';
const EDIT_PANEL_DATA_TEST_SUBJ = 'embeddablePanelAction-editPanel';
const REPLACE_PANEL_DATA_TEST_SUBJ = 'embeddablePanelAction-replacePanel';
const CLONE_PANEL_DATA_TEST_SUBJ = 'embeddablePanelAction-clonePanel';
const TOGGLE_EXPAND_PANEL_DATA_TEST_SUBJ = 'embeddablePanelAction-togglePanel';
const CUSTOMIZE_PANEL_DATA_TEST_SUBJ = 'embeddablePanelAction-ACTION_CUSTOMIZE_PANEL';
const OPEN_CONTEXT_MENU_ICON_DATA_TEST_SUBJ = 'embeddablePanelToggleMenuIcon';
const OPEN_INSPECTOR_TEST_SUBJ = 'embeddablePanelAction-openInspector';

export function DashboardPanelActionsProvider({ getService, getPageObjects }: FtrProviderContext) {
  const log = getService('log');
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['header', 'common']);

  return new (class DashboardPanelActions {
    async findContextMenu(parent?: WebElementWrapper) {
      return parent
        ? await testSubjects.findDescendant(OPEN_CONTEXT_MENU_ICON_DATA_TEST_SUBJ, parent)
        : await testSubjects.find(OPEN_CONTEXT_MENU_ICON_DATA_TEST_SUBJ);
    }

    async isContextMenuIconVisible() {
      log.debug('isContextMenuIconVisible');
      return await testSubjects.exists(OPEN_CONTEXT_MENU_ICON_DATA_TEST_SUBJ);
    }

    async toggleContextMenu(parent?: WebElementWrapper) {
      log.debug('toggleContextMenu');
      await (parent ? parent.moveMouseTo() : testSubjects.moveMouseTo('dashboardPanelTitle'));
      const toggleMenuItem = await this.findContextMenu(parent);
      await toggleMenuItem.click();
    }

    async expectContextMenuToBeOpen() {
      await testSubjects.existOrFail('embeddablePanelContextMenuOpen');
    }

    async openContextMenu(parent?: WebElementWrapper) {
      log.debug(`openContextMenu(${parent}`);
      if (await testSubjects.exists('embeddablePanelContextMenuOpen')) return;
      await this.toggleContextMenu(parent);
      await this.expectContextMenuToBeOpen();
    }

    async hasContextMenuMoreItem() {
      return await testSubjects.exists('embeddablePanelMore-mainMenu');
    }

    async clickContextMenuMoreItem() {
      const hasMoreSubPanel = await testSubjects.exists('embeddablePanelMore-mainMenu');
      if (hasMoreSubPanel) {
        await testSubjects.click('embeddablePanelMore-mainMenu');
      }
    }

    async openContextMenuMorePanel(parent?: WebElementWrapper) {
      await this.openContextMenu(parent);
      await this.clickContextMenuMoreItem();
    }

    async clickEdit() {
      log.debug('clickEdit');
      await this.openContextMenu();
      const isActionVisible = await testSubjects.exists(EDIT_PANEL_DATA_TEST_SUBJ);
      if (!isActionVisible) await this.clickContextMenuMoreItem();
      await testSubjects.clickWhenNotDisabled(EDIT_PANEL_DATA_TEST_SUBJ);
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.common.waitForTopNavToBeVisible();
    }

    async editPanelByTitle(title?: string) {
      log.debug(`editPanelByTitle(${title})`);
      if (title) {
        const panelOptions = await this.getPanelHeading(title);
        await this.openContextMenu(panelOptions);
      } else {
        await this.openContextMenu();
      }
      await testSubjects.clickWhenNotDisabled(EDIT_PANEL_DATA_TEST_SUBJ);
    }

    async clickExpandPanelToggle() {
      log.debug(`clickExpandPanelToggle`);
      this.openContextMenu();
      const isActionVisible = await testSubjects.exists(TOGGLE_EXPAND_PANEL_DATA_TEST_SUBJ);
      if (!isActionVisible) await this.clickContextMenuMoreItem();
      await testSubjects.click(TOGGLE_EXPAND_PANEL_DATA_TEST_SUBJ);
    }

    async removePanel() {
      log.debug('removePanel');
      await this.openContextMenu();
      const isActionVisible = await testSubjects.exists(REMOVE_PANEL_DATA_TEST_SUBJ);
      if (!isActionVisible) await this.clickContextMenuMoreItem();
      const isPanelActionVisible = await testSubjects.exists(REMOVE_PANEL_DATA_TEST_SUBJ);
      if (!isPanelActionVisible) await this.clickContextMenuMoreItem();
      await testSubjects.click(REMOVE_PANEL_DATA_TEST_SUBJ);
    }

    async removePanelByTitle(title: string) {
      const header = await this.getPanelHeading(title);
      await this.openContextMenu(header);
      const isActionVisible = await testSubjects.exists(REMOVE_PANEL_DATA_TEST_SUBJ);
      if (!isActionVisible) await this.clickContextMenuMoreItem();
      await testSubjects.click(REMOVE_PANEL_DATA_TEST_SUBJ);
    }

    async customizePanel(parent?: WebElementWrapper) {
      await this.openContextMenu(parent);
      await testSubjects.click(CUSTOMIZE_PANEL_DATA_TEST_SUBJ);
    }

    async replacePanelByTitle(title?: string) {
      log.debug(`replacePanel(${title})`);
      if (title) {
        const panelOptions = await this.getPanelHeading(title);
        await this.openContextMenu(panelOptions);
      } else {
        await this.openContextMenu();
      }
      const actionExists = await testSubjects.exists(REPLACE_PANEL_DATA_TEST_SUBJ);
      if (!actionExists) {
        await this.clickContextMenuMoreItem();
      }
      await testSubjects.click(REPLACE_PANEL_DATA_TEST_SUBJ);
    }

    async clonePanelByTitle(title?: string) {
      log.debug(`clonePanel(${title})`);
      if (title) {
        const panelOptions = await this.getPanelHeading(title);
        await this.openContextMenu(panelOptions);
      } else {
        await this.openContextMenu();
      }
      await testSubjects.click(CLONE_PANEL_DATA_TEST_SUBJ);
    }

    async openInspectorByTitle(title: string) {
      const header = await this.getPanelHeading(title);
      await this.openInspector(header);
    }

    async openInspector(parent: WebElementWrapper) {
      await this.openContextMenu(parent);
      const exists = await testSubjects.exists(OPEN_INSPECTOR_TEST_SUBJ);
      if (!exists) {
        await this.clickContextMenuMoreItem();
      }
      await testSubjects.click(OPEN_INSPECTOR_TEST_SUBJ);
    }

    async expectExistsRemovePanelAction() {
      log.debug('expectExistsRemovePanelAction');
      await this.expectExistsPanelAction(REMOVE_PANEL_DATA_TEST_SUBJ);
    }

    async expectExistsPanelAction(testSubject: string) {
      log.debug('expectExistsPanelAction', testSubject);
      await this.openContextMenu();
      if (await testSubjects.exists(CLONE_PANEL_DATA_TEST_SUBJ)) return;
      if (await this.hasContextMenuMoreItem()) {
        await this.clickContextMenuMoreItem();
      }
      await testSubjects.existOrFail(CLONE_PANEL_DATA_TEST_SUBJ);
      await this.toggleContextMenu();
    }

    async expectMissingPanelAction(testSubject: string) {
      log.debug('expectMissingPanelAction', testSubject);
      await this.openContextMenu();
      await testSubjects.missingOrFail(testSubject);
      if (await this.hasContextMenuMoreItem()) {
        await this.clickContextMenuMoreItem();
        await testSubjects.missingOrFail(testSubject);
      }
      await this.toggleContextMenu();
    }

    async expectExistsEditPanelAction() {
      log.debug('expectExistsEditPanelAction');
      await this.expectExistsPanelAction(EDIT_PANEL_DATA_TEST_SUBJ);
    }

    async expectExistsReplacePanelAction() {
      log.debug('expectExistsReplacePanelAction');
      await this.expectExistsPanelAction(REPLACE_PANEL_DATA_TEST_SUBJ);
    }

    async expectExistsClonePanelAction() {
      log.debug('expectExistsClonePanelAction');
      await this.expectExistsPanelAction(CLONE_PANEL_DATA_TEST_SUBJ);
    }

    async expectMissingEditPanelAction() {
      log.debug('expectMissingEditPanelAction');
      await this.expectMissingPanelAction(EDIT_PANEL_DATA_TEST_SUBJ);
    }

    async expectMissingReplacePanelAction() {
      log.debug('expectMissingReplacePanelAction');
      await this.expectMissingPanelAction(REPLACE_PANEL_DATA_TEST_SUBJ);
    }

    async expectMissingDuplicatePanelAction() {
      log.debug('expectMissingDuplicatePanelAction');
      await this.expectMissingPanelAction(CLONE_PANEL_DATA_TEST_SUBJ);
    }

    async expectMissingRemovePanelAction() {
      log.debug('expectMissingRemovePanelAction');
      await this.expectMissingPanelAction(REMOVE_PANEL_DATA_TEST_SUBJ);
    }

    async expectExistsToggleExpandAction() {
      log.debug('expectExistsToggleExpandAction');
      await this.expectExistsPanelAction(TOGGLE_EXPAND_PANEL_DATA_TEST_SUBJ);
    }

    async getPanelHeading(title: string) {
      return await testSubjects.find(`embeddablePanelHeading-${title.replace(/\s/g, '')}`);
    }

    async clickHidePanelTitleToggle() {
      await testSubjects.click('customizePanelHideTitle');
    }

    async toggleHidePanelTitle(originalTitle: string) {
      log.debug(`hidePanelTitle(${originalTitle})`);
      if (originalTitle) {
        const panelOptions = await this.getPanelHeading(originalTitle);
        await this.customizePanel(panelOptions);
      } else {
        await this.customizePanel();
      }
      await this.clickHidePanelTitleToggle();
      await testSubjects.click('saveNewTitleButton');
    }

    /**
     *
     * @param customTitle
     * @param originalTitle - optional to specify which panel to change the title on.
     * @return {Promise<void>}
     */
    async setCustomPanelTitle(customTitle: string, originalTitle?: string) {
      log.debug(`setCustomPanelTitle(${customTitle}, ${originalTitle})`);
      if (originalTitle) {
        const panelOptions = await this.getPanelHeading(originalTitle);
        await this.customizePanel(panelOptions);
      } else {
        await this.customizePanel();
      }
      await testSubjects.setValue('customEmbeddablePanelTitleInput', customTitle);
      await testSubjects.click('saveNewTitleButton');
    }

    async resetCustomPanelTitle(panel: WebElementWrapper) {
      log.debug('resetCustomPanelTitle');
      await this.customizePanel(panel);
      await testSubjects.click('resetCustomEmbeddablePanelTitle');
      await testSubjects.click('saveNewTitleButton');
      await this.toggleContextMenu(panel);
    }

    async getActionWebElementByText(text: string): Promise<WebElementWrapper> {
      log.debug(`getActionWebElement: "${text}"`);
      const menu = await testSubjects.find('multipleActionsContextMenu');
      const items = await menu.findAllByCssSelector('[data-test-subj*="embeddablePanelAction-"]');
      for (const item of items) {
        const currentText = await item.getVisibleText();
        if (currentText === text) {
          return item;
        }
      }

      throw new Error(`No action matching text "${text}"`);
    }
  })();
}
