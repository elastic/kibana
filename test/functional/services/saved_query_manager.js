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

export function SavedQueryManagerProvider({ getService }) {
  const testSubjects = getService('testSubjects');
  const queryBar = getService('queryBar');

  class SavedQueryManager {

    async saveNewQuery(name, description, includeFilters, includeTimeFilter) {
      await this.openSavedQueryManager();
      await testSubjects.click('saved-query-manager-save-button');
      await this.submitSaveQueryForm(name, description, includeFilters, includeTimeFilter);
    }

    async saveCurrentlyLoadedAsNewQuery(name, description, includeFilters, includeTimeFilter) {
      await this.openSavedQueryManager();
      await testSubjects.click('saved-query-manager-save-as-new-button');
      await this.submitSaveQueryForm(name, description, includeFilters, includeTimeFilter);
    }

    async updateCurrentlyLoadedQuery(description, includeFilters, includeTimeFilter) {
      await this.openSavedQueryManager();
      await testSubjects.click('saved-query-manager-save-changes-button');
      await this.submitSaveQueryForm(null, description, includeFilters, includeTimeFilter);
    }

    async loadSavedQuery(title) {
      await this.openSavedQueryManager();
      await testSubjects.click(`load-saved-query-${title}-button`);
    }

    async deleteSavedQuery(title) {
      await this.openSavedQueryManager();
      await testSubjects.click(`delete-saved-query-${title}-button`);
      await testSubjects.click('confirmModalConfirmButton');
    }

    async clearCurrentlyLoadedQuery() {
      await this.openSavedQueryManager();
      await testSubjects.click('saved-query-manager-clear-button');
      await this.closeSavedQueryManager();
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
      await this.openSavedQueryManager();
      await testSubjects.existOrFail(`load-saved-query-${title}-button`);
    }

    async savedQueryMissingOrFail(title) {
      await this.openSavedQueryManager();
      await testSubjects.missingOrFail(`load-saved-query-${title}-button`);
    }

    async openSavedQueryManager() {
      const isOpenAlready = await testSubjects.exists('saved-query-manager-popover');
      if (isOpenAlready) return;

      await testSubjects.click('saved-query-manager-popover-button');
    }

    async closeSavedQueryManager() {
      const isOpenAlready = await testSubjects.exists('saved-query-manager-popover');
      if (!isOpenAlready) return;

      await testSubjects.click('saved-query-manager-popover-button');
    }

    async saveNewQueryMissingOrFail() {
      await this.openSavedQueryManager();
      await testSubjects.missingOrFail('saved-query-manager-save-button');
    }

    async deleteSavedQueryMissingOrFail(title) {
      await this.openSavedQueryManager();
      await testSubjects.missingOrFail(`delete-saved-query-${title}-button`);
    }
  }

  return new SavedQueryManager();
}
