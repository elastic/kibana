/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import expect from '@kbn/expect';

export default function ({ getService, getPageObjects }) {
  const dashboardExpect = getService('dashboardExpect');
  const dashboardAddPanel = getService('dashboardAddPanel');
  const testSubjects = getService('testSubjects');
  const filterBar = getService('filterBar');
  const pieChart = getService('pieChart');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const browser = getService('browser');
  const PageObjects = getPageObjects(['common', 'dashboard', 'header', 'visualize', 'timePicker']);

  // FLAKY: https://github.com/elastic/kibana/issues/71987
  describe.skip('dashboard filter bar', () => {
    before(async () => {
      await esArchiver.load('dashboard/current/kibana');
      await kibanaServer.uiSettings.replace({
        defaultIndex: '0bf35f60-3dc9-11e8-8660-4d65aa086b3c',
      });
      await PageObjects.common.navigateToApp('dashboard');
    });

    describe('Add a filter bar', function () {
      before(async () => {
        await PageObjects.dashboard.gotoDashboardLandingPage();
      });

      it('should show on an empty dashboard', async function () {
        await PageObjects.dashboard.clickNewDashboard();
        const hasAddFilter = await testSubjects.exists('addFilter');
        expect(hasAddFilter).to.be(true);
      });

      it('should continue to show for visualizations with no search source', async () => {
        await dashboardAddPanel.addVisualization('Rendering-Test:-input-control');
        const hasAddFilter = await testSubjects.exists('addFilter');
        expect(hasAddFilter).to.be(true);
      });
    });

    describe('filter editor field list', function () {
      this.tags(['skipFirefox']);

      before(async () => {
        await PageObjects.dashboard.gotoDashboardLandingPage();
        await PageObjects.dashboard.clickNewDashboard();
      });

      it('uses default index pattern on an empty dashboard', async () => {
        await testSubjects.click('addFilter');
        await dashboardExpect.fieldSuggestions(['bytes']);
      });

      it('shows index pattern of vis when one is added', async () => {
        await dashboardAddPanel.addVisualization('Rendering-Test:-animal-sounds-pie');
        await PageObjects.header.waitUntilLoadingHasFinished();
        await filterBar.ensureFieldEditorModalIsClosed();
        await testSubjects.click('addFilter');
        await dashboardExpect.fieldSuggestions(['animal']);
      });

      it('works when a vis with no index pattern is added', async () => {
        await dashboardAddPanel.addVisualization('Rendering-Test:-markdown');
        await PageObjects.header.waitUntilLoadingHasFinished();
        await filterBar.ensureFieldEditorModalIsClosed();
        await testSubjects.click('addFilter');
        await dashboardExpect.fieldSuggestions(['animal']);
      });
    });

    describe('filter pills', function () {
      before(async () => {
        await filterBar.ensureFieldEditorModalIsClosed();
        await PageObjects.dashboard.gotoDashboardLandingPage();
        await PageObjects.dashboard.clickNewDashboard();
        await PageObjects.timePicker.setDefaultDataRange();
      });

      it('are not selected by default', async function () {
        const filterCount = await filterBar.getFilterCount();
        expect(filterCount).to.equal(0);
      });

      it('are added when a pie chart slice is clicked', async function () {
        await dashboardAddPanel.addVisualization('Rendering Test: pie');
        await PageObjects.dashboard.waitForRenderComplete();
        await pieChart.filterOnPieSlice('4,886');
        const filterCount = await filterBar.getFilterCount();
        expect(filterCount).to.equal(1);

        await pieChart.expectPieSliceCount(1);
      });

      it('are preserved after saving a dashboard', async () => {
        await PageObjects.dashboard.saveDashboard('with filters');
        await PageObjects.header.waitUntilLoadingHasFinished();

        const filterCount = await filterBar.getFilterCount();
        expect(filterCount).to.equal(1);

        await pieChart.expectPieSliceCount(1);
      });

      it('are preserved after opening a dashboard saved with filters', async () => {
        await PageObjects.dashboard.gotoDashboardLandingPage();
        await PageObjects.dashboard.loadSavedDashboard('with filters');
        await PageObjects.header.waitUntilLoadingHasFinished();

        const filterCount = await filterBar.getFilterCount();
        expect(filterCount).to.equal(1);
        await pieChart.expectPieSliceCount(1);
      });

      it("restoring filters doesn't break back button", async () => {
        await browser.goBack();
        await PageObjects.dashboard.expectExistsDashboardLandingPage();
        await browser.goForward();
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.dashboard.waitForRenderComplete();
        await pieChart.expectPieSliceCount(1);
      });

      it("saving with pinned filter doesn't unpin them", async () => {
        const filterKey = 'bytes';
        await filterBar.toggleFilterPinned(filterKey);
        await PageObjects.dashboard.switchToEditMode();
        await PageObjects.dashboard.saveDashboard('saved with pinned filters', {
          saveAsNew: true,
        });
        expect(await filterBar.isFilterPinned(filterKey)).to.be(true);
        await pieChart.expectPieSliceCount(1);
      });

      it("navigating to a dashboard with global filter doesn't unpin it if same filter is saved with dashboard", async () => {
        await PageObjects.dashboard.preserveCrossAppState();
        await PageObjects.dashboard.gotoDashboardLandingPage();
        await PageObjects.dashboard.loadSavedDashboard('with filters');
        await PageObjects.header.waitUntilLoadingHasFinished();
        expect(await filterBar.isFilterPinned('bytes')).to.be(true);
        await pieChart.expectPieSliceCount(1);
      });

      it("pinned filters aren't saved", async () => {
        await filterBar.removeFilter('bytes');
        await PageObjects.dashboard.gotoDashboardLandingPage();
        await PageObjects.dashboard.loadSavedDashboard('saved with pinned filters');
        await PageObjects.header.waitUntilLoadingHasFinished();
        expect(await filterBar.getFilterCount()).to.be(0);
        await pieChart.expectPieSliceCount(5);
      });
    });

    describe('saved search filtering', function () {
      // https://github.com/elastic/kibana/issues/47286#issuecomment-644687577
      this.tags('skipCoverage');
      before(async () => {
        await filterBar.ensureFieldEditorModalIsClosed();
        await PageObjects.dashboard.gotoDashboardLandingPage();
        await PageObjects.dashboard.clickNewDashboard();
        await PageObjects.timePicker.setDefaultDataRange();
      });

      it('are added when a cell magnifying glass is clicked', async function () {
        await dashboardAddPanel.addSavedSearch('Rendering-Test:-saved-search');
        await PageObjects.dashboard.waitForRenderComplete();
        await testSubjects.click('docTableCellFilter');

        const filterCount = await filterBar.getFilterCount();
        expect(filterCount).to.equal(1);
      });
    });

    describe('bad filters are loaded properly', function () {
      before(async () => {
        await filterBar.ensureFieldEditorModalIsClosed();
        await PageObjects.dashboard.gotoDashboardLandingPage();
        await PageObjects.dashboard.loadSavedDashboard('dashboard with bad filters');
      });

      it('filter with non-existent index pattern renders in error mode', async function () {
        const hasBadFieldFilter = await filterBar.hasFilter('name', 'error', false);
        expect(hasBadFieldFilter).to.be(true);
      });

      it('filter with non-existent field renders in error mode', async function () {
        const hasBadFieldFilter = await filterBar.hasFilter('baad-field', 'error', false);
        expect(hasBadFieldFilter).to.be(true);
      });

      it('filter from unrelated index pattern is still applicable if field name is found', async function () {
        const hasUnrelatedIndexPatternFilterPhrase = await filterBar.hasFilter(
          '@timestamp',
          '123',
          true
        );
        expect(hasUnrelatedIndexPatternFilterPhrase).to.be(true);
      });

      it('filter from unrelated index pattern is rendred as a warning if field name is not found', async function () {
        const hasWarningFieldFilter = await filterBar.hasFilter('extension', 'warn', true);
        expect(hasWarningFieldFilter).to.be(true);
      });

      it('filter without an index pattern is rendred as a warning, if the dashboard has an index pattern', async function () {
        const noIndexPatternFilter = await filterBar.hasFilter('banana', 'warn', true);
        expect(noIndexPatternFilter).to.be(true);
      });
    });
  });
}
