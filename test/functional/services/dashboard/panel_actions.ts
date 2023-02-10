/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { WebElementWrapper } from '../lib/web_element_wrapper';
import { FtrService } from '../../ftr_provider_context';

const REMOVE_PANEL_DATA_TEST_SUBJ = 'embeddablePanelAction-deletePanel';
const EDIT_PANEL_DATA_TEST_SUBJ = 'embeddablePanelAction-editPanel';
const REPLACE_PANEL_DATA_TEST_SUBJ = 'embeddablePanelAction-replacePanel';
const CLONE_PANEL_DATA_TEST_SUBJ = 'embeddablePanelAction-clonePanel';
const TOGGLE_EXPAND_PANEL_DATA_TEST_SUBJ = 'embeddablePanelAction-togglePanel';
const CUSTOMIZE_PANEL_DATA_TEST_SUBJ = 'embeddablePanelAction-ACTION_CUSTOMIZE_PANEL';
const OPEN_CONTEXT_MENU_ICON_DATA_TEST_SUBJ = 'embeddablePanelToggleMenuIcon';
const OPEN_INSPECTOR_TEST_SUBJ = 'embeddablePanelAction-openInspector';
const COPY_PANEL_TO_DATA_TEST_SUBJ = 'embeddablePanelAction-copyToDashboard';
const SAVE_TO_LIBRARY_TEST_SUBJ = 'embeddablePanelAction-saveToLibrary';
const UNLINK_FROM_LIBRARY_TEST_SUBJ = 'embeddablePanelAction-unlinkFromLibrary';
const CONVERT_TO_LENS_TEST_SUBJ = 'embeddablePanelAction-ACTION_EDIT_IN_LENS';

export class DashboardPanelActionsService extends FtrService {
  private readonly log = this.ctx.getService('log');
  private readonly testSubjects = this.ctx.getService('testSubjects');
  private readonly inspector = this.ctx.getService('inspector');
  private readonly header = this.ctx.getPageObject('header');
  private readonly common = this.ctx.getPageObject('common');
  private readonly dashboard = this.ctx.getPageObject('dashboard');

  async findContextMenu(parent?: WebElementWrapper) {
    return parent
      ? await this.testSubjects.findDescendant(OPEN_CONTEXT_MENU_ICON_DATA_TEST_SUBJ, parent)
      : await this.testSubjects.find(OPEN_CONTEXT_MENU_ICON_DATA_TEST_SUBJ);
  }

  async isContextMenuIconVisible() {
    this.log.debug('isContextMenuIconVisible');
    return await this.testSubjects.exists(OPEN_CONTEXT_MENU_ICON_DATA_TEST_SUBJ);
  }

  async toggleContextMenu(parent?: WebElementWrapper) {
    this.log.debug(`toggleContextMenu(${parent})`);
    await (parent ? parent.moveMouseTo() : this.testSubjects.moveMouseTo('dashboardPanelTitle'));
    const toggleMenuItem = await this.findContextMenu(parent);
    await toggleMenuItem.click();
  }

  async expectContextMenuToBeOpen() {
    this.log.debug('expectContextMenuToBeOpen');
    await this.testSubjects.existOrFail('embeddablePanelContextMenuOpen');
  }

  async openContextMenu(parent?: WebElementWrapper) {
    this.log.debug(`openContextMenu(${parent}`);
    await this.toggleContextMenu(parent);
    await this.expectContextMenuToBeOpen();
  }

  async hasContextMenuMoreItem() {
    return await this.testSubjects.exists('embeddablePanelMore-mainMenu');
  }

  async clickContextMenuMoreItem() {
    this.log.debug('clickContextMenuMoreItem');
    await this.expectContextMenuToBeOpen();
    const hasMoreSubPanel = await this.hasContextMenuMoreItem();
    if (hasMoreSubPanel) {
      await this.testSubjects.click('embeddablePanelMore-mainMenu');
    }
  }

  async openContextMenuMorePanel(parent?: WebElementWrapper) {
    await this.openContextMenu(parent);
    await this.clickContextMenuMoreItem();
  }

  async clickEdit() {
    this.log.debug('clickEdit');
    await this.expectContextMenuToBeOpen();
    const isActionVisible = await this.testSubjects.exists(EDIT_PANEL_DATA_TEST_SUBJ);
    if (!isActionVisible) await this.clickContextMenuMoreItem();
    await this.testSubjects.clickWhenNotDisabledWithoutRetry(EDIT_PANEL_DATA_TEST_SUBJ);
    await this.header.waitUntilLoadingHasFinished();
    await this.common.waitForTopNavToBeVisible();
  }

  async editPanelByTitle(title?: string) {
    this.log.debug(`editPanelByTitle(${title})`);
    if (title) {
      const panelOptions = await this.getPanelHeading(title);
      await this.openContextMenu(panelOptions);
    } else {
      await this.openContextMenu();
    }
    await this.testSubjects.clickWhenNotDisabledWithoutRetry(EDIT_PANEL_DATA_TEST_SUBJ);
  }

