export function FilterBarProvider({ getService }) {
  const testSubjects = getService('testSubjects');

  class FilterBar {
    hasFilter(key, value, enabled = true) {
      const filterActivationState = enabled ? 'enabled' : 'disabled';
      return testSubjects.exists(
        `filter-key-${key} & filter-value-${value} & filter-${filterActivationState}`
      );
    }
  }

  return new FilterBar();
}
