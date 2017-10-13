import expect from 'expect.js';

export default function ({ getService, getPageObjects }) {
  const PageObjects = getPageObjects(['dashboard', 'visualize', 'header', 'discover']);
  const testSubjects = getService('testSubjects');

  describe('dashboard state', function describeIndexTests() {
    before(async function () {
      await PageObjects.dashboard.initTests();
      // This flip between apps fixes the url so state is preserved when switching apps in test mode.
      // Without this flip the url in test mode looks something like
      // "http://localhost:5620/app/kibana?_t=1486069030837#/dashboard?_g=...."
      // after the initial flip, the url will look like this: "http://localhost:5620/app/kibana#/dashboard?_g=...."
      await PageObjects.header.clickVisualize();
      await PageObjects.header.clickDashboard();
    });

    it('Tile map with no changes will update with visualization changes', async () => {
      await PageObjects.dashboard.clickNewDashboard();
      await PageObjects.dashboard.setTimepickerInDataRange();
      await PageObjects.dashboard.addVisualizations(['Visualization TileMap']);
      await PageObjects.dashboard.saveDashboard('No local edits');
      await PageObjects.header.clickToastOK();

      await testSubjects.moveMouseTo('dashboardPanel');
      await PageObjects.visualize.openSpyPanel();
      const tileMapData = await PageObjects.visualize.getDataTableData();
      await testSubjects.moveMouseTo('dashboardPanel');
      await PageObjects.visualize.closeSpyPanel();

      await PageObjects.dashboard.clickEdit();
      await PageObjects.dashboard.clickEditVisualization();
      await PageObjects.visualize.clickMapZoomIn();
      await PageObjects.visualize.clickMapZoomIn();

      await PageObjects.visualize.saveVisualization('Visualization TileMap');
      await PageObjects.header.clickDashboard();

      await testSubjects.moveMouseTo('dashboardPanel');
      await PageObjects.visualize.openSpyPanel();
      const changedTileMapData = await PageObjects.visualize.getDataTableData();
      await testSubjects.moveMouseTo('dashboardPanel');
      await PageObjects.visualize.closeSpyPanel();

      expect(changedTileMapData.length).to.not.equal(tileMapData.length);
    });

    it('Saved search with no changes will update when the saved object changes', async () => {
      await PageObjects.header.clickDiscover();
      await PageObjects.discover.clickFieldListItemAdd('bytes');
      await PageObjects.discover.saveSearch('my search');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.header.clickToastOK();

      await PageObjects.header.clickDashboard();
      await PageObjects.dashboard.addSavedSearch('my search');
      await PageObjects.dashboard.saveDashboard('No local edits');
      await PageObjects.header.clickToastOK();

      await PageObjects.header.clickDiscover();
      await PageObjects.discover.clickFieldListItemAdd('clientip');
      await PageObjects.discover.saveSearch('my search');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.header.clickToastOK();

      await PageObjects.header.clickDashboard();
      await PageObjects.header.waitUntilLoadingHasFinished();

      const headers = await PageObjects.discover.getColumnHeaders();
      expect(headers.length).to.be(3);
      expect(headers[1]).to.be('bytes');
      expect(headers[2]).to.be('clientip');
    });

  });
}
