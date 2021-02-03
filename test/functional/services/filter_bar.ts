/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import classNames from 'classnames';
import { FtrProviderContext } from '../ftr_provider_context';

export function FilterBarProvider({ getService, getPageObjects }: FtrProviderContext) {
  const comboBox = getService('comboBox');
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['common', 'header']);

  class FilterBar {
    /**
     * Checks if specified filter exists
     *
     * @param key field name
     * @param value filter value
     * @param enabled filter status
     * @param pinned filter pinned status
     * @param negated filter including or excluding value
     */
    public async hasFilter(
      key: string,
      value: string,
      enabled: boolean = true,
      pinned: boolean = false,
      negated: boolean = false
    ): Promise<boolean> {
      const filterActivationState = enabled ? 'enabled' : 'disabled';
      const filterPinnedState = pinned ? 'pinned' : 'unpinned';
      const filterNegatedState = negated ? 'filter-negated' : '';
      return testSubjects.exists(
        classNames(
          'filter',
          `filter-${filterActivationState}`,
          key !== '' && `filter-key-${key}`,
          value !== '' && `filter-value-${value}`,
          `filter-${filterPinnedState}`,
          filterNegatedState
        ),
        {
          allowHidden: true,
        }
      );
    }

    /**
     * Removes specified filter
     *
     * @param key field name
     */
    public async removeFilter(key: string): Promise<void> {
      await testSubjects.click(`~filter & ~filter-key-${key}`);
      await testSubjects.click(`deleteFilter`);
      await PageObjects.header.awaitGlobalLoadingIndicatorHidden();
    }

    /**
     * Removes all filters
     */
    public async removeAllFilters(): Promise<void> {
      await testSubjects.click('showFilterActions');
      await testSubjects.click('removeAllFilters');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.common.waitUntilUrlIncludes('filters:!()');
    }

    /**
     * Changes filter active status
     *
     * @param key field name
     */
    public async toggleFilterEnabled(key: string): Promise<void> {
      await testSubjects.click(`~filter & ~filter-key-${key}`);
      await testSubjects.click(`disableFilter`);
      await PageObjects.header.awaitGlobalLoadingIndicatorHidden();
    }

    public async toggleFilterPinned(key: string): Promise<void> {
      await testSubjects.click(`~filter & ~filter-key-${key}`);
      await testSubjects.click(`pinFilter`);
      await PageObjects.header.awaitGlobalLoadingIndicatorHidden();
    }

    public async isFilterPinned(key: string): Promise<boolean> {
      const filter = await testSubjects.find(`~filter & ~filter-key-${key}`);
      return (await filter.getAttribute('data-test-subj')).includes('filter-pinned');
    }

    public async getFilterCount(): Promise<number> {
      const filters = await testSubjects.findAll('~filter');
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
    public async addFilter(field: string, operator: string, ...values: any): Promise<void> {
      await testSubjects.click('addFilter');
      await comboBox.set('filterFieldSuggestionList', field);
      await comboBox.set('filterOperatorList', operator);
      const params = await testSubjects.find('filterParams');
      const paramsComboBoxes = await params.findAllByCssSelector(
        '[data-test-subj~="filterParamsComboBox"]',
        1000
      );
      const paramFields = await params.findAllByTagName('input', 1000);
      for (let i = 0; i < values.length; i++) {
        let fieldValues = values[i];
        if (!Array.isArray(fieldValues)) {
          fieldValues = [fieldValues];
        }

        if (paramsComboBoxes && paramsComboBoxes.length > 0) {
          for (let j = 0; j < fieldValues.length; j++) {
            await comboBox.setElement(paramsComboBoxes[i], fieldValues[j]);
          }
        } else if (paramFields && paramFields.length > 0) {
          for (let j = 0; j < fieldValues.length; j++) {
            await paramFields[i].type(fieldValues[j]);
          }
        }
      }
      await testSubjects.click('saveFilter');
      await PageObjects.header.awaitGlobalLoadingIndicatorHidden();
    }

    /**
     * Activates filter editing
     * @param key field name
     * @param value field value
     */
    public async clickEditFilter(key: string, value: string): Promise<void> {
      await testSubjects.click(`~filter & ~filter-key-${key} & ~filter-value-${value}`);
      await testSubjects.click(`editFilter`);
      await PageObjects.header.awaitGlobalLoadingIndicatorHidden();
    }

    /**
     * Returns available phrases in the filter
     */
    public async getFilterEditorSelectedPhrases(): Promise<string[]> {
      return await comboBox.getComboBoxSelectedOptions('~filterParamsComboBox');
    }

    /**
     * Returns available fields in the filter
     */
    public async getFilterEditorFields(): Promise<string[]> {
      const optionsString = await comboBox.getOptionsList('filterFieldSuggestionList');
      return optionsString.split('\n');
    }

    /**
     * Closes field editor modal window
     */
    public async ensureFieldEditorModalIsClosed(): Promise<void> {
      const cancelSaveFilterModalButtonExists = await testSubjects.exists('cancelSaveFilter');
      if (cancelSaveFilterModalButtonExists) {
        await testSubjects.click('cancelSaveFilter');
      }
      await testSubjects.waitForDeleted('cancelSaveFilter');
    }

    /**
     * Returns comma-separated list of index patterns
     */
    public async getIndexPatterns(): Promise<string> {
      await testSubjects.click('addFilter');
      const indexPatterns = await comboBox.getOptionsList('filterIndexPatternsSelect');
      await this.ensureFieldEditorModalIsClosed();
      return indexPatterns.trim().split('\n').join(',');
    }

    /**
     * Adds new index pattern filter
     * @param indexPatternTitle
     */
    public async selectIndexPattern(indexPatternTitle: string): Promise<void> {
      await testSubjects.click('addFilter');
      await comboBox.set('filterIndexPatternsSelect', indexPatternTitle);
    }
  }

  return new FilterBar();
}
