/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { keyBy } from 'lodash';
import { map as mapAsync } from 'bluebird';
import { FtrService } from '../../ftr_provider_context';

export class SavedObjectsPageObject extends FtrService {
  private readonly log = this.ctx.getService('log');
  private readonly retry = this.ctx.getService('retry');
  private readonly browser = this.ctx.getService('browser');
  private readonly find = this.ctx.getService('find');
  private readonly testSubjects = this.ctx.getService('testSubjects');
  private readonly common = this.ctx.getPageObject('common');
  private readonly header = this.ctx.getPageObject('header');

  async searchForObject(objectName: string) {
    const searchBox = await this.testSubjects.find('savedObjectSearchBar');
    await searchBox.clearValue();
    await searchBox.type(objectName);
    await searchBox.pressKeys(this.browser.keys.ENTER);
    await this.header.waitUntilLoadingHasFinished();
    await this.waitTableIsLoaded();
  }

  async getCurrentSearchValue() {
    const searchBox = await this.testSubjects.find('savedObjectSearchBar');
    return await searchBox.getAttribute('value');
  }

  async importFile(path: string, overwriteAll = true) {
    this.log.debug(`importFile(${path})`);

    this.log.debug(`Clicking importObjects`);
    await this.testSubjects.click('importObjects');
    await this.common.setFileInputPath(path);

    if (!overwriteAll) {
      this.log.debug(`Toggling overwriteAll`);
      const radio = await this.testSubjects.find(
        'savedObjectsManagement-importModeControl-overwriteRadioGroup'
      );
      // a radio button consists of a div tag that contains an input, a div, and a label
      // we can't click the input directly, need to go up one level and click the parent div
      const div = await radio.findByXpath("//div[input[@id='overwriteDisabled']]");
      await div.click();
    } else {
      this.log.debug(`Leaving overwriteAll alone`);
    }
    await this.testSubjects.click('importSavedObjectsImportBtn');
    this.log.debug(`done importing the file`);

    // Wait for all the saves to happen
    await this.header.waitUntilLoadingHasFinished();
  }

  async checkImportSucceeded() {
    await this.testSubjects.existOrFail('importSavedObjectsSuccess', { timeout: 20000 });
  }

  async checkNoneImported() {
    await this.testSubjects.existOrFail('importSavedObjectsSuccessNoneImported', {
      timeout: 20000,
    });
  }

  async checkImportConflictsWarning() {
    await this.testSubjects.existOrFail('importSavedObjectsConflictsWarning', { timeout: 20000 });
  }

  async checkImportLegacyWarning() {
    await this.testSubjects.existOrFail('importSavedObjectsLegacyWarning', { timeout: 20000 });
  }

  async checkImportFailedWarning() {
    await this.testSubjects.existOrFail('importSavedObjectsFailedWarning', { timeout: 20000 });
  }

  async checkImportError() {
    await this.testSubjects.existOrFail('importSavedObjectsErrorText', { timeout: 20000 });
  }

  async getImportErrorText() {
    return await this.testSubjects.getVisibleText('importSavedObjectsErrorText');
  }

  async clickImportDone() {
    await this.testSubjects.click('importSavedObjectsDoneBtn');
    await this.waitTableIsLoaded();
  }

  async clickConfirmChanges() {
    await this.testSubjects.click('importSavedObjectsConfirmBtn');
  }

  async waitTableIsLoaded() {
    return this.retry.try(async () => {
      const isLoaded = await this.find.existsByDisplayedByCssSelector(
        '*[data-test-subj="savedObjectsTable"] :not(.euiBasicTable-loading)'
      );

      if (isLoaded) {
        return true;
      } else {
        throw new Error('Waiting');
      }
    });
  }

