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
const EDIT_IN_LENS_EDITOR_DATA_TEST_SUBJ = 'navigateToLensEditorLink';
const CLONE_PANEL_DATA_TEST_SUBJ = 'embeddablePanelAction-clonePanel';
const TOGGLE_EXPAND_PANEL_DATA_TEST_SUBJ = 'embeddablePanelAction-togglePanel';
const CUSTOMIZE_PANEL_DATA_TEST_SUBJ = 'embeddablePanelAction-ACTION_CUSTOMIZE_PANEL';
const OPEN_CONTEXT_MENU_ICON_DATA_TEST_SUBJ = 'embeddablePanelToggleMenuIcon';
const OPEN_INSPECTOR_TEST_SUBJ = 'embeddablePanelAction-openInspector';
const COPY_PANEL_TO_DATA_TEST_SUBJ = 'embeddablePanelAction-copyToDashboard';
const SAVE_TO_LIBRARY_TEST_SUBJ = 'embeddablePanelAction-saveToLibrary';
const UNLINK_FROM_LIBRARY_TEST_SUBJ = 'embeddablePanelAction-unlinkFromLibrary';
const CONVERT_TO_LENS_TEST_SUBJ = 'embeddablePanelAction-ACTION_EDIT_IN_LENS';

const DASHBOARD_MARGIN_SIZE = 8;

export class DashboardPanelActionsService extends FtrService {
  private readonly log = this.ctx.getService('log');
  private readonly retry = this.ctx.getService('retry');
  private readonly find = this.ctx.getService('find');
  private readonly inspector = this.ctx.getService('inspector');
  private readonly testSubjects = this.ctx.getService('testSubjects');
  private readonly browser = this.ctx.getService('browser');

  private readonly header = this.ctx.getPageObject('header');
  private readonly common = this.ctx.getPageObject('common');
  private readonly dashboard = this.ctx.getPageObject('dashboard');

  async getContainerTopOffset() {
    const containerSelector = (await this.find.existsByCssSelector('.dashboardContainer'))
      ? '.dashboardContainer'
      : '.canvasContainer';
    return (
      (await (await this.find.byCssSelector(containerSelector)).getPosition()).y +
      DASHBOARD_MARGIN_SIZE
    );
  }

  async findContextMenu(wrapper?: WebElementWrapper) {
    this.log.debug('findContextMenu');
    return wrapper
      ? await wrapper.findByTestSubject(OPEN_CONTEXT_MENU_ICON_DATA_TEST_SUBJ)
      : await this.testSubjects.find(OPEN_CONTEXT_MENU_ICON_DATA_TEST_SUBJ);
  }

  async scrollPanelIntoView(wrapper?: WebElementWrapper) {
    this.log.debug(`scrollPanelIntoView`);
    wrapper = wrapper || (await this.getPanelWrapper());
    const yOffset = (await wrapper.getPosition()).y;
    await this.browser.execute(`
        const scrollY = window.scrollY;
        window.scrollBy(0, scrollY - ${yOffset});
      `);

    const containerTop = await this.getContainerTopOffset();

    await wrapper.moveMouseTo({
      topOffset: containerTop,
    });
  }

  async toggleContextMenu(wrapper?: WebElementWrapper) {
    this.log.debug(`toggleContextMenu`);
    await this.scrollPanelIntoView(wrapper);
    const toggleMenuItem = await this.findContextMenu(wrapper);
    await toggleMenuItem.click(await this.getContainerTopOffset());
  }

  async toggleContextMenuByTitle(title = '') {
    this.log.debug(`toggleContextMenu(${title})`);
    const wrapper = await this.getPanelWrapper(title);
    await this.toggleContextMenu(wrapper);
  }

  async expectContextMenuToBeOpen() {
    this.log.debug('expectContextMenuToBeOpen');
    await this.testSubjects.existOrFail('embeddablePanelContextMenuOpen', { allowHidden: true });
  }

  async openContextMenu(wrapper?: WebElementWrapper) {
    this.log.debug(`openContextMenu(${wrapper}`);
    const open = await this.testSubjects.exists('embeddablePanelContextMenuOpen');
    if (!open) await this.toggleContextMenu(wrapper);
    await this.expectContextMenuToBeOpen();
  }

  async openContextMenuByTitle(title = '') {
    this.log.debug(`openContextMenuByTitle(${title})`);
    const wrapper = await this.getPanelWrapper(title);
    await this.openContextMenu(wrapper);
  }

  async clickPanelAction(testSubject: string, wrapper?: WebElementWrapper) {
    this.log.debug(`clickPanelAction(${testSubject})`);
    wrapper = wrapper || (await this.getPanelWrapper());
    await this.scrollPanelIntoView(wrapper);
    const exists = await this.testSubjects.descendantExists(testSubject, wrapper);
    let action;
    if (!exists) {
      await this.openContextMenu(wrapper);
      action = await this.testSubjects.find(testSubject);
    } else {
      action = await this.testSubjects.findDescendant(testSubject, wrapper);
    }

    await action.click(await this.getContainerTopOffset());
  }

