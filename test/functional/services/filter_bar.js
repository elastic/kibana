export function FilterBarProvider({ getService }) {
  const remote = getService('remote');
  const testSubjects = getService('testSubjects');

  class FilterBar {
    hasFilter(key, value, enabled = true) {
      const filterActivationState = enabled ? 'enabled' : 'disabled';
      return testSubjects.exists(
        `filter & filter-key-${key} & filter-value-${value} & filter-${filterActivationState}`
      );
    }

    async toggleFilterEnabled(key) {
      const filterElement = await testSubjects.find(`filter & filter-key-${key}`);
      await remote.moveMouseTo(filterElement);
      await testSubjects.find(`filter & filter-key-${key} disableFilter-${key}`).click();
    }
  }

  return new FilterBar();
}
