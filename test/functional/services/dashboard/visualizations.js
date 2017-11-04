
export function DashboardVisualizationProvider({ getService, getPageObjects }) {
  const log = getService('log');
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
      await PageObjects.visualize.saveVisualization('TSVB');
      await PageObjects.header.clickToastOK();
    }

    async createAndAddSavedSearch(name) {
      log.debug(`createAndAddSavedSearch(${name})`);
      await PageObjects.header.clickDiscover();
      await PageObjects.dashboard.setTimepickerInDataRange();
      await PageObjects.discover.clickFieldListItemAdd('bytes');
      await PageObjects.discover.clickFieldListItemAdd('agent');
      await PageObjects.discover.saveSearch(name);
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.header.clickToastOK();

      await PageObjects.header.clickDashboard();

      const inViewMode = await PageObjects.dashboard.getIsInViewMode();
      if (inViewMode) {
        await PageObjects.dashboard.clickEdit();
      }
      await PageObjects.dashboard.addSavedSearch(name);
    }
  };
}
