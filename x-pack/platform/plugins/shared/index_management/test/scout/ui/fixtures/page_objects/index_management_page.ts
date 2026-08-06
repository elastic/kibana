/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable max-classes-per-file */

import { type ScoutPage, EuiFieldTextWrapper, EuiToastWrapper } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

export class AbstractPageObject {
  constructor(public readonly page: ScoutPage) {}
}

const commonPrefix = (values: string[]) => {
  const [first, ...rest] = values;
  let end = first.length;
  for (const value of rest) {
    while (end > 0 && !value.startsWith(first.slice(0, end))) {
      end--;
    }
  }
  return first.slice(0, end);
};

export class IndexManagement extends AbstractPageObject {
  async goto() {
    await this.page.gotoApp('management/data/index_management');
  }

  async sectionHeadingText() {
    return await this.page.testSubj.locator('appHeaderTitle').textContent();
  }

  async changeTabs(
    tab:
      | 'indicesTab'
      | 'data_streamsTab'
      | 'templatesTab'
      | 'component_templatesTab'
      | 'enrich_policiesTab'
  ) {
    await this.page.testSubj.locator(tab).click();
  }

  async clickCreateIndexButton() {
    await this.page.testSubj.locator('createIndexButton').click();
  }

  async setCreateIndexName(value: string) {
    await this.page.testSubj.fill('createIndexNameFieldText', value);
  }

  async setCreateIndexMode(value: string) {
    await this.page.testSubj.click('indexModeField');
    await this.page.testSubj.locator(`indexMode${value}Option`).click();
  }

  async clickCreateIndexSaveButton() {
    const saveButton = this.page.testSubj.locator('createIndexSaveButton');
    await saveButton.click();
    // Wait for modal to close using web-first assertion
    await expect(saveButton).toBeHidden({ timeout: 30000 });
  }

  /**
   * Returns locator for index link - caller should use web-first assertions.
   * Note: Consider using extended timeout as this can be slow in CI environments.
   * Example: await expect(pageObjects.indexManagement.indexLink(name)).toBeVisible({ timeout: 30000 });
   */
  indexLink(indexName: string) {
    return this.page.getByRole('button').getByText(indexName);
  }

  async toggleHiddenIndices() {
    await this.page.testSubj.locator('checkboxToggles-includeHiddenIndices').click();
  }

  async openIndexDetailsPage(indexOfRow: number) {
    const indexLinks = this.page.testSubj.locator('indexTableIndexNameLink');
    // this should be refactored to use data-test-subj on the table rows
    // eslint-disable-next-line playwright/no-nth-methods
    await indexLinks.nth(indexOfRow).click();

    // Wait for index details page to load using web-first assertion
    await expect(this.page.testSubj.locator('indexDetailsContent')).toBeVisible();
  }

  async navigateToIndexManagementTab(
    tab: 'indices' | 'data_streams' | 'templates' | 'component_templates' | 'enrich_policies'
  ) {
    // Deep-link straight to the tab's route so we don't load the default Indices
    // list and then click the tab: that click raced app bootstrap and timed out.
    await this.page.gotoApp(`management/data/index_management/${tab}`);
    const tabMap = {
      indices: 'indicesTab',
      data_streams: 'data_streamsTab',
      templates: 'templatesTab',
      component_templates: 'component_templatesTab',
      enrich_policies: 'enrich_policiesTab',
    };
    await expect(this.page.testSubj.locator(tabMap[tab])).toBeVisible();
  }

  async clickNextButton() {
    await this.page.testSubj.locator('nextButton').click();
  }

  async clickTemplateDetailsLink(name: string) {
    const searchBar = this.page.getByRole('searchbox', { name: /results lower in the page/ });
    await expect(async () => {
      await searchBar.fill(name);
      await expect(searchBar).toHaveValue(name);
    }).toPass({ timeout: 15_000 });
    await this.page.testSubj
      .locator('templateDetailsLink')
      .and(this.page.getByRole('button', { name, exact: true }))
      .dispatchEvent('click');
    await expect(this.page.testSubj.locator('templateDetails')).toBeVisible();
  }

  async clickDataStreamNameLink(name: string) {
    await this.page.testSubj.fill('dataStreamSearch', name);
    await this.page.testSubj
      .locator('nameLink')
      .and(this.page.getByRole('button', { name, exact: true }))
      .dispatchEvent('click');
    await expect(this.page.testSubj.locator('dataStreamDetailPanel')).toBeVisible();
  }

  async openDataStreamLifecycleFlyout(name: string) {
    await this.clickDataStreamNameLink(name);
    await this.page.testSubj.locator('manageDataStreamButton').click();
    await this.page.testSubj.locator('editDataLifecycleButton').click();
    await expect(this.page.testSubj.locator('editDataLifecycleFlyoutApplyButton')).toBeVisible();
  }

