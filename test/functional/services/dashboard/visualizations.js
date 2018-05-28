
export function DashboardVisualizationProvider({ getService, getPageObjects }) {
  const log = getService('log');
  const queryBar = getService('queryBar');
  const testSubjects = getService('testSubjects');
  const dashboardAddPanel = getService('dashboardAddPanel');
  const PageObjects = getPageObjects(['dashboard', 'visualize', 'header', 'discover']);

  return new class DashboardVisualizations {
    async createAndAddTSVBVisualization(name) {
      log.debug(`createAndAddTSVBVisualization(${name})`);
      const inViewMode = await PageObjects.dashboard.getIsInViewMode();
      if (inViewMode) {
        await PageObjects.dashboard.clickEdit();
      }
      await dashboardAddPanel.ensureAddPanelIsShowing();
      await dashboardAddPanel.clickAddNewEmbeddableLink();
      await PageObjects.visualize.clickVisualBuilder();
      await PageObjects.visualize.saveVisualization(name);
    }

    async createSavedSearch({ name, query, fields }) {
      log.debug(`createSavedSearch(${name})`);
      await PageObjects.header.clickDiscover();

      await PageObjects.dashboard.setTimepickerInHistoricalDataRange();

      if (query) {
        await queryBar.setQuery(query);
        await queryBar.submitQuery();
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
      await dashboardAddPanel.addSavedSearch(name);
    }

    async createAndAddMarkdown({ name, markdown }) {
      log.debug(`createAndAddMarkdown(${markdown})`);
      const inViewMode = await PageObjects.dashboard.getIsInViewMode();
      if (inViewMode) {
        await PageObjects.dashboard.clickEdit();
      }
      await dashboardAddPanel.ensureAddPanelIsShowing();
      await dashboardAddPanel.clickAddNewEmbeddableLink();
      await PageObjects.visualize.clickMarkdownWidget();
      await PageObjects.visualize.setMarkdownTxt(markdown);
      await PageObjects.visualize.clickGo();
      await PageObjects.visualize.saveVisualization(name);
    }
  };
}
