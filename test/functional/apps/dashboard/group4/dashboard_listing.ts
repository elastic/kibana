/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['dashboard', 'header', 'common']);
  const browser = getService('browser');
  const listingTable = getService('listingTable');
  const dashboardAddPanel = getService('dashboardAddPanel');

  describe('dashboard listing page', function describeIndexTests() {
    const dashboardName = 'Dashboard Listing Test';

    before(async function () {
      await PageObjects.dashboard.initTests();
    });

    describe('create prompt', () => {
      it('appears when there are no dashboards', async function () {
        const promptExists = await PageObjects.dashboard.getCreateDashboardPromptExists();
        expect(promptExists).to.be(true);
      });

      it('creates a new dashboard', async function () {
        await PageObjects.dashboard.clickCreateDashboardPrompt();
        await PageObjects.dashboard.saveDashboard(dashboardName);

        await PageObjects.dashboard.gotoDashboardLandingPage();
        await listingTable.searchAndExpectItemsCount('dashboard', dashboardName, 1);
      });

      it('is not shown when there is a dashboard', async function () {
        const promptExists = await PageObjects.dashboard.getCreateDashboardPromptExists();
        expect(promptExists).to.be(false);
      });

      it('is not shown when there are no dashboards shown during a search', async function () {
        await listingTable.searchAndExpectItemsCount('dashboard', 'gobeldeguck', 0);

        const promptExists = await PageObjects.dashboard.getCreateDashboardPromptExists();
        expect(promptExists).to.be(false);
        await listingTable.clearSearchFilter();
      });
    });

    describe('delete', function () {
      it('default confirm action is cancel', async function () {
        await listingTable.searchForItemWithName(dashboardName);
        await listingTable.checkListingSelectAllCheckbox();
        await listingTable.clickDeleteSelected();

        await PageObjects.common.expectConfirmModalOpenState(true);

        await PageObjects.common.pressEnterKey();

        await PageObjects.common.expectConfirmModalOpenState(false);

        await listingTable.searchAndExpectItemsCount('dashboard', dashboardName, 1);
      });

      it('succeeds on confirmation press', async function () {
        await listingTable.checkListingSelectAllCheckbox();
        await listingTable.clickDeleteSelected();

        await PageObjects.common.clickConfirmOnModal();

        await listingTable.searchAndExpectItemsCount('dashboard', dashboardName, 0);
      });
    });

    describe('search', function () {
      before(async () => {
        await listingTable.clearSearchFilter();
        await PageObjects.dashboard.clickNewDashboard();
        await PageObjects.dashboard.saveDashboard('Two Words');
        await PageObjects.dashboard.gotoDashboardLandingPage();
      });

      it('matches on the first word', async function () {
        await listingTable.searchForItemWithName('Two');
        await listingTable.expectItemsCount('dashboard', 1);
      });

      it('matches the second word', async function () {
        await listingTable.searchForItemWithName('Words');
        await listingTable.expectItemsCount('dashboard', 1);
      });

      it('matches the second word prefix', async function () {
        await listingTable.searchForItemWithName('Wor');
        await listingTable.expectItemsCount('dashboard', 1);
      });

      it('does not match mid word', async function () {
        await listingTable.searchForItemWithName('ords');
        await listingTable.expectItemsCount('dashboard', 0);
      });

      it('is case insensitive', async function () {
        await listingTable.searchForItemWithName('two words');
        await listingTable.expectItemsCount('dashboard', 1);
      });

      it('is using AND operator', async function () {
        await listingTable.searchForItemWithName('three words');
        await listingTable.expectItemsCount('dashboard', 0);
      });
    });

    describe('search by title', function () {
      it('loads a dashboard if title matches', async function () {
        const currentUrl = await browser.getCurrentUrl();
        const newUrl = currentUrl + '&title=Two%20Words';
        // Only works on a hard refresh.
        const useTimeStamp = true;
        await browser.get(newUrl.toString(), useTimeStamp);

        await PageObjects.header.awaitKibanaChrome();
        await PageObjects.header.waitUntilLoadingHasFinished();
        const onDashboardLandingPage = await PageObjects.dashboard.onDashboardLandingPage();
        expect(onDashboardLandingPage).to.equal(false);
      });

      it('title match is case insensitive', async function () {
        await PageObjects.dashboard.gotoDashboardLandingPage();
        const currentUrl = await browser.getCurrentUrl();
        const newUrl = currentUrl + '&title=two%20words';
        // Only works on a hard refresh.
        const useTimeStamp = true;
        await browser.get(newUrl.toString(), useTimeStamp);

        await PageObjects.header.awaitKibanaChrome();
        await PageObjects.header.waitUntilLoadingHasFinished();
        const onDashboardLandingPage = await PageObjects.dashboard.onDashboardLandingPage();
        expect(onDashboardLandingPage).to.equal(false);
      });

      it('stays on listing page if title matches no dashboards', async function () {
        await PageObjects.dashboard.gotoDashboardLandingPage();
        const currentUrl = await browser.getCurrentUrl();
        const newUrl = currentUrl + '&title=nodashboardsnamedme';
        // Only works on a hard refresh.
        const useTimeStamp = true;
        await browser.get(newUrl.toString(), useTimeStamp);

        await PageObjects.header.awaitKibanaChrome();
        await PageObjects.header.waitUntilLoadingHasFinished();
        const onDashboardLandingPage = await PageObjects.dashboard.onDashboardLandingPage();
        expect(onDashboardLandingPage).to.equal(true);
      });

      it('preloads search filter bar when there is no match', async function () {
        const searchFilter = await listingTable.getSearchFilterValue();
        expect(searchFilter).to.equal('nodashboardsnamedme');
      });

      it('stays on listing page if title matches two dashboards', async function () {
        await PageObjects.dashboard.clickNewDashboard();
        await PageObjects.dashboard.saveDashboard('two words', {
          saveAsNew: true,
          needsConfirm: true,
        });
        await PageObjects.dashboard.gotoDashboardLandingPage();
        const currentUrl = await browser.getCurrentUrl();
        const newUrl = currentUrl + '&title=two%20words';
        // Only works on a hard refresh.
        const useTimeStamp = true;
        await browser.get(newUrl.toString(), useTimeStamp);

        await PageObjects.header.awaitKibanaChrome();
        await PageObjects.header.waitUntilLoadingHasFinished();
        const onDashboardLandingPage = await PageObjects.dashboard.onDashboardLandingPage();
        expect(onDashboardLandingPage).to.equal(true);
      });

      it('preloads search filter bar when there is more than one match', async function () {
        const searchFilter = await listingTable.getSearchFilterValue();
        expect(searchFilter).to.equal('two words');
      });

      it('matches a title with many special characters', async function () {
        await PageObjects.dashboard.clickNewDashboard();
        await PageObjects.dashboard.saveDashboard('i am !@#$%^&*()_+~`,.<>{}[]; so special');
        await PageObjects.dashboard.gotoDashboardLandingPage();
        const currentUrl = await browser.getCurrentUrl();
        // Need to encode that one.
        const newUrl =
          currentUrl +
          '&title=i%20am%20%21%40%23%24%25%5E%26%2A%28%29_%2B~%60%2C.%3C%3E%7B%7D%5B%5D%3B%20so%20special';
        // Only works on a hard refresh.
        const useTimeStamp = true;
        await browser.get(newUrl.toString(), useTimeStamp);

        await PageObjects.header.awaitKibanaChrome();
        await PageObjects.header.waitUntilLoadingHasFinished();
        const onDashboardLandingPage = await PageObjects.dashboard.onDashboardLandingPage();
        expect(onDashboardLandingPage).to.equal(false);
      });
    });

    describe('edit meta data', () => {
      it('saves changes to dashboard metadata', async () => {
        await PageObjects.dashboard.gotoDashboardLandingPage();
        await PageObjects.dashboard.clickCreateDashboardPrompt();
        await dashboardAddPanel.clickOpenAddPanel();
        await dashboardAddPanel.addEveryEmbeddableOnCurrentPage();
        await dashboardAddPanel.ensureAddPanelIsClosed();
        await PageObjects.dashboard.saveDashboard(`${dashboardName}-editMetaData`);
        const originalPanelCount = await PageObjects.dashboard.getPanelCount();

        await PageObjects.dashboard.gotoDashboardLandingPage();
        await listingTable.searchForItemWithName(`${dashboardName}-editMetaData`);
        await listingTable.inspectVisualization();
        await listingTable.editVisualizationDetails({
          title: 'new title',
          description: 'new description',
        });

        await listingTable.searchAndExpectItemsCount('dashboard', 'new title', 1);
        await listingTable.setSearchFilterValue('new description');
        await listingTable.expectItemsCount('dashboard', 1);
        await listingTable.clickItemLink('dashboard', 'new title');
        await PageObjects.dashboard.waitForRenderComplete();

        const newPanelCount = await PageObjects.dashboard.getPanelCount();
        expect(newPanelCount).to.equal(originalPanelCount);
      });
    });
  });
}
