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
  const browser = getService('browser');
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const PageObjects = getPageObjects(['common', 'header']);

  async function typeIntoReactSelect(testSubj, value) {
    const select = await testSubjects.find(testSubj);
    const input = await select.findByClassName('ui-select-search');
    await input.type(value);
    const activeSelection = await select.findByClassName('active');
    await activeSelection.click();
  }

  class FilterBar {
    hasFilter(key, value, enabled = true) {
      const filterActivationState = enabled ? 'enabled' : 'disabled';
      return testSubjects.exists(
        `filter & filter-key-${key} & filter-value-${value} & filter-${filterActivationState}`
      );
    }

    async removeFilter(key) {
      const filterElement = await testSubjects.find(`filter & filter-key-${key}`);
      await browser.moveMouseTo(filterElement);
      await testSubjects.click(`filter & filter-key-${key} removeFilter-${key}`);
      await PageObjects.header.awaitGlobalLoadingIndicatorHidden();
    }

    async toggleFilterEnabled(key) {
      const filterElement = await testSubjects.find(`filter & filter-key-${key}`);
      await browser.moveMouseTo(filterElement);
      await testSubjects.click(`filter & filter-key-${key} disableFilter-${key}`);
      await PageObjects.header.awaitGlobalLoadingIndicatorHidden();
    }

    async toggleFilterPinned(key) {
      const filterElement = await testSubjects.find(`filter & filter-key-${key}`);
      await browser.moveMouseTo(filterElement);
      await testSubjects.click(`filter & filter-key-${key} pinFilter-${key}`);
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
      await typeIntoReactSelect('filterfieldSuggestionList', field);
      await typeIntoReactSelect('filterOperatorList', operator);
      const params = await testSubjects.find('filterParams');
      const paramFields = await params.findAllByTagName('input');
      for (let i = 0; i < values.length; i++) {
        let fieldValues = values[i];
        if (!Array.isArray(fieldValues)) {
          fieldValues = [fieldValues];
        }
        for (let j = 0; j < fieldValues.length; j++) {
          await paramFields[i].type(fieldValues[j]);
          await paramFields[i].pressKeys(browser.keys.RETURN);
        }
      }
      await testSubjects.click('saveFilter');
      await PageObjects.header.awaitGlobalLoadingIndicatorHidden();
    }

    async clickEditFilter(key, value) {
      const pill = await testSubjects.find(`filter & filter-key-${key} & filter-value-${value}`);
      await browser.moveMouseTo(pill);
      await testSubjects.click('editFilter');
    }

    async getFilterEditorPhrases() {
      const spans = await testSubjects.findAll('filterEditorPhrases');
      return await Promise.all(spans.map(el => el.getVisibleText()));
    }

    async ensureFieldEditorModalIsClosed() {
      const closeFilterEditorModalButtonExists = await testSubjects.exists('filterEditorModalCloseButton');
      if (closeFilterEditorModalButtonExists) {
        await testSubjects.click('filterEditorModalCloseButton');
      }
    }

    async getFilterFieldIndexPatterns() {
      const indexPatterns = [];
      const groups = await find.allByCssSelector('.ui-select-choices-group-label');
      for (let i = 0; i < groups.length; i++) {
        indexPatterns.push(await groups[i].getVisibleText());
      }
      return indexPatterns;
    }
  }

  return new FilterBar();
}
