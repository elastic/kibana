/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../ftr_provider_context';

export function SavedQueryManagementComponentProvider({
  getService,
  getPageObjects,
}: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const queryBar = getService('queryBar');
  const retry = getService('retry');
  const config = getService('config');
  const PageObjects = getPageObjects(['common']);

  class SavedQueryManagementComponent {
    public async getCurrentlyLoadedQueryID() {
      await this.openSavedQueryManagementComponent();
      try {
        return await testSubjects.getVisibleText('~saved-query-list-item-selected');
      } catch {
        return undefined;
      }
    }

    public async saveNewQuery(
      name: string,
      description: string,
      includeFilters: boolean,
      includeTimeFilter: boolean
    ) {
      await this.openSaveCurrentQueryModal();
      await this.submitSaveQueryForm(name, description, includeFilters, includeTimeFilter);
    }

    public async saveNewQueryWithNameError(name?: string) {
      await this.openSaveCurrentQueryModal();
      if (name) {
        await testSubjects.setValue('saveQueryFormTitle', name);
      }

      // Form input validation only happens onBlur. Clicking the save button should de-focus the
      // input element and the validation should prevent a save from actually happening if there's
      // an error.
      await testSubjects.click('savedQueryFormSaveButton');

      const saveQueryFormSaveButtonStatus = await testSubjects.isEnabled(
        'savedQueryFormSaveButton'
      );

      try {
        expect(saveQueryFormSaveButtonStatus).to.not.eql(true);
      } finally {
        await testSubjects.click('savedQueryFormCancelButton');
      }
    }

    public async saveCurrentlyLoadedAsNewQuery(
      name: string,
      description: string,
      includeFilters: boolean,
      includeTimeFilter: boolean
    ) {
      await this.openSavedQueryManagementComponent();
      await testSubjects.click('saved-query-management-save-as-new-button');
      await this.submitSaveQueryForm(name, description, includeFilters, includeTimeFilter);
    }

    public async updateCurrentlyLoadedQuery(
      description: string,
      includeFilters: boolean,
      includeTimeFilter: boolean
    ) {
      await this.openSavedQueryManagementComponent();
      await testSubjects.click('saved-query-management-save-changes-button');
      await this.submitSaveQueryForm(null, description, includeFilters, includeTimeFilter);
    }

    public async loadSavedQuery(title: string) {
      await this.openSavedQueryManagementComponent();
      await testSubjects.click(`~load-saved-query-${title}-button`);
      await retry.try(async () => {
        await this.openSavedQueryManagementComponent();
        const selectedSavedQueryText = await testSubjects.getVisibleText(
          '~saved-query-list-item-selected'
        );
        expect(selectedSavedQueryText).to.eql(title);
      });
      await this.closeSavedQueryManagementComponent();
    }

    public async deleteSavedQuery(title: string) {
      await this.openSavedQueryManagementComponent();
      await testSubjects.click(`~delete-saved-query-${title}-button`);
      await PageObjects.common.clickConfirmOnModal();
    }

    async clearCurrentlyLoadedQuery() {
      await this.openSavedQueryManagementComponent();
      await testSubjects.click('saved-query-management-clear-button');
      await this.closeSavedQueryManagementComponent();
      const queryString = await queryBar.getQueryString();
      expect(queryString).to.be.empty();
    }

    async submitSaveQueryForm(
      title: string | null,
      description: string,
      includeFilters: boolean,
      includeTimeFilter: boolean
    ) {
      if (title) {
        await testSubjects.setValue('saveQueryFormTitle', title);
      }
      await testSubjects.setValue('saveQueryFormDescription', description);

      const currentIncludeFiltersValue =
        (await testSubjects.getAttribute('saveQueryFormIncludeFiltersOption', 'aria-checked')) ===
        'true';
      if (currentIncludeFiltersValue !== includeFilters) {
        await testSubjects.click('saveQueryFormIncludeFiltersOption');
      }

      const currentIncludeTimeFilterValue =
        (await testSubjects.getAttribute(
          'saveQueryFormIncludeTimeFilterOption',
          'aria-checked'
        )) === 'true';
      if (currentIncludeTimeFilterValue !== includeTimeFilter) {
        await testSubjects.click('saveQueryFormIncludeTimeFilterOption');
      }

      await testSubjects.click('savedQueryFormSaveButton');
    }

    async savedQueryExistOrFail(title: string) {
      await this.openSavedQueryManagementComponent();
      await testSubjects.existOrFail(`~load-saved-query-${title}-button`);
    }

    async savedQueryTextExist(text: string) {
      await this.openSavedQueryManagementComponent();
      const queryString = await queryBar.getQueryString();
      expect(queryString).to.eql(text);
    }

    async savedQueryMissingOrFail(title: string) {
      await retry.try(async () => {
        await this.openSavedQueryManagementComponent();
        await testSubjects.missingOrFail(`~load-saved-query-${title}-button`);
      });
      await this.closeSavedQueryManagementComponent();
    }

    async openSavedQueryManagementComponent() {
      const isOpenAlready = await testSubjects.exists('saved-query-management-popover');
      if (isOpenAlready) return;

      await retry.waitFor('saved query management popover to have any text', async () => {
        await testSubjects.click('saved-query-management-popover-button');
        const queryText = await testSubjects.getVisibleText('saved-query-management-popover');
        return queryText.length > 0;
      });
    }

    async closeSavedQueryManagementComponent() {
      const isOpenAlready = await testSubjects.exists('saved-query-management-popover');
      if (!isOpenAlready) return;

      await retry.try(async () => {
        await testSubjects.click('saved-query-management-popover-button');
        await testSubjects.missingOrFail('saved-query-management-popover');
      });
    }

    async openSaveCurrentQueryModal() {
      await this.openSavedQueryManagementComponent();

      await retry.try(async () => {
        await testSubjects.click('saved-query-management-save-button');
        await testSubjects.existOrFail('saveQueryForm', {
          timeout: config.get('timeouts.waitForExists'),
        });
      });
    }

    async saveNewQueryMissingOrFail() {
      await this.openSavedQueryManagementComponent();
      await testSubjects.missingOrFail('saved-query-management-save-button');
    }

    async updateCurrentlyLoadedQueryMissingOrFail() {
      await this.openSavedQueryManagementComponent();
      await testSubjects.missingOrFail('saved-query-management-save-changes-button');
    }

    async deleteSavedQueryMissingOrFail(title: string) {
      await this.openSavedQueryManagementComponent();
      await testSubjects.missingOrFail(`delete-saved-query-${title}-button`);
    }
  }

  return new SavedQueryManagementComponent();
}
