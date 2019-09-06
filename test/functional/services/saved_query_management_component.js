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

import expect from '@kbn/expect';

export function SavedQueryManagementComponentProvider({ getService }) {
  const testSubjects = getService('testSubjects');
  const queryBar = getService('queryBar');
  const retry = getService('retry');

  class SavedQueryManagementComponent {

    async saveNewQuery(name, description, includeFilters, includeTimeFilter) {
      await this.openSaveCurrentQueryModal();
      await this.submitSaveQueryForm(name, description, includeFilters, includeTimeFilter);
    }

    async saveNewQueryWithNameError(name) {
      await this.openSaveCurrentQueryModal();
      if (name) {
        await testSubjects.setValue('saveQueryFormTitle', name);
      }

      // Form input validation only happens onBlur. Clicking the save button should de-focus the
      // input element and the validation should prevent a save from actually happening if there's
      // an error.
      await testSubjects.click('savedQueryFormSaveButton');

      const saveQueryFormSaveButtonStatus = await testSubjects.isEnabled('savedQueryFormSaveButton');

      try {
        expect(saveQueryFormSaveButtonStatus).to.not.eql(true);
      }
      finally {
        await testSubjects.click('savedQueryFormCancelButton');
      }
    }

    async saveCurrentlyLoadedAsNewQuery(name, description, includeFilters, includeTimeFilter) {
      await this.openSavedQueryManagementComponent();
      await testSubjects.click('saved-query-management-save-as-new-button');
      await this.submitSaveQueryForm(name, description, includeFilters, includeTimeFilter);
    }

    async updateCurrentlyLoadedQuery(description, includeFilters, includeTimeFilter) {
      await this.openSavedQueryManagementComponent();
      await testSubjects.click('saved-query-management-save-changes-button');
      await this.submitSaveQueryForm(null, description, includeFilters, includeTimeFilter);
    }

    async loadSavedQuery(title) {
      await this.openSavedQueryManagementComponent();
      await testSubjects.click(`load-saved-query-${title}-button`);
      await retry.try(async () => {
        await this.openSavedQueryManagementComponent();
        const selectedSavedQueryText = await testSubjects.getVisibleText('saved-query-list-item-selected');
        expect(selectedSavedQueryText).to.eql(title);
      });
      await this.closeSavedQueryManagementComponent();
    }

    async deleteSavedQuery(title) {
      await this.openSavedQueryManagementComponent();
      await testSubjects.click(`delete-saved-query-${title}-button`);
      await testSubjects.click('confirmModalConfirmButton');
    }

    async clearCurrentlyLoadedQuery() {
      await this.openSavedQueryManagementComponent();
      await testSubjects.click('saved-query-management-clear-button');
      await this.closeSavedQueryManagementComponent();
      const queryString = await queryBar.getQueryString();
      expect(queryString).to.be.empty();
    }

    async submitSaveQueryForm(title, description, includeFilters, includeTimeFilter) {
      if (title) {
        await testSubjects.setValue('saveQueryFormTitle', title);
      }
      await testSubjects.setValue('saveQueryFormDescription', description);

      const currentIncludeFiltersValue = (await testSubjects.getAttribute('saveQueryFormIncludeFiltersOption', 'checked')) === 'true';
      if (currentIncludeFiltersValue !== includeFilters) {
        await testSubjects.click('saveQueryFormIncludeFiltersOption');
      }

      const currentIncludeTimeFilterValue = (await testSubjects.getAttribute('saveQueryFormIncludeTimeFilterOption', 'checked')) === 'true';
      if (currentIncludeTimeFilterValue !== includeTimeFilter) {
        await testSubjects.click('saveQueryFormIncludeTimeFilterOption');
      }

      await testSubjects.click('savedQueryFormSaveButton');
    }

    async savedQueryExistOrFail(title) {
      await this.openSavedQueryManagementComponent();
      await testSubjects.existOrFail(`load-saved-query-${title}-button`);
    }

    async savedQueryMissingOrFail(title) {
      await retry.try(async () => {
        await this.openSavedQueryManagementComponent();
        await testSubjects.missingOrFail(`load-saved-query-${title}-button`);
      });
      await this.closeSavedQueryManagementComponent();
    }

    async openSavedQueryManagementComponent() {
      const isOpenAlready = await testSubjects.exists('saved-query-management-popover');
      if (isOpenAlready) return;

      await testSubjects.click('saved-query-management-popover-button');
    }

    async closeSavedQueryManagementComponent() {
      const isOpenAlready = await testSubjects.exists('saved-query-management-popover');
      if (!isOpenAlready) return;

      await testSubjects.click('saved-query-management-popover-button');
    }

    async openSaveCurrentQueryModal() {
      await this.openSavedQueryManagementComponent();

      await retry.try(async () => {
        await testSubjects.click('saved-query-management-save-button');
        await testSubjects.existOrFail('saveQueryForm');
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

    async deleteSavedQueryMissingOrFail(title) {
      await this.openSavedQueryManagementComponent();
      await testSubjects.missingOrFail(`delete-saved-query-${title}-button`);
    }
  }

  return new SavedQueryManagementComponent();
}
