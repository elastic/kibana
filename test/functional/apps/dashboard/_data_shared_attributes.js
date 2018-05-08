import expect from 'expect.js';

export default function ({ getService, getPageObjects }) {
  const retry = getService('retry');
  const dashboardPanelActions = getService('dashboardPanelActions');
  const PageObjects = getPageObjects(['dashboard']);

  describe('dashboard data-shared attributes', function describeIndexTests() {
    let originalPanelTitles;

    before(async () => {
      await PageObjects.dashboard.loadSavedDashboard('dashboard with everything');
    });

    it('should have data-shared-items-count set to the number of embeddables on the dashboard', async () => {
      await retry.try(async () => {
        const sharedItemsCount = await PageObjects.dashboard.getSharedItemsCount();
        const panelCount = await PageObjects.dashboard.getPanelCount();
        expect(sharedItemsCount).to.eql(panelCount);
      });
    });

    it('should have panels with expected data-shared-item title', async () => {
      await retry.try(async () => {
        const sharedData = await PageObjects.dashboard.getPanelSharedItemData();
        originalPanelTitles = await PageObjects.dashboard.getPanelTitles();
        expect(sharedData.map(item => item.title)).to.eql(originalPanelTitles);
      });
    });

    it('data shared item container data has description and title set', async () => {
      const sharedContainerData = await PageObjects.dashboard.getSharedContainerData();
      expect(sharedContainerData.title).to.be('dashboard with everything');
      expect(sharedContainerData.description).to.be(
        'I have one of every visualization type since the last time I was created!');
    });

    it('data-shared-item title should update a viz when using a custom panel title', async () => {
      await PageObjects.dashboard.clickEdit();
      const CUSTOM_VIS_TITLE = 'ima custom title for a vis!';
      await dashboardPanelActions.setCustomPanelTitle(CUSTOM_VIS_TITLE);
      await retry.try(async () => {
        const sharedData = await PageObjects.dashboard.getPanelSharedItemData();
        const foundSharedItemTitle = !!sharedData.find(item => {
          return item.title === CUSTOM_VIS_TITLE;
        });
        expect(foundSharedItemTitle).to.be(true);
      });
    });

    it('data-shared-item title is cleared with an empty panel title string', async () => {
      await dashboardPanelActions.setCustomPanelTitle('h\b');
      await retry.try(async () => {
        const sharedData = await PageObjects.dashboard.getPanelSharedItemData();
        const foundSharedItemTitle = !!sharedData.find(item => {
          return item.title === '';
        });
        expect(foundSharedItemTitle).to.be(true);
      });
    });

    it('data-shared-item title can be reset', async () => {
      await dashboardPanelActions.resetCustomPanelTitle();
      await retry.try(async () => {
        const sharedData = await PageObjects.dashboard.getPanelSharedItemData();
        const foundOriginalSharedItemTitle = !!sharedData.find(item => {
          return item.title === originalPanelTitles[0];
        });
        expect(foundOriginalSharedItemTitle).to.be(true);
      });
    });

    it('data-shared-item title should update a saved search when using a custom panel title', async () => {
      const CUSTOM_SEARCH_TITLE = 'ima custom title for a search!';
      await dashboardPanelActions.setCustomPanelTitle(CUSTOM_SEARCH_TITLE, 'Rendering Test: saved search');
      await retry.try(async () => {
        const sharedData = await PageObjects.dashboard.getPanelSharedItemData();
        const foundSharedItemTitle = !!sharedData.find(item => {
          return item.title === CUSTOM_SEARCH_TITLE;
        });
        expect(foundSharedItemTitle).to.be(true);
      });
    });
  });
}