  async clickExpandPanelToggle() {
    this.log.debug(`clickExpandPanelToggle`);
    await this.expectContextMenuToBeOpen();
    const isActionVisible = await this.testSubjects.exists(TOGGLE_EXPAND_PANEL_DATA_TEST_SUBJ);
    if (!isActionVisible) await this.clickContextMenuMoreItem();
    await this.testSubjects.click(TOGGLE_EXPAND_PANEL_DATA_TEST_SUBJ);
  }

  async removePanel(parent?: WebElementWrapper) {
    this.log.debug('removePanel');
    await this.openContextMenu(parent);
    const isActionVisible = await this.testSubjects.exists(REMOVE_PANEL_DATA_TEST_SUBJ);
    if (!isActionVisible) await this.clickContextMenuMoreItem();
    const isPanelActionVisible = await this.testSubjects.exists(REMOVE_PANEL_DATA_TEST_SUBJ);
    if (!isPanelActionVisible) await this.clickContextMenuMoreItem();
    await this.testSubjects.click(REMOVE_PANEL_DATA_TEST_SUBJ);
  }

  async removePanelByTitle(title: string) {
    const header = await this.getPanelHeading(title);
    this.log.debug('found header? ', Boolean(header));
    await this.removePanel(header);
  }

  async customizePanel(parent?: WebElementWrapper) {
    this.log.debug('customizePanel');
    await this.openContextMenu(parent);
    const isActionVisible = await this.testSubjects.exists(CUSTOMIZE_PANEL_DATA_TEST_SUBJ);
    if (!isActionVisible) await this.clickContextMenuMoreItem();
    const isPanelActionVisible = await this.testSubjects.exists(CUSTOMIZE_PANEL_DATA_TEST_SUBJ);
    if (!isPanelActionVisible) await this.clickContextMenuMoreItem();
    await this.testSubjects.click(CUSTOMIZE_PANEL_DATA_TEST_SUBJ);
  }

  async replacePanelByTitle(title?: string) {
    this.log.debug(`replacePanel(${title})`);
    if (title) {
      const panelOptions = await this.getPanelHeading(title);
      await this.openContextMenu(panelOptions);
    } else {
      await this.openContextMenu();
    }
    const actionExists = await this.testSubjects.exists(REPLACE_PANEL_DATA_TEST_SUBJ);
    if (!actionExists) {
      await this.clickContextMenuMoreItem();
    }
    await this.testSubjects.click(REPLACE_PANEL_DATA_TEST_SUBJ);
  }

  async clonePanelByTitle(title?: string) {
    this.log.debug(`clonePanel(${title})`);
    if (title) {
      const panelOptions = await this.getPanelHeading(title);
      await this.openContextMenu(panelOptions);
    } else {
      await this.openContextMenu();
    }
    await this.testSubjects.click(CLONE_PANEL_DATA_TEST_SUBJ);
    await this.dashboard.waitForRenderComplete();
  }

  async openCopyToModalByTitle(title?: string) {
    this.log.debug(`copyPanelTo(${title})`);
    if (title) {
      const panelOptions = await this.getPanelHeading(title);
      await this.openContextMenu(panelOptions);
    } else {
      await this.openContextMenu();
    }
    const isActionVisible = await this.testSubjects.exists(COPY_PANEL_TO_DATA_TEST_SUBJ);
    if (!isActionVisible) await this.clickContextMenuMoreItem();
    await this.testSubjects.click(COPY_PANEL_TO_DATA_TEST_SUBJ);
  }

  async openInspectorByTitle(title: string) {
    const header = await this.getPanelHeading(title);
    await this.openInspector(header);
  }

  async getSearchSessionIdByTitle(title: string) {
    await this.openInspectorByTitle(title);
    await this.inspector.openInspectorRequestsView();
    const searchSessionId = await (
      await this.testSubjects.find('inspectorRequestSearchSessionId')
    ).getAttribute('data-search-session-id');
    await this.inspector.close();
    return searchSessionId;
  }

  async getSearchResponseByTitle(title: string) {
    await this.openInspectorByTitle(title);
    await this.inspector.openInspectorRequestsView();
    const response = await this.inspector.getResponse();
    await this.inspector.close();
    return response;
  }

  async openInspector(parent?: WebElementWrapper) {
    await this.openContextMenu(parent);
    const exists = await this.testSubjects.exists(OPEN_INSPECTOR_TEST_SUBJ);
    if (!exists) {
      await this.clickContextMenuMoreItem();
    }
    await this.testSubjects.click(OPEN_INSPECTOR_TEST_SUBJ);
  }

  async unlinkFromLibary(parent?: WebElementWrapper) {
    this.log.debug('unlinkFromLibrary');
    await this.openContextMenu(parent);
    const exists = await this.testSubjects.exists(UNLINK_FROM_LIBRARY_TEST_SUBJ);
    if (!exists) {
      await this.clickContextMenuMoreItem();
    }
    await this.testSubjects.click(UNLINK_FROM_LIBRARY_TEST_SUBJ);
  }

