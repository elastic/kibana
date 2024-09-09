/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { WebElementWrapper } from '@kbn/ftr-common-functional-ui-services';
import { FtrService } from '../../ftr_provider_context';

const REMOVE_PANEL_DATA_TEST_SUBJ = 'embeddablePanelAction-deletePanel';
const EDIT_PANEL_DATA_TEST_SUBJ = 'embeddablePanelAction-editPanel';
const INLINE_EDIT_PANEL_DATA_TEST_SUBJ = 'embeddablePanelAction-ACTION_CONFIGURE_IN_LENS';
const EDIT_IN_LENS_EDITOR_DATA_TEST_SUBJ = 'navigateToLensEditorLink';
const CLONE_PANEL_DATA_TEST_SUBJ = 'embeddablePanelAction-clonePanel';
const TOGGLE_EXPAND_PANEL_DATA_TEST_SUBJ = 'embeddablePanelAction-togglePanel';
const CUSTOMIZE_PANEL_DATA_TEST_SUBJ = 'embeddablePanelAction-ACTION_CUSTOMIZE_PANEL';
const OPEN_CONTEXT_MENU_ICON_DATA_TEST_SUBJ = 'embeddablePanelToggleMenuIcon';
const OPEN_INSPECTOR_TEST_SUBJ = 'embeddablePanelAction-openInspector';
const COPY_PANEL_TO_DATA_TEST_SUBJ = 'embeddablePanelAction-copyToDashboard';
const LEGACY_SAVE_TO_LIBRARY_TEST_SUBJ = 'embeddablePanelAction-legacySaveToLibrary';
const SAVE_TO_LIBRARY_TEST_SUBJ = 'embeddablePanelAction-saveToLibrary';
const LEGACY_UNLINK_FROM_LIBRARY_TEST_SUBJ = 'embeddablePanelAction-legacyUnlinkFromLibrary';
const UNLINK_FROM_LIBRARY_TEST_SUBJ = 'embeddablePanelAction-unlinkFromLibrary';
const CONVERT_TO_LENS_TEST_SUBJ = 'embeddablePanelAction-ACTION_EDIT_IN_LENS';

const DASHBOARD_TOP_OFFSET = 96 + 105; // 96 for Kibana navigation bar + 105 for dashboard top nav bar (in edit mode)

export class DashboardPanelActionsService extends FtrService {
  private readonly log = this.ctx.getService('log');
  private readonly retry = this.ctx.getService('retry');
  private readonly browser = this.ctx.getService('browser');
  private readonly find = this.ctx.getService('find');
  private readonly inspector = this.ctx.getService('inspector');
  private readonly testSubjects = this.ctx.getService('testSubjects');

  private readonly header = this.ctx.getPageObject('header');
  private readonly common = this.ctx.getPageObject('common');
  private readonly dashboard = this.ctx.getPageObject('dashboard');

  async findContextMenu(parent?: WebElementWrapper) {
    this.log.debug('findContextMenu');
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
    if (parent) {
      await parent.scrollIntoViewIfNecessary(DASHBOARD_TOP_OFFSET);
      await this.browser.getActions().move({ x: 0, y: 0, origin: parent._webElement }).perform();
    } else {
      await this.testSubjects.moveMouseTo('dashboardPanelTitle');
    }
    const toggleMenuItem = await this.findContextMenu(parent);
    await toggleMenuItem.click(DASHBOARD_TOP_OFFSET);
  }

  async toggleContextMenuByTitle(title = '') {
    this.log.debug(`toggleContextMenu(${title})`);
    const header = await this.getPanelHeading(title);
    await this.toggleContextMenu(header);
  }

  async expectContextMenuToBeOpen() {
    this.log.debug('expectContextMenuToBeOpen');
    await this.testSubjects.existOrFail('embeddablePanelContextMenuOpen');
  }

  async openContextMenu(parent?: WebElementWrapper) {
    this.log.debug(`openContextMenu`);
    const open = await this.testSubjects.exists('embeddablePanelContextMenuOpen');
    if (!open) await this.toggleContextMenu(parent);
    await this.expectContextMenuToBeOpen();
  }

  async openContextMenuByTitle(title = '') {
    this.log.debug(`openContextMenuByTitle(${title})`);
    const header = await this.getPanelHeading(title);
    await this.openContextMenu(header);
  }

  async hasContextMenuMoreItem() {
    this.log.debug('hasContextMenuMoreItem');
    return await this.testSubjects.exists('embeddablePanelMore-mainMenu', { timeout: 500 });
  }

  async clickContextMenuMoreItem() {
    this.log.debug('clickContextMenuMoreItem');
    await this.expectContextMenuToBeOpen();
    if (await this.hasContextMenuMoreItem()) {
      await this.testSubjects.clickWhenNotDisabledWithoutRetry('embeddablePanelMore-mainMenu');
    }
  }

