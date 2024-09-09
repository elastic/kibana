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
  private readonly find = this.ctx.getService('find');
  private readonly inspector = this.ctx.getService('inspector');
  private readonly testSubjects = this.ctx.getService('testSubjects');

  private readonly header = this.ctx.getPageObject('header');
  private readonly common = this.ctx.getPageObject('common');
  private readonly dashboard = this.ctx.getPageObject('dashboard');

  async findContextMenuByTitle(title = '') {
    this.log.debug(`findContextMenuByTitle(${title})`);
    const header = await this.getPanelHoverActions(title);
    return this.findContextMenu(header);
  }

  async findContextMenu(parent?: WebElementWrapper) {
    return parent
      ? await parent.findByTestSubject(OPEN_CONTEXT_MENU_ICON_DATA_TEST_SUBJ)
      : await this.testSubjects.find(OPEN_CONTEXT_MENU_ICON_DATA_TEST_SUBJ);
  }

  async scrollParentIntoView(parent?: WebElementWrapper) {
    this.log.debug(`scrollParentIntoView`);
    if (!parent) parent = await this.testSubjects.find('dashboardPanel');
    await parent.scrollIntoView({ block: 'end' });
    await parent.moveMouseTo();
  }

  async toggleContextMenu(parent?: WebElementWrapper) {
    this.log.debug(`toggleContextMenu`);
    const toggleMenuItem = await this.findContextMenu(parent);
    await toggleMenuItem.click(DASHBOARD_TOP_OFFSET);
  }

  async toggleContextMenuByTitle(title = '') {
    this.log.debug(`toggleContextMenu(${title})`);
    const header = await this.getPanelHoverActions(title);
    await this.toggleContextMenu(header);
  }

  async expectContextMenuToBeOpen() {
    this.log.debug('expectContextMenuToBeOpen');
    await this.testSubjects.existOrFail('embeddablePanelContextMenuOpen', { allowHidden: true });
  }

  async openContextMenu(parent?: WebElementWrapper) {
    this.log.debug(`openContextMenu(${parent}`);
    const open = await this.testSubjects.exists('embeddablePanelContextMenuOpen', {
      allowHidden: true,
    });
    if (!open) await this.toggleContextMenu(parent);
    await this.expectContextMenuToBeOpen();
  }

  async openContextMenuByTitle(title = '') {
    this.log.debug(`openContextMenuByTitle(${title})`);
    const header = await this.getPanelHoverActions(title);
    await this.openContextMenu(header);
  }

  async clickPanelAction(testSubject: string, parent?: WebElementWrapper) {
    this.log.debug(`clickPanelAction(${testSubject})`);

    await this.scrollParentIntoView(parent);
    const exists = await this.testSubjects.exists(testSubject, { allowHidden: true });
    if (!exists) await this.openContextMenu(parent);
    await this.testSubjects.existOrFail(testSubject);
    await this.testSubjects.click(testSubject);
  }

  async clickPanelActionByTitle(testSubject: string, title = '') {
    this.log.debug(`openContextMenuByTitle(${testSubject},${title})`);
    const header = await this.getPanelHoverActions(title);
    await this.clickPanelAction(testSubject, header);
  }

  async navigateToEditorFromFlyout(parent?: WebElementWrapper) {
    this.log.debug('navigateToEditorFromFlyout');
    await this.clickPanelAction(INLINE_EDIT_PANEL_DATA_TEST_SUBJ, parent);
    await this.header.waitUntilLoadingHasFinished();
    await this.testSubjects.click(EDIT_IN_LENS_EDITOR_DATA_TEST_SUBJ);
    const isConfirmModalVisible = await this.testSubjects.exists('confirmModalConfirmButton');
    if (isConfirmModalVisible) {
      await this.testSubjects.click('confirmModalConfirmButton', 20000);
    }
  }

  async clickInlineEdit() {
    this.log.debug('clickInlineEditAction');
    await this.clickPanelAction(INLINE_EDIT_PANEL_DATA_TEST_SUBJ);
    await this.header.waitUntilLoadingHasFinished();
    await this.common.waitForTopNavToBeVisible();
  }

  /**
   * The dashboard/canvas panels can be either edited on their editor or inline.
   * The inline editing panels allow the navigation to the editor after the flyout opens
   */
  async clickEdit(parent?: WebElementWrapper) {
    this.log.debug(`clickEdit`);
    await this.scrollParentIntoView(parent);
    // navigate to the editor
    if (await this.testSubjects.exists(EDIT_PANEL_DATA_TEST_SUBJ)) {
      await this.testSubjects.clickWhenNotDisabledWithoutRetry(EDIT_PANEL_DATA_TEST_SUBJ);
      // open the flyout and then navigate to the editor
    } else {
      await this.navigateToEditorFromFlyout(parent);
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
    const header = await this.getPanelHoverActions(title);
    await this.clickEdit(header);
  }

  async clickExpandPanelToggle() {
    this.log.debug(`clickExpandPanelToggle`);
    await this.openContextMenu();
    await this.clickPanelAction(TOGGLE_EXPAND_PANEL_DATA_TEST_SUBJ);
  }

  async removePanel(parent?: WebElementWrapper) {
    this.log.debug('removePanel');
    await this.clickPanelAction(REMOVE_PANEL_DATA_TEST_SUBJ, parent);
  }

  async removePanelByTitle(title = '') {
    this.log.debug(`removePanel(${title})`);
    const header = await this.getPanelHoverActions(title);
    await this.removePanel(header);
  }

  async customizePanel(parent?: WebElementWrapper) {
    this.log.debug('customizePanel');
    await this.clickPanelAction(CUSTOMIZE_PANEL_DATA_TEST_SUBJ, parent);
  }

  async customizePanelByTitle(title = '') {
    this.log.debug('customizePanel');
    const header = await this.getPanelHoverActions(title);
    await this.clickPanelAction(CUSTOMIZE_PANEL_DATA_TEST_SUBJ, header);
  }

  async clonePanelByTitle(title = '') {
    this.log.debug(`clonePanel(${title})`);
    const header = await this.getPanelHoverActions(title);
    await this.clickPanelAction(CLONE_PANEL_DATA_TEST_SUBJ, header);
    await this.dashboard.waitForRenderComplete();
  }

  async openCopyToModalByTitle(title = '') {
    this.log.debug(`copyPanelTo(${title})`);
    const header = await this.getPanelHoverActions(title);
    await this.clickPanelAction(COPY_PANEL_TO_DATA_TEST_SUBJ, header);
  }

  async openInspectorByTitle(title = '') {
    this.log.debug(`openInspector(${title})`);
    const header = await this.getPanelHoverActions(title);
    await this.openInspector(header);
  }

  async getSearchSessionIdByTitle(title = '') {
    this.log.debug(`getSearchSessionId(${title})`);
    await this.openInspectorByTitle(title);
    await this.inspector.openInspectorRequestsView();
    const searchSessionId = await (
      await this.testSubjects.find('inspectorRequestSearchSessionId')
    ).getAttribute('data-search-session-id');
    await this.inspector.close();
    return searchSessionId;
  }

  async getSearchResponseByTitle(title = '') {
    this.log.debug(`setSearchResponse(${title})`);
    await this.openInspectorByTitle(title);
    await this.inspector.openInspectorRequestsView();
    const response = await this.inspector.getResponse();
    await this.inspector.close();
    return response;
  }

  async openInspector(parent?: WebElementWrapper) {
    this.log.debug(`openInspector`);
    await this.clickPanelAction(OPEN_INSPECTOR_TEST_SUBJ, parent);
  }

  async legacyUnlinkFromLibrary(parent?: WebElementWrapper) {
    this.log.debug('legacyUnlinkFromLibrary');
    await this.clickPanelAction(LEGACY_UNLINK_FROM_LIBRARY_TEST_SUBJ, parent);
  }

  async legacyUnlinkFromLibraryByTitle(title = '') {
    this.log.debug(`legacyUnlinkFromLibraryByTitle(${title}`);
    const header = await this.getPanelHoverActions(title);
    await this.legacyUnlinkFromLibrary(header);
    await this.expectMissingPanelAction(LEGACY_UNLINK_FROM_LIBRARY_TEST_SUBJ, title);
    await this.expectExistsPanelAction(LEGACY_SAVE_TO_LIBRARY_TEST_SUBJ, title);
  }

  async unlinkFromLibrary(parent?: WebElementWrapper) {
    this.log.debug('unlinkFromLibrary');
    await this.clickPanelAction(UNLINK_FROM_LIBRARY_TEST_SUBJ, parent);
    await this.testSubjects.waitForDeleted(
      'embeddablePanelNotification-ACTION_LIBRARY_NOTIFICATION'
    );
  }

  async unlinkFromLibraryByTitle(title = '') {
    this.log.debug(`unlinkFromLibraryByTitle(${title})`);
    const header = await this.getPanelHoverActions(title);
    await this.unlinkFromLibrary(header);
    await this.expectMissingPanelAction(UNLINK_FROM_LIBRARY_TEST_SUBJ, title);
    await this.expectExistsPanelAction(SAVE_TO_LIBRARY_TEST_SUBJ, title);
  }

  async legacySaveToLibrary(newTitle = '', parent?: WebElementWrapper) {
    this.log.debug(`legacySaveToLibrary(${newTitle})`);
    await this.clickPanelAction(LEGACY_SAVE_TO_LIBRARY_TEST_SUBJ, parent);
    await this.testSubjects.setValue('savedObjectTitle', newTitle, {
      clearWithKeyboard: true,
    });
    await this.testSubjects.click('confirmSaveSavedObjectButton');
    await this.retry.try(async () => {
      await this.testSubjects.existOrFail(
        'embeddablePanelNotification-ACTION_LIBRARY_NOTIFICATION'
      );
    });
  }

  async legacySaveToLibraryByTitle(newTitle = '', oldTitle = '') {
    this.log.debug(`legacySaveToLibraryByTitle(${newTitle},${oldTitle})`);
    const header = await this.getPanelHoverActions(oldTitle);
    await this.legacySaveToLibrary(newTitle, header);
    await this.expectMissingPanelAction(LEGACY_UNLINK_FROM_LIBRARY_TEST_SUBJ, newTitle);
    await this.expectExistsPanelAction(LEGACY_SAVE_TO_LIBRARY_TEST_SUBJ, newTitle);
  }

  async saveToLibrary(newTitle = '', parent?: WebElementWrapper) {
    this.log.debug('saveToLibrary');
    await this.clickPanelAction(SAVE_TO_LIBRARY_TEST_SUBJ, parent);
    await this.testSubjects.setValue('savedObjectTitle', newTitle, {
      clearWithKeyboard: true,
    });
    await this.testSubjects.click('confirmSaveSavedObjectButton');
    await this.retry.try(async () => {
      await this.testSubjects.existOrFail(
        'embeddablePanelNotification-ACTION_LIBRARY_NOTIFICATION'
      );
    });
  }

  async saveToLibraryByTitle(newTitle = '', oldTitle = '') {
    this.log.debug(`saveToLibraryByTitle(${newTitle},${oldTitle})`);
    const header = await this.getPanelHoverActions(oldTitle);
    await this.saveToLibrary(newTitle, header);
    await this.expectMissingPanelAction(UNLINK_FROM_LIBRARY_TEST_SUBJ, newTitle);
    await this.expectExistsPanelAction(SAVE_TO_LIBRARY_TEST_SUBJ, newTitle);
  }

  async expectExistsPanelAction(testSubject: string, title = '') {
    this.log.debug('expectExistsPanelAction', testSubject, title);

    const panelWrapper = title ? await this.getPanelHoverActions(title) : undefined;

    const exists = panelWrapper
      ? await this.testSubjects.descendantExists(testSubject, panelWrapper)
      : await this.testSubjects.exists(testSubject, { allowHidden: true });

    if (!exists) {
      await this.openContextMenu(panelWrapper);
      await this.testSubjects.existOrFail(testSubject, { allowHidden: true });
      await this.toggleContextMenu(panelWrapper);
    }
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
    this.log.debug('expectMissingPanelAction', testSubject, title);
    const panelWrapper = title ? await this.getPanelHoverActions(title) : undefined;
    const exists = panelWrapper
      ? await panelWrapper?.findAllByTestSubject(testSubject)
      : await this.testSubjects.exists(testSubject, { allowHidden: true });

    if (!exists) {
      await this.openContextMenu(panelWrapper);
      await this.testSubjects.missingOrFail(testSubject, { allowHidden: true });
      await this.toggleContextMenu(panelWrapper);
    }
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

  async getPanelHoverActions(title = '') {
    this.log.debug(`getPanelHoverActions(${title})`);
    if (!title) return await this.find.byClassName('embPanel__hoverActionsAnchor');
    return await this.testSubjects.find(`embeddablePanelHoverActions-${title.replace(/\s/g, '')}`);
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
    return await this.testSubjects.exists(CONVERT_TO_LENS_TEST_SUBJ, { timeout: 500 });
  }

  async canConvertToLensByTitle(title = '') {
    this.log.debug(`canConvertToLens(${title})`);
    const header = await this.getPanelHoverActions(title);
    return await this.canConvertToLens(header);
  }

  async convertToLens(parent?: WebElementWrapper) {
    this.log.debug('convertToLens');

    await this.retry.try(async () => {
      if (!(await this.canConvertToLens(parent))) {
        throw new Error('Convert to Lens option not found');
      }

      await this.testSubjects.click(CONVERT_TO_LENS_TEST_SUBJ);
    });
  }

  async convertToLensByTitle(title = '') {
    this.log.debug(`convertToLens(${title})`);
    const header = await this.getPanelHoverActions(title);
    return await this.convertToLens(header);
  }
}