  async clickRelationshipsByTitle(title: string) {
    const table = keyBy(await this.getElementsInTable(), 'title');
    // should we check if table size > 0 and log error if not?
    if (table[title].menuElement) {
      this.log.debug(`we found a context menu element for (${title}) so click it`);
      await table[title].menuElement?.click();
      // Wait for context menu to render
      const menuPanel = await this.find.byCssSelector('.euiContextMenuPanel');
      await (await menuPanel.findByTestSubject('savedObjectsTableAction-relationships')).click();
    } else {
      this.log.debug(
        `we didn't find a menu element so should be a relastionships element for (${title}) to click`
      );
      // or the action elements are on the row without the menu
      await table[title].relationshipsElement?.click();
    }
  }

  async setOverriddenIndexPatternValue(oldName: string, newName: string) {
    const select = await this.testSubjects.find(`managementChangeIndexSelection-${oldName}`);
    const option = await this.testSubjects.findDescendant(`indexPatternOption-${newName}`, select);
    await option.click();
  }

  async clickCopyToSpaceByTitle(title: string) {
    const table = keyBy(await this.getElementsInTable(), 'title');
    // should we check if table size > 0 and log error if not?
    if (table[title].menuElement) {
      this.log.debug(`we found a context menu element for (${title}) so click it`);
      await table[title].menuElement?.click();
      // Wait for context menu to render
      const menuPanel = await this.find.byCssSelector('.euiContextMenuPanel');
      await (
        await menuPanel.findByTestSubject('savedObjectsTableAction-copy_saved_objects_to_space')
      ).click();
    } else {
      this.log.debug(
        `we didn't find a menu element so should be a "copy to space" element for (${title}) to click`
      );
      // or the action elements are on the row without the menu
      await table[title].copySaveObjectsElement?.click();
    }
  }

  async clickInspectByTitle(title: string) {
    const table = keyBy(await this.getElementsInTable(), 'title');
    if (table[title].menuElement) {
      await table[title].menuElement?.click();
      // Wait for context menu to render
      const menuPanel = await this.find.byCssSelector('.euiContextMenuPanel');
      const panelButton = await menuPanel.findByTestSubject('savedObjectsTableAction-inspect');
      await panelButton.click();
    } else {
      // or the action elements are on the row without the menu
      await table[title].copySaveObjectsElement?.click();
    }
  }

  async clickCheckboxByTitle(title: string) {
    const table = keyBy(await this.getElementsInTable(), 'title');
    // should we check if table size > 0 and log error if not?
    await table[title].checkbox.click();
  }

  async getObjectTypeByTitle(title: string) {
    const table = keyBy(await this.getElementsInTable(), 'title');
    // should we check if table size > 0 and log error if not?
    return table[title].objectType;
  }

  async getElementsInTable() {
    const rows = await this.testSubjects.findAll('~savedObjectsTableRow');
    return mapAsync(rows, async (row) => {
      const checkbox = await row.findByCssSelector('[data-test-subj*="checkboxSelectRow"]');
      // return the object type aria-label="index patterns"
      const objectType = await row.findByTestSubject('objectType');
      const titleElement = await row.findByTestSubject('savedObjectsTableRowTitle');
      // not all rows have inspect button - Advanced Settings objects don't
      // Advanced Settings has 2 actions,
      //   data-test-subj="savedObjectsTableAction-relationships"
      //   data-test-subj="savedObjectsTableAction-copy_saved_objects_to_space"
      // Some other objects have the ...
      //   data-test-subj="euiCollapsedItemActionsButton"
      // Maybe some objects still have the inspect element visible?
      // !!! Also note that since we don't have spaces on OSS, the actions for the same object can be different depending on OSS or not
      let menuElement = null;
      let inspectElement = null;
      let relationshipsElement = null;
      let copySaveObjectsElement = null;
      const actions = await row.findByClassName('euiTableRowCell--hasActions');
      // getting the innerHTML and checking if it 'includes' a string is faster than a timeout looking for each element
      const actionsHTML = await actions.getAttribute('innerHTML');
      if (actionsHTML.includes('euiCollapsedItemActionsButton')) {
        menuElement = await row.findByTestSubject('euiCollapsedItemActionsButton');
      }
      if (actionsHTML.includes('savedObjectsTableAction-inspect')) {
        inspectElement = await row.findByTestSubject('savedObjectsTableAction-inspect');
      }
      if (actionsHTML.includes('savedObjectsTableAction-relationships')) {
        relationshipsElement = await row.findByTestSubject('savedObjectsTableAction-relationships');
      }
      if (actionsHTML.includes('savedObjectsTableAction-copy_saved_objects_to_space')) {
        copySaveObjectsElement = await row.findByTestSubject(
          'savedObjectsTableAction-copy_saved_objects_to_space'
        );
      }
      return {
        checkbox,
        objectType: await objectType.getAttribute('aria-label'),
        titleElement,
        title: await titleElement.getVisibleText(),
        menuElement,
        inspectElement,
        relationshipsElement,
        copySaveObjectsElement,
      };
    });
  }