  async applyDataStreamLifecycleChange() {
    await this.page.testSubj.locator('editDataLifecycleFlyoutApplyButton').click();
    await expect(this.page.testSubj.locator('editDataLifecycleFlyoutApplyButton')).toBeHidden({
      timeout: 30_000,
    });
    await new EuiToastWrapper(this.page, { dataTestSubj: 'globalToastList' }).closeAllToasts();
  }

  async stopInheritingDataStreamLifecycle() {
    const inherit = this.page.testSubj.locator('dataLifecycleInheritCheckbox');
    if ((await inherit.count()) > 0 && (await inherit.isChecked())) {
      await inherit.click();
    }
  }

  async openBulkEditDataRetention(dataStreamNames: string[]) {
    await this.page.testSubj.fill('dataStreamSearch', commonPrefix(dataStreamNames));
    for (const name of dataStreamNames) {
      await this.page.testSubj.locator(`checkboxSelectRow-${name}`).check();
    }
    await this.page.testSubj.locator('dataStreamActionsPopoverButton').click();
    await this.page.testSubj.locator('bulkEditDataRetentionButton').click();
  }

  private enrichPolicyRow(name: string) {
    return this.page.getByRole('row', { name: new RegExp(`\\b${name}\\b`) });
  }

  async clickEnrichPolicy(name: string) {
    await this.page.testSubj
      .locator('enrichPolicyDetailsLink')
      .and(this.page.getByRole('link', { name, exact: true }))
      .click();
  }

  async executeEnrichPolicy(name: string) {
    await this.enrichPolicyRow(name).getByTestId('executePolicyButton').click();
    await this.page.testSubj.locator('confirmModalConfirmButton').click();
  }

  async deleteEnrichPolicy(name: string) {
    await this.enrichPolicyRow(name).getByTestId('deletePolicyButton').click();
    await this.page.testSubj.locator('confirmModalConfirmButton').click();
  }

  async changeMappingsEditorTab(tab: 'fields' | 'advancedOptions' | 'templates') {
    const tabMap = {
      fields: 'fieldsTab',
      advancedOptions: 'advancedOptionsTab',
      templates: 'templatesTab',
    };
    await this.page.testSubj.locator(tabMap[tab]).click();
  }

  indexDetailsPage = {
    expectIndexDetailsPageIsLoaded: async () => {
      await expect(this.page.testSubj.locator('indexDetailsTab-overview')).toBeVisible();
      await expect(this.page.testSubj.locator('indexDetailsContent')).toBeVisible();
      await expect(this.page.testSubj.locator('appHeaderBack')).toBeVisible();
    },
  };

  indexTemplateWizard = {
    // `nameField` and `indexPatternsField` carry the test subject on their EuiFormRow wrapper, so
    // the inner input is driven via the EUI field wrapper.
    open: async (name: string, indexPattern: string) => {
      await this.page.testSubj.locator('createTemplateButton').click();
      await new EuiFieldTextWrapper(this.page, { dataTestSubj: 'nameField' }).fill(name);
      await new EuiFieldTextWrapper(this.page, { dataTestSubj: 'indexPatternsField' }).fill(
        indexPattern
      );
    },

    completeStepOne: async () => {
      const nameField = new EuiFieldTextWrapper(this.page, { dataTestSubj: 'nameField' });
      await nameField.fill('test-index-template');

      const indexPatternsField = new EuiFieldTextWrapper(this.page, {
        dataTestSubj: 'indexPatternsField',
      });
      await indexPatternsField.fill('test-index-pattern');

      await this.clickNextButton();
    },
  };

  async readSidebarSections(): Promise<Array<{ sectionId: string; sectionLinks: string[] }>> {
    // Evaluate in-page to avoid the `nth()` Playwright anti-pattern; reads the full section
    // + link structure in one call to the DOM.
    return this.page.locator('.kbnSolutionNav').evaluate((nav) => {
      const roots = Array.from(nav.querySelectorAll<HTMLElement>('.euiSideNavItem--root'));
      return roots.flatMap((root) => {
        // Section header button carries data-test-subj = section ID
        const sectionId = root
          .querySelector<HTMLElement>(':scope > .euiSideNavItemButton')
          ?.getAttribute('data-test-subj');
        if (!sectionId) return [];
        // Child link anchors carry data-test-subj = app ID
        const sectionLinks = Array.from(
          root.querySelectorAll<HTMLElement>('.euiSideNavItem > a.euiSideNavItemButton')
        )
          .map((a) => a.getAttribute('data-test-subj'))
          .filter((id): id is string => id !== null);
        return [{ sectionId, sectionLinks }];
      });
    });
  }
}