  async openContextMenuMorePanel(parent?: WebElementWrapper) {
    this.log.debug('openContextMenuMorePanel');
    await this.openContextMenu(parent);
    await this.clickContextMenuMoreItem();
  }

  async clickContextMenuItem(testSubject: string, parent?: WebElementWrapper) {
    this.log.debug(`clickContextMenuItem(${testSubject})`);
    await this.openContextMenu(parent);
    const exists = await this.testSubjects.exists(testSubject, { timeout: 500 });
    if (!exists) {
      await this.clickContextMenuMoreItem();
    }
    await this.testSubjects.clickWhenNotDisabledWithoutRetry(testSubject, { timeout: 500 });
  }

  async clickContextMenuItemByTitle(testSubject: string, title = '') {
    this.log.debug(`openContextMenuByTitle(${title})`);
    const header = await this.getPanelHeading(title);
    await this.clickContextMenuItem(testSubject, header);
  }

  async navigateToEditorFromFlyout() {
    this.log.debug('navigateToEditorFromFlyout');
    await this.clickContextMenuItem(INLINE_EDIT_PANEL_DATA_TEST_SUBJ);
    await this.header.waitUntilLoadingHasFinished();
    await this.testSubjects.clickWhenNotDisabledWithoutRetry(EDIT_IN_LENS_EDITOR_DATA_TEST_SUBJ);
    const isConfirmModalVisible = await this.testSubjects.exists('confirmModalConfirmButton');
    if (isConfirmModalVisible) {
      await this.testSubjects.clickWhenNotDisabledWithoutRetry('confirmModalConfirmButton', {
        timeout: 20000,
      });
    }
  }

  async clickInlineEdit() {
    this.log.debug('clickInlineEditAction');
    await this.clickContextMenuItem(INLINE_EDIT_PANEL_DATA_TEST_SUBJ);
    await this.header.waitUntilLoadingHasFinished();
    await this.common.waitForTopNavToBeVisible();
  }

  /**
   * The dashboard/canvas panels can be either edited on their editor or inline.
   * The inline editing panels allow the navigation to the editor after the flyout opens
   */
  async clickEdit(parent?: WebElementWrapper) {
    this.log.debug('clickEdit');
    await this.openContextMenu(parent);
    const isActionVisible = await this.testSubjects.exists(EDIT_PANEL_DATA_TEST_SUBJ);
    const isInlineEditingActionVisible = await this.testSubjects.exists(
      INLINE_EDIT_PANEL_DATA_TEST_SUBJ
    );
    if (!isActionVisible && !isInlineEditingActionVisible) await this.clickContextMenuMoreItem();
    // navigate to the editor
    if (await this.testSubjects.exists(EDIT_PANEL_DATA_TEST_SUBJ)) {
      await this.testSubjects.clickWhenNotDisabledWithoutRetry(EDIT_PANEL_DATA_TEST_SUBJ);
      // open the flyout and then navigate to the editor
    } else {
      await this.navigateToEditorFromFlyout();
    }
    await this.header.waitUntilLoadingHasFinished();
    await this.common.waitForTopNavToBeVisible();
  }

  /**
   * The dashboard/canvas panels can be either edited on their editor or inline.
   * The inline editing panels allow the navigation to the editor after the flyout opens
   */
  async editPanelByTitle(title = '') {
    this.log.debug(`editPanelByTitle(${title})`);
    const header = await this.getPanelHeading(title);
    await this.clickEdit(header);
  }

  async clickExpandPanelToggle() {
    this.log.debug(`clickExpandPanelToggle`);
    await this.openContextMenu();
    await this.clickContextMenuItem(TOGGLE_EXPAND_PANEL_DATA_TEST_SUBJ);
  }

  async removePanel(parent?: WebElementWrapper) {
    this.log.debug('removePanel');
    await this.openContextMenu(parent);
    await this.clickContextMenuItem(REMOVE_PANEL_DATA_TEST_SUBJ, parent);
  }

  async removePanelByTitle(title = '') {
    this.log.debug(`removePanel(${title})`);
    const header = await this.getPanelHeading(title);
    this.log.debug('found header? ', Boolean(header));
    await this.removePanel(header);
  }

  async customizePanel(title = '') {
    this.log.debug(`customizePanel(${title})`);
    const header = await this.getPanelHeading(title);
    await this.clickContextMenuItem(CUSTOMIZE_PANEL_DATA_TEST_SUBJ, header);
  }

  async clonePanel(title = '') {
    this.log.debug(`clonePanel(${title})`);
    const header = await this.getPanelHeading(title);
    await this.clickContextMenuItem(CLONE_PANEL_DATA_TEST_SUBJ, header);
    await this.dashboard.waitForRenderComplete();
  }

