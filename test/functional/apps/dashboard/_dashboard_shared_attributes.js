import expect from 'expect.js';

export default function ({ getService, getPageObjects }) {
  const retry = getService('retry');
  const log = getService('log');
  const dashboardVisualizations = getService('dashboardVisualizations');
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['dashboard']);
  const testVisualizationTitles = [PageObjects.dashboard.getTestVisualizationNames()[0], 'saved search'];
  const testVisualizationDescriptions = [PageObjects.dashboard.getTestVisualizationDescriptions()[0], ''];

  describe('dashboard shared attributes', function describeIndexTests() {
    before(async function () {
      await PageObjects.dashboard.initTests();
      await PageObjects.dashboard.preserveCrossAppState();
      await PageObjects.dashboard.clickNewDashboard();
      await PageObjects.dashboard.addVisualizations([PageObjects.dashboard.getTestVisualizationNames()[0]]);
      await dashboardVisualizations.createAndAddSavedSearch({ name: 'saved search', fields: ['bytes', 'agent'] });
    });

    it('should have data-shared-items-count set to the number of visualizations', function checkSavedItemsCount() {
      return retry.tryForTime(10000, () => PageObjects.dashboard.getSharedItemsCount())
        .then(function (count) {
          log.info('data-shared-items-count = ' + count);
          expect(count).to.eql(testVisualizationTitles.length);
        });
    });

    it('should have panels with expected data-shared-item title and description', async () => {
      await retry.try(async () => {
        await PageObjects.dashboard.getPanelSharedItemData()
          .then(function (data) {
            expect(data.map(item => item.title)).to.eql(testVisualizationTitles);
            expect(data.map(item => item.description)).to.eql(testVisualizationDescriptions);
          });
      });
    });

    it('data-shared-item title should update a viz when using a custom panel title', async () => {
      const CUSTOM_VIS_TITLE = 'ima custom title for a vis!';
      await PageObjects.dashboard.setCustomPanelTitle(CUSTOM_VIS_TITLE);
      await retry.try(async () => {
        const sharedData = await PageObjects.dashboard.getPanelSharedItemData();
        const foundSharedItemTitle = !!sharedData.find(item => {
          return item.title === CUSTOM_VIS_TITLE;
        });
        expect(foundSharedItemTitle).to.be(true);
      });
    });

    it('data-shared-item title is cleared with an empty panel title string', async () => {
      await PageObjects.dashboard.setCustomPanelTitle('h\b');
      await retry.try(async () => {
        const sharedData = await PageObjects.dashboard.getPanelSharedItemData();
        const foundSharedItemTitle = !!sharedData.find(item => {
          return item.title === '';
        });
        expect(foundSharedItemTitle).to.be(true);
      });
    });

    it('data-shared-item title can be reset', async () => {
      await PageObjects.dashboard.resetCustomPanelTitle();
      await retry.try(async () => {
        const sharedData = await PageObjects.dashboard.getPanelSharedItemData();
        const foundOriginalSharedItemTitle = !!sharedData.find(item => {
          return item.title === testVisualizationTitles[0];
        });
        expect(foundOriginalSharedItemTitle).to.be(true);
      });
    });

    it('data-shared-item title should update a saved search when using a custom panel title', async () => {
      const CUSTOM_SEARCH_TITLE = 'ima custom title for a search!';
      const panels = await PageObjects.dashboard.getDashboardPanels();
      // The reverse is only to take advantage of the fact that the saved search is last at the time of writing this
      // test which speeds things up.
      const searchPanel = await Promise.race(panels.map(async panel => {
        return new Promise(async resolve => {
          const savedSearchPanel = await testSubjects.descendantExists('embeddedSavedSearchDocTable', panel);
          if (savedSearchPanel) {
            resolve(panel);
          }
        });
      }));
      await PageObjects.dashboard.setCustomPanelTitle(CUSTOM_SEARCH_TITLE, searchPanel);
      await retry.try(async () => {
        const sharedData = await PageObjects.dashboard.getPanelSharedItemData();
        const foundSharedItemTitle = !!sharedData.find(item => {
          return item.title === CUSTOM_SEARCH_TITLE;
        });
        console.log('foundSharedItemTitle: ' + foundSharedItemTitle);

        expect(foundSharedItemTitle).to.be(true);
      });
    });
  });
}
