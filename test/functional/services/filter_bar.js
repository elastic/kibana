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

export function FilterBarProvider({ getService, getPageObjects }) {
  const testSubjects = getService('testSubjects');
  const comboBox = getService('comboBox');
  const PageObjects = getPageObjects(['common', 'header']);

  class FilterBar {
    hasFilter(key, value, enabled = true) {
      const filterActivationState = enabled ? 'enabled' : 'disabled';
      return testSubjects.exists(
        `filter & filter-key-${key} & filter-value-${value} & filter-${filterActivationState}`
      );
    }

    async removeFilter(key) {
      await testSubjects.click(`filter & filter-key-${key}`);
      await testSubjects.click(`deleteFilter`);
      await PageObjects.header.awaitGlobalLoadingIndicatorHidden();
    }

    async removeAllFilters() {
      await testSubjects.click('showFilterActions');
      await testSubjects.click('removeAllFilters');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.common.waitUntilUrlIncludes('filters:!()');
    }

    async toggleFilterEnabled(key) {
      await testSubjects.click(`filter & filter-key-${key}`);
      await testSubjects.click(`disableFilter`);
      await PageObjects.header.awaitGlobalLoadingIndicatorHidden();
    }

    async toggleFilterPinned(key) {
      await testSubjects.click(`filter & filter-key-${key}`);
      await testSubjects.click(`pinFilter`);
      await PageObjects.header.awaitGlobalLoadingIndicatorHidden();
    }

    async getFilterCount() {
      const filters = await testSubjects.findAll('filter');
      return filters.length;
    }

    /**
     * Adds a filter to the filter bar.
     *
     * @param {string} field The name of the field the filter should be applied for.
     * @param {string} operator A valid operator for that fields, e.g. "is one of", "is", "exists", etc.
     * @param {string[]|string} values The remaining parameters are the values passed into the individual
     *   value input fields, i.e. the third parameter into the first input field, the fourth into the second, etc.
     *   Each value itself can be an array, in case you want to enter multiple values into one field (e.g. for "is one of"):
     * @example
     * // Add a plain single value
     * filterBar.addFilter('country', 'is', 'NL');
     * // Add an exists filter
     * filterBar.addFilter('country', 'exists');
     * // Add a range filter for a numeric field
     * filterBar.addFilter('bytes', 'is between', '500', '1000');
     * // Add a filter containing multiple values
     * filterBar.addFilter('extension', 'is one of', ['jpg', 'png']);
     */
    async addFilter(field, operator, ...values) {
      await testSubjects.click('addFilter');
      await comboBox.set('filterFieldSuggestionList', field);
      await comboBox.set('filterOperatorList', operator);
      const params = await testSubjects.find('filterParams');
      const paramsComboBoxes = await params.findAllByCssSelector('[data-test-subj~="filterParamsComboBox"]');
      const paramFields = await params.findAllByTagName('input');
      for (let i = 0; i < values.length; i++) {
        let fieldValues = values[i];
        if (!Array.isArray(fieldValues)) {
          fieldValues = [fieldValues];
        }

        if (paramsComboBoxes && paramsComboBoxes.length > 0) {
          for (let j = 0; j < fieldValues.length; j++) {
            await comboBox.setElement(paramsComboBoxes[i], fieldValues[j]);
          }
        }
        else if (paramFields && paramFields.length > 0) {
          for (let j = 0; j < fieldValues.length; j++) {
            await paramFields[i].type(fieldValues[j]);
          }
        }
      }
      await testSubjects.click('saveFilter');
      await PageObjects.header.awaitGlobalLoadingIndicatorHidden();
    }

    async clickEditFilter(key, value) {
      await testSubjects.click(`filter & filter-key-${key} & filter-value-${value}`);
      await testSubjects.click(`editFilter`);
      await PageObjects.header.awaitGlobalLoadingIndicatorHidden();
    }

    async getFilterEditorSelectedPhrases() {
      return await comboBox.getComboBoxSelectedOptions('filterParamsComboBox');
    }

    async getFilterEditorFields() {
      const optionsString = await comboBox.getOptionsList('filterFieldSuggestionList');
      return optionsString.split('\n');
    }

    async ensureFieldEditorModalIsClosed() {
      const cancelSaveFilterModalButtonExists = await testSubjects.exists('cancelSaveFilter');
      if (cancelSaveFilterModalButtonExists) {
        await testSubjects.click('cancelSaveFilter');
      }
    }
  }

  return new FilterBar();
}