  async openCopyToModalByTitle(title = '') {
    this.log.debug(`copyPanelTo(${title})`);
    const header = await this.getPanelHeading(title);
    await this.clickContextMenuItem(COPY_PANEL_TO_DATA_TEST_SUBJ, header);
  }

  async openInspectorByTitle(title: string) {
    this.log.debug(`openInspector(${title})`);
    const header = await this.getPanelHeading(title);
    await this.openInspector(header);
  }

  async getSearchSessionIdByTitle(title: string) {
    this.log.debug(`getSearchSessionId(${title})`);
    await this.openInspectorByTitle(title);
    await this.inspector.openInspectorRequestsView();
    const searchSessionId = await (
      await this.testSubjects.find('inspectorRequestSearchSessionId')
    ).getAttribute('data-search-session-id');
    await this.inspector.close();
    return searchSessionId;
  }

  async getSearchResponseByTitle(title: string) {
    this.log.debug(`setSearchResponse(${title})`);
    await this.openInspectorByTitle(title);
    await this.inspector.openInspectorRequestsView();
    const response = await this.inspector.getResponse();
    await this.inspector.close();
    return response;
  }

  async openInspector(parent?: WebElementWrapper) {
    this.log.debug(`openInspector`);
    await this.clickContextMenuItem(OPEN_INSPECTOR_TEST_SUBJ, parent);
  }

  async legacyUnlinkFromLibrary(title = '') {
    this.log.debug(`legacyUnlinkFromLibrary(${title}`);
    const header = await this.getPanelHeading(title);
    await this.clickContextMenuItem(LEGACY_UNLINK_FROM_LIBRARY_TEST_SUBJ, header);
    await this.testSubjects.existOrFail('unlinkPanelSuccess');
    await this.expectNotLinkedToLibrary(title, true);
  }

  async unlinkFromLibrary(title = '') {
    this.log.debug(`unlinkFromLibrary(${title})`);
    const header = await this.getPanelHeading(title);
    await this.clickContextMenuItem(UNLINK_FROM_LIBRARY_TEST_SUBJ, header);
    await this.testSubjects.existOrFail('unlinkPanelSuccess');
    await this.expectNotLinkedToLibrary(title);
  }

  async legacySaveToLibrary(newTitle = '', oldTitle = '') {
    this.log.debug(`legacySaveToLibrary(${newTitle},${oldTitle})`);
    const header = await this.getPanelHeading(oldTitle);
    await this.clickContextMenuItem(LEGACY_SAVE_TO_LIBRARY_TEST_SUBJ, header);
    await this.testSubjects.setValue('savedObjectTitle', newTitle, {
      clearWithKeyboard: true,
    });
    await this.testSubjects.clickWhenNotDisabledWithoutRetry('confirmSaveSavedObjectButton');
    await this.testSubjects.existOrFail('addPanelToLibrarySuccess');
    await this.expectLinkedToLibrary(newTitle, true);
  }

  async saveToLibrary(newTitle = '', oldTitle = '') {
    this.log.debug(`saveToLibraryByTitle(${newTitle},${oldTitle})`);
    const header = await this.getPanelHeading(oldTitle);
    await this.clickContextMenuItem(SAVE_TO_LIBRARY_TEST_SUBJ, header);
    await this.testSubjects.setValue('savedObjectTitle', newTitle, {
      clearWithKeyboard: true,
    });
    await this.testSubjects.clickWhenNotDisabledWithoutRetry('confirmSaveSavedObjectButton');
    await this.testSubjects.existOrFail('addPanelToLibrarySuccess');
    await this.expectLinkedToLibrary(newTitle);
  }

  async expectExistsPanelAction(testSubject: string, title = '') {
    this.log.debug('expectExistsPanelAction', testSubject, title);

    const panelWrapper = await this.getPanelHeading(title);
    await this.openContextMenu(panelWrapper);
    if (!(await this.testSubjects.exists(testSubject, { timeout: 1000 }))) {
      if (await this.hasContextMenuMoreItem()) {
        await this.clickContextMenuMoreItem();
      }
      await this.testSubjects.existOrFail(testSubject, { timeout: 1000 });
    }
    await this.toggleContextMenu(panelWrapper);
  }

  async expectExistsRemovePanelAction(title = '') {
    this.log.debug('expectExistsRemovePanelAction');
    await this.expectExistsPanelAction(REMOVE_PANEL_DATA_TEST_SUBJ, title);
  }

  async expectExistsEditPanelAction(title = '', allowsInlineEditing?: boolean) {
    this.log.debug('expectExistsEditPanelAction');
    let testSubj = EDIT_PANEL_DATA_TEST_SUBJ;
    if (allowsInlineEditing) {
      testSubj = INLINE_EDIT_PANEL_DATA_TEST_SUBJ;
    }
    await this.expectExistsPanelAction(testSubj, title);
  }

