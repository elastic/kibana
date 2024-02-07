/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { LinksLayoutType } from '@kbn/links-plugin/common/content_management';
import { FtrService } from '../ftr_provider_context';

export class DashboardPageLinks extends FtrService {
  private readonly retry = this.ctx.getService('retry');
  private readonly browser = this.ctx.getService('browser');
  private readonly testSubjects = this.ctx.getService('testSubjects');
  private readonly comboBox = this.ctx.getService('comboBox');

  private readonly header = this.ctx.getPageObject('header');
  private readonly settings = this.ctx.getPageObject('settings');

  public async toggleLinksLab(value?: boolean) {
    await this.header.clickStackManagement();
    await this.settings.clickKibanaSettings();

    await this.settings.toggleAdvancedSettingCheckbox('labs:dashboard:linksPanel', value);
  }

  /* -----------------------------------------------------------
    Links panel
    ----------------------------------------------------------- */

  public async getAllLinksInPanel() {
    const listGroup = await this.testSubjects.find('links--component--listGroup');
    return await listGroup.findAllByCssSelector('li');
  }

  public async getNumberOfLinksInPanel() {
    const links = await this.getAllLinksInPanel();
    return links.length;
  }

  /* -----------------------------------------------------------
    Links flyout
    ----------------------------------------------------------- */

  public async expectFlyoutIsOpen() {
    await this.testSubjects.exists('links--panelEditor--flyout');
  }

  public async clickPanelEditorSaveButton() {
    await this.expectFlyoutIsOpen();
    await this.testSubjects.clickWhenNotDisabled('links--panelEditor--saveBtn');
  }

  public async clickLinkEditorCloseButton() {
    await this.testSubjects.click('links--linkEditor--closeBtn');
  }

  public async clickPanelEditorCloseButton() {
    await this.testSubjects.click('links--panelEditor--closeBtn');
  }

  public async clickLinksEditorSaveButton() {
    await this.testSubjects.clickWhenNotDisabled('links--linkEditor--saveBtn');
  }

  public async findDraggableLinkByIndex(index: number) {
    await this.testSubjects.exists('links--panelEditor--flyout');
    const linksFormRow = await this.testSubjects.find('links--panelEditor--linksAreaDroppable');
    return await linksFormRow.findByCssSelector(
      `[data-test-subj="links--panelEditor--draggableLink"]:nth-child(${index})`
    );
  }

  public async addDashboardLink(
    destination: string,
    useCurrentFilters: boolean = true,
    useCurrentDateRange: boolean = true,
    openInNewTab: boolean = false,
    linkLabel?: string
  ) {
    await this.expectFlyoutIsOpen();
    await this.testSubjects.click('links--panelEditor--addLinkBtn');
    await this.testSubjects.exists('links--linkEditor--flyout');
    const radioOption = await this.testSubjects.find('links--linkEditor--dashboardLink--radioBtn');
    const label = await radioOption.findByCssSelector('label[for="dashboardLink"]');
    await label.click();

    await this.comboBox.set('links--linkEditor--dashboardLink--comboBox', destination);
    if (linkLabel) {
      await this.testSubjects.setValue('links--linkEditor--linkLabel--input', linkLabel);
    }

    await this.testSubjects.setEuiSwitch(
      'dashboardDrillDownOptions--useCurrentFilters--checkbox',
      useCurrentFilters ? 'check' : 'uncheck'
    );
    await this.testSubjects.setEuiSwitch(
      'dashboardDrillDownOptions--useCurrentDateRange--checkbox',
      useCurrentDateRange ? 'check' : 'uncheck'
    );
    await this.testSubjects.setEuiSwitch(
      'dashboardDrillDownOptions--openInNewTab--checkbox',
      openInNewTab ? 'check' : 'uncheck'
    );

    await this.clickLinksEditorSaveButton();
  }

  public async addExternalLink(
    destination: string,
    openInNewTab: boolean = true,
    encodeUrl: boolean = true,
    linkLabel?: string
  ) {
    await this.setExternalUrlInput(destination);
    if (linkLabel) {
      await this.testSubjects.setValue('links--linkEditor--linkLabel--input', linkLabel);
    }
    await this.testSubjects.setEuiSwitch(
      'urlDrilldownOpenInNewTab',
      openInNewTab ? 'check' : 'uncheck'
    );
    await this.testSubjects.setEuiSwitch('urlDrilldownEncodeUrl', encodeUrl ? 'check' : 'uncheck');

    await this.clickLinksEditorSaveButton();
  }

  public async deleteLinkByIndex(index: number) {
    const linkToDelete = await this.findDraggableLinkByIndex(index);
    await this.retry.try(async () => {
      await linkToDelete.moveMouseTo();
      await this.testSubjects.existOrFail(`panelEditorLink--deleteBtn`);
    });
    const deleteButton = await linkToDelete.findByTestSubject(`panelEditorLink--deleteBtn`);
    await deleteButton.click();
  }

  public async editLinkByIndex(index: number) {
    const linkToEdit = await this.findDraggableLinkByIndex(index);
    await this.retry.try(async () => {
      await linkToEdit.moveMouseTo();
      await this.testSubjects.existOrFail(`panelEditorLink--editBtn`);
    });
    const editButton = await linkToEdit.findByTestSubject(`panelEditorLink--editBtn`);
    await editButton.click();
  }

  public async reorderLinks(linkLabel: string, startIndex: number, steps: number, reverse = false) {
    const linkToMove = await this.findDraggableLinkByIndex(startIndex);
    const draggableButton = await linkToMove.findByTestSubject(`panelEditorLink--dragHandle`);
    expect(await draggableButton.getAttribute('data-rfd-drag-handle-draggable-id')).to.equal(
      linkLabel
    );
    await draggableButton.focus();
    await this.browser.pressKeys(this.browser.keys.SPACE);

    for (let i = 0; i < steps; i++) {
      await this.browser.pressKeys(reverse ? this.browser.keys.UP : this.browser.keys.DOWN);
    }
    await this.browser.pressKeys(this.browser.keys.SPACE);
    await this.retry.try(async () => {
      expect(await linkToMove.elementHasClass('euiDraggable--isDragging')).to.be(false);
    });
  }

  public async setLayout(layout: LinksLayoutType) {
    await this.expectFlyoutIsOpen();
    const testSubj = `links--panelEditor--${layout}LayoutBtn`;
    await this.testSubjects.click(testSubj);
  }

  public async setExternalUrlInput(destination: string) {
    await this.expectFlyoutIsOpen();
    await this.testSubjects.click('links--panelEditor--addLinkBtn');
    await this.testSubjects.exists('links--linkEditor--flyout');
    const option = await this.testSubjects.find('links--linkEditor--externalLink--radioBtn');
    const label = await option.findByCssSelector('label[for="externalLink"]');
    await label.click();
    await this.testSubjects.setValue('links--linkEditor--externalLink--input', destination);
  }

  public async toggleSaveByReference(checked: boolean) {
    await this.expectFlyoutIsOpen();
    await this.testSubjects.setEuiSwitch(
      'links--panelEditor--saveByReferenceSwitch',
      checked ? 'check' : 'uncheck'
    );
  }
}