  async clickPanelActionByTitle(testSubject: string, title = '') {
    this.log.debug(`clickPanelActionByTitle(${testSubject},${title})`);
    const wrapper = await this.getPanelWrapper(title);
    await this.clickPanelAction(testSubject, wrapper);
  }

  async navigateToEditorFromFlyout(wrapper?: WebElementWrapper) {
    this.log.debug('navigateToEditorFromFlyout');
    // make sure the context menu is open before proceeding
    await this.openContextMenu();
    await this.clickPanelAction(EDIT_PANEL_DATA_TEST_SUBJ);
    await this.header.waitUntilLoadingHasFinished();
    await this.testSubjects.clickWhenNotDisabledWithoutRetry(EDIT_IN_LENS_EDITOR_DATA_TEST_SUBJ);
    const isConfirmModalVisible = await this.testSubjects.exists('confirmModalConfirmButton');
    if (isConfirmModalVisible) {
      await this.testSubjects.clickWhenNotDisabledWithoutRetry('confirmModalConfirmButton', {
        timeout: 20000,
      });
    }
  }

  async clickInlineEdit(wrapper?: WebElementWrapper) {
    this.log.debug('clickInlineEditAction');
    await this.clickPanelAction(EDIT_PANEL_DATA_TEST_SUBJ, wrapper);
    await this.header.waitUntilLoadingHasFinished();
    await this.common.waitForTopNavToBeVisible();
  }