  async expectExistsClonePanelAction(title = '') {
    this.log.debug('expectExistsClonePanelAction');
    await this.expectExistsPanelAction(CLONE_PANEL_DATA_TEST_SUBJ, title);
  }

  async expectExistsToggleExpandAction(title = '') {
    this.log.debug('expectExistsToggleExpandAction');
    await this.expectExistsPanelAction(TOGGLE_EXPAND_PANEL_DATA_TEST_SUBJ, title);
  }

  async expectMissingPanelAction(testSubject: string, title = '') {
    this.log.debug(`expectMissingPanelAction(${title})`, testSubject);
    const panelWrapper = await this.getPanelHeading(title);
    await this.openContextMenu(panelWrapper);
    await this.testSubjects.missingOrFail(testSubject);
    if (await this.hasContextMenuMoreItem()) {
      await this.clickContextMenuMoreItem();
      await this.testSubjects.missingOrFail(testSubject);
    }
    await this.toggleContextMenu(panelWrapper);
  }

  async expectMissingEditPanelAction(title = '') {
    this.log.debug('expectMissingEditPanelAction');
    await this.expectMissingPanelAction(EDIT_PANEL_DATA_TEST_SUBJ, title);
  }

  async expectMissingDuplicatePanelAction(title = '') {
    this.log.debug('expectMissingDuplicatePanelAction');
    await this.expectMissingPanelAction(CLONE_PANEL_DATA_TEST_SUBJ, title);
  }

  async expectMissingRemovePanelAction(title = '') {
    this.log.debug('expectMissingRemovePanelAction');
    await this.expectMissingPanelAction(REMOVE_PANEL_DATA_TEST_SUBJ, title);
  }

  async getPanelHeading(title = '') {
    this.log.debug(`getPanelHeading(${title})`);
    if (!title) return await this.find.byClassName('embPanel__header');
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

  async canConvertToLens(parent?: WebElementWrapper) {
    this.log.debug('canConvertToLens');
    await this.openContextMenu(parent);
    const isActionVisible = await this.testSubjects.exists(CONVERT_TO_LENS_TEST_SUBJ);
    if (!isActionVisible) await this.clickContextMenuMoreItem();
    return await this.testSubjects.exists(CONVERT_TO_LENS_TEST_SUBJ, { timeout: 1000 });
  }

  async canConvertToLensByTitle(title = '') {
    this.log.debug(`canConvertToLens(${title})`);
    const header = await this.getPanelHeading(title);
    await this.openContextMenu(header);
    const isActionVisible = await this.testSubjects.exists(CONVERT_TO_LENS_TEST_SUBJ);
    if (!isActionVisible) await this.clickContextMenuMoreItem();
    return await this.testSubjects.exists(CONVERT_TO_LENS_TEST_SUBJ, { timeout: 1000 });
  }

  async convertToLens(parent?: WebElementWrapper) {
    this.log.debug('convertToLens');

    await this.retry.try(async () => {
      if (!(await this.canConvertToLens(parent))) {
        throw new Error('Convert to Lens option not found');
      }

      await this.testSubjects.clickWhenNotDisabledWithoutRetry(CONVERT_TO_LENS_TEST_SUBJ);
    });
  }

  async convertToLensByTitle(title = '') {
    this.log.debug(`convertToLens(${title})`);
    const header = await this.getPanelHeading(title);
    return await this.convertToLens(header);
  }

  public async expectLinkedToLibrary(title = '', legacy?: boolean) {
    this.log.debug(`expectLinkedToLibrary(${title})`);
    if (legacy) {
      await this.expectExistsPanelAction(LEGACY_UNLINK_FROM_LIBRARY_TEST_SUBJ, title);
    } else {
      await this.expectExistsPanelAction(UNLINK_FROM_LIBRARY_TEST_SUBJ, title);
    }
    await this.expectMissingPanelAction(LEGACY_SAVE_TO_LIBRARY_TEST_SUBJ, title);
    await this.expectMissingPanelAction(SAVE_TO_LIBRARY_TEST_SUBJ, title);
  }

  public async expectNotLinkedToLibrary(title = '', legacy?: boolean) {
    this.log.debug(`expectNotLinkedToLibrary(${title})`);
    if (legacy) {
      await this.expectExistsPanelAction(LEGACY_SAVE_TO_LIBRARY_TEST_SUBJ, title);
    } else {
      await this.expectExistsPanelAction(SAVE_TO_LIBRARY_TEST_SUBJ, title);
    }
    await this.expectMissingPanelAction(LEGACY_UNLINK_FROM_LIBRARY_TEST_SUBJ, title);
    await this.expectMissingPanelAction(UNLINK_FROM_LIBRARY_TEST_SUBJ, title);
  }
}
