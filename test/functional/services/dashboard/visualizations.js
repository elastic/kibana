
export function DashboardVisualizationProvider({ getService, getPageObjects }) {
  const log = getService('log');
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['dashboard', 'visualize', 'header', 'discover']);

  return new class DashboardVisualizations {
    async createAndAddTSVBVisualization(name) {
      log.debug(`createAndAddTSVBVisualization(${name})`);
      const inViewMode = await PageObjects.dashboard.getIsInViewMode();
      if (inViewMode) {
        await PageObjects.dashboard.clickEdit();
      }
      await PageObjects.dashboard.clickAddVisualization();
      await PageObjects.dashboard.clickAddNewVisualizationLink();
      await PageObjects.visualize.clickVisualBuilder();
      await PageObjects.visualize.saveVisualization(name);
    }

    async createSavedSearch({ name, query, fields }) {
      log.debug(`createSavedSearch(${name})`);
      await PageObjects.header.clickDiscover();

      await PageObjects.dashboard.setTimepickerInDataRange();

      if (query) {
        await PageObjects.dashboard.setQuery(query);
        await PageObjects.dashboard.clickFilterButton();
      }

      if (fields) {
        for (let i = 0; i < fields.length; i++) {
          await PageObjects.discover.clickFieldListItemAdd(fields[i]);
        }
      }

      await PageObjects.discover.saveSearch(name);
      await PageObjects.header.waitUntilLoadingHasFinished();
      await testSubjects.exists('saveSearchSuccess');
    }

    async createAndAddSavedSearch({ name, query, fields }) {
      log.debug(`createAndAddSavedSearch(${name})`);
      await this.createSavedSearch({ name, query, fields });

      await PageObjects.header.clickDashboard();

      const inViewMode = await PageObjects.dashboard.getIsInViewMode();
      if (inViewMode) {
        await PageObjects.dashboard.clickEdit();
      }
      await PageObjects.dashboard.addSavedSearch(name);
    }
  };
}
