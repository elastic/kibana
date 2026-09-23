/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable max-classes-per-file */

import type { Locator, ScoutPage } from '@kbn/scout';
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

  // Selects the index row checkbox and opens its "manage index" context menu.
  async manageIndex(indexName: string) {
    const checkbox = this.page.locator(`input[id="checkboxSelectIndex-${indexName}"]`);
    if (!(await checkbox.isChecked())) {
      await checkbox.click();
    }
    await this.page.testSubj.locator('indexActionsContextMenuButton').click();
    await expect(this.page.testSubj.locator('indexContextMenu')).toBeVisible();
  }

  async changeManageIndexTab(
    manageIndexTab:
      | 'showOverviewIndexMenuButton'
      | 'showSettingsIndexMenuButton'
      | 'showMappingsIndexMenuButton'
  ) {
    await this.page.testSubj.locator(manageIndexTab).click();
  }

  async deleteIndexFromContextMenu() {
    await this.page.testSubj.locator('deleteIndexMenuButton').click();
  }

  async confirmDeleteIndexModal() {
    await this.page.testSubj.locator('confirmModalConfirmButton').click();
  }

  async navigateToIndexManagementTab(
    tab: 'indices' | 'data_streams' | 'templates' | 'component_templates' | 'enrich_policies'
  ) {
    const tabMap = {
      indices: 'indicesTab',
      data_streams: 'data_streamsTab',
      templates: 'templatesTab',
      component_templates: 'component_templatesTab',
      enrich_policies: 'enrich_policiesTab',
    };
    // A freshly created custom role can take a moment to apply, giving a 403 and no tabs.
    await expect(async () => {
      await this.page.gotoApp(`management/data/index_management/${tab}`);
      await expect(this.page.testSubj.locator(tabMap[tab])).toBeVisible({ timeout: 10_000 });
    }).toPass({ timeout: 60_000 });
  }

  async clickNextButton() {
    await this.page.testSubj.locator('nextButton').click();
  }

  private async fillSearchBox(searchBox: Locator, value: string) {
    await expect(async () => {
      await searchBox.fill(value);
      await expect(searchBox).toHaveValue(value);
    }).toPass({ timeout: 30_000 });
  }

  private async filterDataStreams(name: string) {
    await this.fillSearchBox(this.page.testSubj.locator('dataStreamSearch'), name);
    const rowLinks = this.page.testSubj.locator('nameLink');
    await expect(rowLinks.filter({ hasNotText: name })).toHaveCount(0);
    await expect(rowLinks.filter({ hasText: name })).not.toHaveCount(0);
  }

  async clickTemplateDetailsLink(name: string) {
    await this.fillSearchBox(
      this.page.getByRole('searchbox', { name: /results lower in the page/ }),
      name
    );

    const link = this.page.testSubj
      .locator('templateDetailsLink')
      .and(this.page.getByRole('button', { name, exact: true }));
    await expect(link).toBeVisible();
    await expect(async () => {
      await link.click();
      await expect(this.page.testSubj.locator('templateDetails')).toBeVisible({ timeout: 5_000 });
    }).toPass({ timeout: 60_000 });
  }

  // Open a data stream's details flyout by exact name. Serverless projects ship their own data
  // streams, so filter the list down first; the same re-render race applies as above.
  async clickDataStreamNameLink(name: string) {
    await this.filterDataStreams(name);
    const link = this.page.testSubj
      .locator('nameLink')
      .and(this.page.getByRole('button', { name, exact: true }));
    await expect(async () => {
      await link.click();
      await expect(this.page.testSubj.locator('dataStreamDetailPanel')).toBeVisible({
        timeout: 5_000,
      });
    }).toPass({ timeout: 60_000 });
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
    await this.page.components.toast().closeAll();
  }

  async stopInheritingDataStreamLifecycle() {
    await this.page.testSubj.locator('dataLifecycleInheritCheckbox').uncheck();
  }

  async openBulkEditDataRetention(dataStreamNames: string[]) {
    await this.filterDataStreams(commonPrefix(dataStreamNames));
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

    changeTab: async (
      tab: 'indexDetailsTab-mappings' | 'indexDetailsTab-overview' | 'indexDetailsTab-settings'
    ) => {
      await this.page.testSubj.locator(tab).click();
    },

    mappingsAddFieldButton: () => this.page.testSubj.locator('indexDetailsMappingsAddField'),

    editSettingsSwitch: () => this.page.testSubj.locator('indexDetailsSettingsEditModeSwitch'),
  };

  indexTemplateWizard = {
    // `nameField` and `indexPatternsField` carry the test subject on their EuiFormRow wrapper, so
    // the inner input is driven via a native locator.
    open: async (name: string, indexPattern: string) => {
      await this.page.testSubj.locator('createTemplateButton').click();
      await this.page.testSubj.locator('nameField').locator('input').fill(name);
      await this.page.testSubj.locator('indexPatternsField').locator('input').fill(indexPattern);
    },

    completeStepOne: async () => {
      await this.page.testSubj.locator('nameField').locator('input').fill('test-index-template');
      await this.page.testSubj
        .locator('indexPatternsField')
        .locator('input')
        .fill('test-index-pattern');

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
