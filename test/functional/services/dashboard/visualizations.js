
export function DashboardVisualizationProvider({ getService, getPageObjects }) {
  const log = getService('log');
  const PageObjects = getPageObjects(['dashboard', 'visualize', 'header']);

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
  };
}
