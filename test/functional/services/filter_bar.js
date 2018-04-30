export function FilterBarProvider({ getService }) {
  const remote = getService('remote');
  const testSubjects = getService('testSubjects');
  const find = getService('find');

  class FilterBar {
    hasFilter(key, value, enabled = true) {
      const filterActivationState = enabled ? 'enabled' : 'disabled';
      return testSubjects.exists(
        `filter & filter-key-${key} & filter-value-${value} & filter-${filterActivationState}`
      );
    }

    async removeFilter(key) {
      const filterElement = await testSubjects.find(`filter & filter-key-${key}`);
      await remote.moveMouseTo(filterElement);
      await testSubjects.click(`filter & filter-key-${key} removeFilter-${key}`);
    }

    async toggleFilterEnabled(key) {
      const filterElement = await testSubjects.find(`filter & filter-key-${key}`);
      await remote.moveMouseTo(filterElement);
      await testSubjects.click(`filter & filter-key-${key} disableFilter-${key}`);
    }

    async addFilter(field, operator, value, inputCssClass = 'ui-select-search') {
      await testSubjects.click('addFilter');
      let input = await find.byCssSelector(`filter-field-select input.ui-select-search`);
      await input.type(field);
      await remote.pressKeys('\uE006');
      input = await find.byCssSelector(`filter-operator-select input.ui-select-search`);
      await input.type(operator);
      await remote.pressKeys('\uE006');
      input = await find.byCssSelector(`filter-params-editor input.${inputCssClass}`);
      await input.type(value);
      await remote.pressKeys('\uE006');
      await testSubjects.click('saveFilter');
    }

    async clickEditFilter(key, value) {
      const pill = await testSubjects.find(`filter & filter-key-${key} & filter-value-${value}`);
      await remote.moveMouseTo(pill);
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
      console.log('found ' + groups.length + ' index pattern group labels');
      for (let i = 0; i < groups.length; i++) {
        indexPatterns.push(await groups[i].getVisibleText());
      }
      return indexPatterns;
    }
  }

  return new FilterBar();
}