  async saveToLibrary(newTitle: string, parent?: WebElementWrapper) {
    this.log.debug('saveToLibrary');
    await this.openContextMenu(parent);
    const exists = await this.testSubjects.exists(SAVE_TO_LIBRARY_TEST_SUBJ);
    if (!exists) {
      await this.clickContextMenuMoreItem();
    }
    await this.testSubjects.click(SAVE_TO_LIBRARY_TEST_SUBJ);
    await this.testSubjects.setValue('savedObjectTitle', newTitle, {
      clearWithKeyboard: true,
    });
    await this.testSubjects.click('confirmSaveSavedObjectButton');
  }

  async expectExistsPanelAction(testSubject: string, title?: string) {
    this.log.debug('expectExistsPanelAction', testSubject);

    const panelWrapper = title ? await this.getPanelHeading(title) : undefined;
    await this.openContextMenu(panelWrapper);

    if (!(await this.testSubjects.exists(testSubject))) {
      if (await this.hasContextMenuMoreItem()) {
        await this.clickContextMenuMoreItem();
      }
      await this.testSubjects.existOrFail(testSubject);
    }
    await this.toggleContextMenu(panelWrapper);
  }

  async expectExistsRemovePanelAction() {
    this.log.debug('expectExistsRemovePanelAction');
    await this.expectExistsPanelAction(REMOVE_PANEL_DATA_TEST_SUBJ);
  }

  async expectExistsEditPanelAction(title?: string) {
    this.log.debug('expectExistsEditPanelAction');
    await this.expectExistsPanelAction(EDIT_PANEL_DATA_TEST_SUBJ, title);
  }

  async expectExistsReplacePanelAction() {
    this.log.debug('expectExistsReplacePanelAction');
    await this.expectExistsPanelAction(REPLACE_PANEL_DATA_TEST_SUBJ);
  }

  async expectExistsClonePanelAction() {
    this.log.debug('expectExistsClonePanelAction');
    await this.expectExistsPanelAction(CLONE_PANEL_DATA_TEST_SUBJ);
  }

  async expectExistsToggleExpandAction() {
    this.log.debug('expectExistsToggleExpandAction');
    await this.expectExistsPanelAction(TOGGLE_EXPAND_PANEL_DATA_TEST_SUBJ);
  }

  async expectMissingPanelAction(testSubject: string) {
    this.log.debug('expectMissingPanelAction', testSubject);
    await this.openContextMenu();
    await this.testSubjects.missingOrFail(testSubject);
    if (await this.hasContextMenuMoreItem()) {
      await this.clickContextMenuMoreItem();
      await this.testSubjects.missingOrFail(testSubject);
    }
    await this.toggleContextMenu();
  }

  async expectMissingEditPanelAction() {
    this.log.debug('expectMissingEditPanelAction');
    await this.expectMissingPanelAction(EDIT_PANEL_DATA_TEST_SUBJ);
  }

  async expectMissingReplacePanelAction() {
    this.log.debug('expectMissingReplacePanelAction');
    await this.expectMissingPanelAction(REPLACE_PANEL_DATA_TEST_SUBJ);
  }

  async expectMissingDuplicatePanelAction() {
    this.log.debug('expectMissingDuplicatePanelAction');
    await this.expectMissingPanelAction(CLONE_PANEL_DATA_TEST_SUBJ);
  }

  async expectMissingRemovePanelAction() {
    this.log.debug('expectMissingRemovePanelAction');
    await this.expectMissingPanelAction(REMOVE_PANEL_DATA_TEST_SUBJ);
  }

  async getPanelHeading(title: string) {
    return await this.testSubjects.find(`embeddablePanelHeading-${title.replace(/\s/g, '')}`);
  }

  async getActionWebElementByText(text: string): Promise<WebElementWrapper> {
    this.log.debug(`getActionWebElement: "${text}"`);
    const menu = await this.testSubjects.find('multipleActionsContextMenu');
    const items = await menu.findAllByCssSelector('[data-test-subj*="embeddablePanelAction-"]');
    for (const item of items) {
      const currentText = await item.getVisibleText();
      if (currentText === text) {
        return item;
      }
    }

    throw new Error(`No action matching text "${text}"`);
  }

  async convertToLens(parent?: WebElementWrapper) {
    this.log.debug('convertToLens');
    await this.openContextMenu(parent);
    const isActionVisible = await this.testSubjects.exists(CONVERT_TO_LENS_TEST_SUBJ);
    if (!isActionVisible) await this.clickContextMenuMoreItem();
    const isPanelActionVisible = await this.testSubjects.exists(CONVERT_TO_LENS_TEST_SUBJ);
    if (!isPanelActionVisible) await this.clickContextMenuMoreItem();
    await this.testSubjects.click(CONVERT_TO_LENS_TEST_SUBJ);
  }
}