  /**
   * The dashboard/canvas panels can be either edited on their editor or inline.
   * The inline editing panels allow the navigation to the editor after the flyout opens
   */
  async clickEdit(wrapper?: WebElementWrapper) {
    this.log.debug(`clickEdit`);
    wrapper = wrapper || (await this.getPanelWrapper());
    await this.scrollPanelIntoView(wrapper);
    if (await this.testSubjects.descendantExists(EDIT_PANEL_DATA_TEST_SUBJ, wrapper)) {
      // navigate to the editor
      await this.clickPanelAction(EDIT_PANEL_DATA_TEST_SUBJ, wrapper);
    } else {
      // open the flyout and then navigate to the editor
      await this.navigateToEditorFromFlyout(wrapper);
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
    const wrapper = await this.getPanelWrapper(title);
    await this.clickEdit(wrapper);
  }

  async clickExpandPanelToggle() {
    this.log.debug(`clickExpandPanelToggle`);
    await this.clickPanelAction(TOGGLE_EXPAND_PANEL_DATA_TEST_SUBJ);
  }

  async removePanel(wrapper?: WebElementWrapper) {
    this.log.debug('removePanel');
    await this.clickPanelAction(REMOVE_PANEL_DATA_TEST_SUBJ, wrapper);
  }

  async removePanelByTitle(title = '') {
    this.log.debug(`removePanel(${title})`);
    const wrapper = await this.getPanelWrapper(title);
    await this.removePanel(wrapper);
  }

  async customizePanel(title = '') {
    this.log.debug(`customizePanel(${title})`);
    await this.clickPanelActionByTitle(CUSTOMIZE_PANEL_DATA_TEST_SUBJ, title);
  }

  async clonePanel(title = '') {
    this.log.debug(`clonePanel(${title})`);
    await this.clickPanelActionByTitle(CLONE_PANEL_DATA_TEST_SUBJ, title);
    await this.dashboard.waitForRenderComplete();
  }

  async openCopyToModalByTitle(title = '') {
    this.log.debug(`copyPanelTo(${title})`);
    await this.clickPanelActionByTitle(COPY_PANEL_TO_DATA_TEST_SUBJ, title);
  }

  async openInspector(wrapper?: WebElementWrapper) {
    this.log.debug(`openInspector`);
    await this.clickPanelAction(OPEN_INSPECTOR_TEST_SUBJ, wrapper);
  }

  async openInspectorByTitle(title = '') {
    this.log.debug(`openInspector(${title})`);
    const wrapper = await this.getPanelWrapper(title);
    await this.openInspector(wrapper);
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

  async unlinkFromLibrary(title = '') {
    this.log.debug(`unlinkFromLibrary(${title})`);
    await this.clickPanelActionByTitle(UNLINK_FROM_LIBRARY_TEST_SUBJ, title);
    await this.testSubjects.existOrFail('unlinkPanelSuccess');
    await this.expectNotLinkedToLibrary(title);
  }

  async saveToLibrary(newTitle = '', oldTitle = '') {
    this.log.debug(`saveToLibraryByTitle(${newTitle},${oldTitle})`);
    await this.clickPanelActionByTitle(SAVE_TO_LIBRARY_TEST_SUBJ, oldTitle);
    await this.testSubjects.setValue('savedObjectTitle', newTitle, {
      clearWithKeyboard: true,
    });
    await this.testSubjects.clickWhenNotDisabledWithoutRetry('confirmSaveSavedObjectButton');
    await this.testSubjects.existOrFail('addPanelToLibrarySuccess');
    await this.expectLinkedToLibrary(newTitle);
  }

  async panelActionExists(testSubject: string, wrapper?: WebElementWrapper) {
    this.log.debug(`panelActionExists(${testSubject})`);
    return wrapper
      ? await this.testSubjects.descendantExists(testSubject, wrapper)
      : await this.testSubjects.exists(testSubject, { allowHidden: true });
  }

  async panelActionExistsByTitle(testSubject: string, title = '') {
    this.log.debug(`panelActionExists(${testSubject}) on "${title}"`);
    const wrapper = await this.getPanelWrapper(title);
    return await this.panelActionExists(testSubject, wrapper);
  }

  async expectExistsPanelAction(testSubject: string, title = '') {
    this.log.debug('expectExistsPanelAction', testSubject, title);

    const wrapper = await this.getPanelWrapper(title);

    const exists = await this.panelActionExists(testSubject, wrapper);

    if (!exists) {
      await this.openContextMenu(wrapper);
      await this.testSubjects.existOrFail(testSubject, { allowHidden: true });
      await this.toggleContextMenu(wrapper);
    }
  }

  async expectExistsRemovePanelAction(title = '') {
    this.log.debug('expectExistsRemovePanelAction');
    await this.expectExistsPanelAction(REMOVE_PANEL_DATA_TEST_SUBJ, title);
  }

  async expectExistsEditPanelAction(title = '') {
    this.log.debug('expectExistsEditPanelAction');
    const testSubj = EDIT_PANEL_DATA_TEST_SUBJ;
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
    const wrapper = await this.getPanelWrapper(title);

    const exists = await this.panelActionExists(testSubject, wrapper);

    if (!exists) {
      await this.openContextMenu(wrapper);
      await this.testSubjects.missingOrFail(testSubject);
      await this.toggleContextMenu(wrapper);
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
    if (!title) return await this.find.byClassName('embPanel__wrapper');
    return await this.testSubjects.find(`embeddablePanelHeading-${title.replace(/\s/g, '')}`);
  }

  async getPanelWrapper(title = '') {
    this.log.debug(`getPanelWrapper(${title})`);
    if (!title) return await this.find.byClassName('embPanel__hoverActionsAnchor');
    return await this.testSubjects.find(`embeddablePanelHoverActions-${title.replace(/\s/g, '')}`);
  }

  async getPanelWrapperById(embeddableId: string) {
    this.log.debug(`getPanelWrapperById(${embeddableId})`);
    return await this.find.byCssSelector(`[data-test-embeddable-id="${embeddableId}"]`);
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

  async canConvertToLens(wrapper?: WebElementWrapper) {
    this.log.debug('canConvertToLens');
    await this.openContextMenu(wrapper);
    return await this.testSubjects.exists(CONVERT_TO_LENS_TEST_SUBJ, { timeout: 500 });
  }

  async canConvertToLensByTitle(title = '') {
    this.log.debug(`canConvertToLens(${title})`);
    const wrapper = await this.getPanelWrapper(title);
    return await this.canConvertToLens(wrapper);
  }

  async convertToLens(wrapper?: WebElementWrapper) {
    this.log.debug('convertToLens');

    await this.retry.try(async () => {
      if (!(await this.canConvertToLens(wrapper))) {
        throw new Error('Convert to Lens option not found');
      }

      await this.testSubjects.clickWhenNotDisabledWithoutRetry(CONVERT_TO_LENS_TEST_SUBJ);
    });
  }

  async convertToLensByTitle(title = '') {
    this.log.debug(`convertToLens(${title})`);
    const wrapper = await this.getPanelWrapper(title);
    return await this.convertToLens(wrapper);
  }

  async expectLinkedToLibrary(title = '') {
    this.log.debug(`expectLinkedToLibrary(${title})`);
    const isViewMode = await this.dashboard.getIsInViewMode();
    if (isViewMode) await this.dashboard.switchToEditMode();
    await this.expectExistsPanelAction(UNLINK_FROM_LIBRARY_TEST_SUBJ, title);
    if (isViewMode) await this.dashboard.clickCancelOutOfEditMode();
  }

  async expectNotLinkedToLibrary(title = '') {
    this.log.debug(`expectNotLinkedToLibrary(${title})`);
    const isViewMode = await this.dashboard.getIsInViewMode();
    if (isViewMode) await this.dashboard.switchToEditMode();
    await this.expectExistsPanelAction(SAVE_TO_LIBRARY_TEST_SUBJ, title);
    if (isViewMode) await this.dashboard.clickCancelOutOfEditMode();
  }
}