  async getRowTitles() {
    await this.waitTableIsLoaded();
    const table = await this.testSubjects.find('savedObjectsTable');
    const $ = await table.parseDomContent();
    return $.findTestSubjects('savedObjectsTableRowTitle')
      .toArray()
      .map((cell) => $(cell).find('.euiTableCellContent').text());
  }

  async getRelationshipFlyout() {
    const rows = await this.testSubjects.findAll('relationshipsTableRow');
    return mapAsync(rows, async (row) => {
      const objectType = await row.findByTestSubject('relationshipsObjectType');
      const relationship = await row.findByTestSubject('directRelationship');
      const titleElement = await row.findByTestSubject('relationshipsTitle');
      const inspectElement = await row.findByTestSubject('relationshipsTableAction-inspect');
      return {
        objectType: await objectType.getAttribute('aria-label'),
        relationship: await relationship.getVisibleText(),
        titleElement,
        title: await titleElement.getVisibleText(),
        inspectElement,
      };
    });
  }

  async getInvalidRelations() {
    const rows = await this.testSubjects.findAll('invalidRelationshipsTableRow');
    return mapAsync(rows, async (row) => {
      const objectType = await row.findByTestSubject('relationshipsObjectType');
      const objectId = await row.findByTestSubject('relationshipsObjectId');
      const relationship = await row.findByTestSubject('directRelationship');
      const error = await row.findByTestSubject('relationshipsError');
      return {
        type: await objectType.getVisibleText(),
        id: await objectId.getVisibleText(),
        relationship: await relationship.getVisibleText(),
        error: await error.getVisibleText(),
      };
    });
  }

  async getTableSummary() {
    const table = await this.testSubjects.find('savedObjectsTable');
    const $ = await table.parseDomContent();
    return $('tbody tr')
      .toArray()
      .map((row) => {
        return {
          title: $(row).find('td:nth-child(3) .euiTableCellContent').text(),
          canViewInApp: Boolean($(row).find('td:nth-child(3) a').length),
        };
      });
  }

  async clickTableSelectAll() {
    await this.testSubjects.click('checkboxSelectAll');
  }

  async canBeDeleted() {
    return await this.testSubjects.isEnabled('savedObjectsManagementDelete');
  }

  async clickDelete({ confirmDelete = true }: { confirmDelete?: boolean } = {}) {
    await this.testSubjects.click('savedObjectsManagementDelete');
    if (confirmDelete) {
      await this.testSubjects.click('confirmModalConfirmButton');
      await this.waitTableIsLoaded();
    }
  }

  async getImportWarnings() {
    const elements = await this.testSubjects.findAll('importSavedObjectsWarning');
    return Promise.all(
      elements.map(async (element) => {
        const message = await element
          .findByClassName('euiCallOutHeader__title')
          .then((titleEl) => titleEl.getVisibleText());
        const buttons = await element.findAllByClassName('euiButton');
        return {
          message,
          type: buttons.length ? 'action_required' : 'simple',
        };
      })
    );
  }

  async getImportErrorsCount() {
    this.log.debug(`Toggling overwriteAll`);
    const errorCountNode = await this.testSubjects.find('importSavedObjectsErrorsCount');
    const errorCountText = await errorCountNode.getVisibleText();
    const match = errorCountText.match(/(\d)+/);
    if (!match) {
      throw Error(`unable to parse error count from text ${errorCountText}`);
    }

    return +match[1];
  }
}
