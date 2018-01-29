import expect from 'expect.js';

export default function ({ getService, getPageObjects }) {
  const PageObjects = getPageObjects(['dashboard', 'header', 'common']);
  const remote = getService('remote');

  describe('dashboard listing page', function describeIndexTests() {
    const dashboardName = 'Dashboard Listing Test';

    before(async function () {
      await PageObjects.dashboard.initTests();
    });

    describe('create prompt', async () => {
      it('appears when there are no dashboards', async function () {
        const promptExists = await PageObjects.dashboard.getCreateDashboardPromptExists();
        expect(promptExists).to.be(true);
      });

      it('creates a new dashboard', async function () {
        await PageObjects.dashboard.clickCreateDashboardPrompt();
        await PageObjects.dashboard.saveDashboard(dashboardName);

        await PageObjects.dashboard.gotoDashboardLandingPage();
        const countOfDashboards = await PageObjects.dashboard.getDashboardCountWithName(dashboardName);
        expect(countOfDashboards).to.equal(1);
      });

      it('is not shown when there is a dashboard', async function () {
        const promptExists = await PageObjects.dashboard.getCreateDashboardPromptExists();
        expect(promptExists).to.be(false);
      });

      it('is not shown when there are no dashboards shown during a search', async function () {
        const countOfDashboards = await PageObjects.dashboard.getDashboardCountWithName('gobeldeguck');
        expect(countOfDashboards).to.equal(0);

        const promptExists = await PageObjects.dashboard.getCreateDashboardPromptExists();
        expect(promptExists).to.be(false);
      });
    });

    describe('delete', async function () {
      it('default confirm action is cancel', async function () {
        await PageObjects.dashboard.searchForDashboardWithName('');
        await PageObjects.dashboard.clickListItemCheckbox();
        await PageObjects.dashboard.clickDeleteSelectedDashboards();

        await PageObjects.common.pressEnterKey();

        const isConfirmOpen = await PageObjects.common.isConfirmModalOpen();
        expect(isConfirmOpen).to.be(false);

        const countOfDashboards = await PageObjects.dashboard.getDashboardCountWithName(dashboardName);
        expect(countOfDashboards).to.equal(1);
      });

      it('succeeds on confirmation press', async function () {
        await PageObjects.dashboard.clickListItemCheckbox();
        await PageObjects.dashboard.clickDeleteSelectedDashboards();

        await PageObjects.common.clickConfirmOnModal();

        const countOfDashboards = await PageObjects.dashboard.getDashboardCountWithName(dashboardName);
        expect(countOfDashboards).to.equal(0);
      });
    });

    describe('search', function () {
      before(async () => {
        await PageObjects.dashboard.clearSearchValue();
        await PageObjects.dashboard.clickCreateDashboardPrompt();
        await PageObjects.dashboard.saveDashboard('Two Words');
      });

      it('matches on the first word', async function () {
        await PageObjects.dashboard.searchForDashboardWithName('Two');
        const countOfDashboards = await PageObjects.dashboard.getCountOfDashboardsInListingTable();
        expect(countOfDashboards).to.equal(1);
      });

      it('matches the second word', async function () {
        await PageObjects.dashboard.searchForDashboardWithName('Words');
        const countOfDashboards = await PageObjects.dashboard.getCountOfDashboardsInListingTable();
        expect(countOfDashboards).to.equal(1);
      });

      it('matches the second word prefix', async function () {
        await PageObjects.dashboard.searchForDashboardWithName('Wor');
        const countOfDashboards = await PageObjects.dashboard.getCountOfDashboardsInListingTable();
        expect(countOfDashboards).to.equal(1);
      });

      it('does not match mid word', async function () {
        await PageObjects.dashboard.searchForDashboardWithName('ords');
        const countOfDashboards = await PageObjects.dashboard.getCountOfDashboardsInListingTable();
        expect(countOfDashboards).to.equal(0);
      });

      it('is case insensitive', async function () {
        await PageObjects.dashboard.searchForDashboardWithName('two words');
        const countOfDashboards = await PageObjects.dashboard.getCountOfDashboardsInListingTable();
        expect(countOfDashboards).to.equal(1);
      });
    });

    describe('search by title', function () {
      it('loads a dashboard if title matches', async function () {
        const currentUrl = await remote.getCurrentUrl();
        const newUrl = currentUrl + '&title=Two%20Words';
        // Only works on a hard refresh.
        const useTimeStamp = true;
        await remote.get(newUrl.toString(), useTimeStamp);

        const onDashboardLandingPage = await PageObjects.dashboard.onDashboardLandingPage();
        expect(onDashboardLandingPage).to.equal(false);
      });

      it('title match is case insensitive', async function () {
        await PageObjects.dashboard.gotoDashboardLandingPage();
        const currentUrl = await remote.getCurrentUrl();
        const newUrl = currentUrl + '&title=two%20words';
        // Only works on a hard refresh.
        const useTimeStamp = true;
        await remote.get(newUrl.toString(), useTimeStamp);

        const onDashboardLandingPage = await PageObjects.dashboard.onDashboardLandingPage();
        expect(onDashboardLandingPage).to.equal(false);
      });

      it('stays on listing page if title matches no dashboards', async function () {
        await PageObjects.dashboard.gotoDashboardLandingPage();
        const currentUrl = await remote.getCurrentUrl();
        const newUrl = currentUrl + '&title=nodashboardsnamedme';
        // Only works on a hard refresh.
        const useTimeStamp = true;
        await remote.get(newUrl.toString(), useTimeStamp);

        await PageObjects.header.waitUntilLoadingHasFinished();
        const onDashboardLandingPage = await PageObjects.dashboard.onDashboardLandingPage();
        expect(onDashboardLandingPage).to.equal(true);
      });

      it('preloads search filter bar when there is no match', async function () {
        const searchFilter = await PageObjects.dashboard.getSearchFilterValue();
        expect(searchFilter).to.equal('"nodashboardsnamedme"');
      });

      it('stays on listing page if title matches two dashboards', async function () {
        await PageObjects.dashboard.clickNewDashboard();
        await PageObjects.dashboard.saveDashboard('two words', { needsConfirm: true });
        await PageObjects.dashboard.gotoDashboardLandingPage();
        const currentUrl = await remote.getCurrentUrl();
        const newUrl = currentUrl + '&title=two%20words';
        // Only works on a hard refresh.
        const useTimeStamp = true;
        await remote.get(newUrl.toString(), useTimeStamp);

        await PageObjects.header.waitUntilLoadingHasFinished();
        const onDashboardLandingPage = await PageObjects.dashboard.onDashboardLandingPage();
        expect(onDashboardLandingPage).to.equal(true);
      });

      it('preloads search filter bar when there is more than one match', async function () {
        const searchFilter = await PageObjects.dashboard.getSearchFilterValue();
        expect(searchFilter).to.equal('"two words"');
      });

      it('matches a title with many special characters', async function () {
        await PageObjects.dashboard.clickNewDashboard();
        await PageObjects.dashboard.saveDashboard('i am !@#$%^&*()_+~`,.<>{}[]; so special');
        await PageObjects.dashboard.gotoDashboardLandingPage();
        const currentUrl = await remote.getCurrentUrl();
        // Need to encode that one.
        const newUrl = currentUrl + '&title=i%20am%20%21%40%23%24%25%5E%26%2A%28%29_%2B~%60%2C.%3C%3E%7B%7D%5B%5D%3B%20so%20special';
        // Only works on a hard refresh.
        const useTimeStamp = true;
        await remote.get(newUrl.toString(), useTimeStamp);

        await PageObjects.header.waitUntilLoadingHasFinished();
        const onDashboardLandingPage = await PageObjects.dashboard.onDashboardLandingPage();
        expect(onDashboardLandingPage).to.equal(false);
      });
    });
  });
}
