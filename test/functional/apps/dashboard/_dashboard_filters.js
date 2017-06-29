import expect from 'expect.js';

export default function ({ getPageObjects }) {
  const PageObjects = getPageObjects(['settings', 'dashboard', 'header', 'visualize']);

  describe('dashboard filters', function describeIndexTests() {
    before(async function () {
      await PageObjects.dashboard.initTests();
      await PageObjects.dashboard.retainStateAcrossApps();
    });

    describe('lucene', function () {
      it('do not exist by default', async function () {
        await PageObjects.dashboard.clickNewDashboard();
        await PageObjects.dashboard.setTimepickerInDataRange();
        const filters = await PageObjects.dashboard.getFilters(1000);
        expect(filters.length).to.equal(0);
      });

      it('one filter is added when a pie chart slice is clicked', async function () {
        await PageObjects.dashboard.clickAddVisualization();
        await PageObjects.dashboard.clickAddNewVisualizationLink();
        await PageObjects.visualize.clickPieChart();
        await PageObjects.visualize.clickNewSearch();
        await PageObjects.visualize.clickBucket('Split Slices');
        await PageObjects.visualize.selectAggregation('Terms');
        await PageObjects.visualize.selectField('ip');
        await PageObjects.visualize.clickGo();
        await PageObjects.visualize.saveVisualization('ip pie');
        await PageObjects.header.clickToastOK();
        await PageObjects.dashboard.filterOnPieSlice();
        const filters = await PageObjects.dashboard.getFilters();
        expect(filters.length).to.equal(1);
      });

      it('a second filter is added when another pie chart slice is clicked', async function () {
        await PageObjects.dashboard.clickAddVisualization();
        await PageObjects.dashboard.clickAddNewVisualizationLink();
        await PageObjects.visualize.clickPieChart();
        await PageObjects.visualize.clickNewSearch();
        await PageObjects.visualize.clickBucket('Split Slices');
        await PageObjects.visualize.selectAggregation('Terms');
        await PageObjects.visualize.selectField('bytes');
        await PageObjects.visualize.clickGo();
        await PageObjects.visualize.saveVisualization('bytes pie');
        await PageObjects.header.clickToastOK();
        await PageObjects.dashboard.filterOnPieSlice(1);
        const filters = await PageObjects.dashboard.getFilters();
        expect(filters.length).to.equal(2);
      });
    });

    describe('kquery', function () {
      before(async function () {
        await PageObjects.settings.navigateTo();
        await PageObjects.settings.clickKibanaSettings();
        await PageObjects.settings.toggleAdvancedSettingCheckbox('search:queryLanguage:switcher:enable');
        await PageObjects.header.clickDashboard();
        await PageObjects.dashboard.setTimepickerInDataRange();
      });

      it('enabling query language switcher retains filters', async function () {
        const filters = await PageObjects.dashboard.getFilters();
        expect(filters.length).to.equal(2);
      });

      it('switching query language clears filters', async function () {
        await PageObjects.header.clickQueryBarLanguageSelector();
        const queryLanguageSelector = await PageObjects.header.findQueryBarLanguageSelector();
        const kueryOption = await queryLanguageSelector.findByCssSelector('[label="kuery"]');
        await kueryOption.click();
        const filters = await PageObjects.dashboard.getFilters(1000);
        expect(filters.length).to.equal(0);
        const query = await PageObjects.dashboard.getQuery();
        expect(query.length).to.equal(0);
      });

      it('query is updated when a pie chart slice is clicked', async function () {
        await PageObjects.dashboard.filterOnPieSlice();
        const query = await PageObjects.dashboard.getQuery();
        expect(query.length).to.be.greaterThan(0);
      });

      it('and no filter bars are added', async function () {
        const filters = await PageObjects.dashboard.getFilters(1000);
        expect(filters.length).to.equal(0);
      });

      it('a second filter is added when another pie chart slice is clicked', async function () {
        const query = await PageObjects.dashboard.getQuery();
        const firstQueryLength = query.length;
        await PageObjects.dashboard.filterOnPieSlice(1);

        // We've filtered on two different pie charts, so there should only be two slices visible now.
        const pieSlices = await PageObjects.dashboard.getAllPieSlices();
        expect(pieSlices.length).to.equal(2);

        const longerQuery = await PageObjects.dashboard.getQuery();
        expect(longerQuery.length).to.be.greaterThan(firstQueryLength);
      });
    });
  });
}
