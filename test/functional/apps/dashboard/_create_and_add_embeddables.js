import expect from 'expect.js';

import {
  VisualizeConstants
} from '../../../../src/core_plugins/kibana/public/visualize/visualize_constants';

export default function ({ getService, getPageObjects }) {
  const retry = getService('retry');
  const PageObjects = getPageObjects(['dashboard', 'header', 'visualize']);
  const remote = getService('remote');
  const dashboardAddPanel = getService('dashboardAddPanel');

  describe('create and add embeddables', async () => {
    before(async () => {
      await PageObjects.dashboard.loadSavedDashboard('few panels');
    });

    describe('add new visualization link', () => {
      it('adds a new visualization', async () => {
        const originalPanelCount = await PageObjects.dashboard.getPanelCount();
        await PageObjects.dashboard.clickEdit();
        await dashboardAddPanel.ensureAddPanelIsShowing();
        await dashboardAddPanel.clickAddNewEmbeddableLink();
        await PageObjects.visualize.clickAreaChart();
        await PageObjects.visualize.clickNewSearch();
        await PageObjects.visualize.saveVisualization('visualization from add new link');

        return retry.try(async () => {
          const panelCount = await PageObjects.dashboard.getPanelCount();
          expect(panelCount).to.eql(originalPanelCount + 1);
        });
      });

      it('saves the saved visualization url to the app link', async () => {
        await PageObjects.header.clickVisualize();
        const currentUrl = await remote.getCurrentUrl();
        expect(currentUrl).to.contain(VisualizeConstants.EDIT_PATH);
      });

      after(async () => {
        await PageObjects.header.clickDashboard();
      });
    });
  });
}

