/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const dataGrid = getService('dataGrid');
  const dashboardExpect = getService('dashboardExpect');
  const dashboardAddPanel = getService('dashboardAddPanel');
  const testSubjects = getService('testSubjects');
  const filterBar = getService('filterBar');
  const pieChart = getService('pieChart');
  const elasticChart = getService('elasticChart');
  const kibanaServer = getService('kibanaServer');
  const browser = getService('browser');
  const queryBar = getService('queryBar');
  const security = getService('security');
  const { dashboard, discover, header, timePicker } = getPageObjects([
    'dashboard',
    'discover',
    'header',
    'timePicker',
  ]);

  describe('dashboard filter bar', () => {
    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.importExport.load(
        'test/functional/fixtures/kbn_archiver/dashboard/current/kibana'
      );
      // The kbn_archiver above was created from an es_archiver which intentionally had
      // 2 missing index patterns.  But that would fail to load with kbn_archiver.
      // So we unload those 2 index patterns here.
      await kibanaServer.importExport.unload(
        'test/functional/fixtures/kbn_archiver/dashboard/current/kibana_unload'
      );
      await security.testUser.setRoles(['kibana_admin', 'test_logstash_reader', 'animals']);
      await kibanaServer.uiSettings.replace({
        defaultIndex: '0bf35f60-3dc9-11e8-8660-4d65aa086b3c',
      });
      await dashboard.navigateToApp();
    });

    after(async () => {
      await security.testUser.restoreDefaults();
      await kibanaServer.savedObjects.cleanStandardList();
    });

    describe('Add a filter bar', function () {
      before(async () => {
        await dashboard.gotoDashboardLandingPage();
      });

      it('should show on an empty dashboard', async function () {
        await dashboard.clickNewDashboard();
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
        await dashboard.gotoDashboardLandingPage();
        await dashboard.clickNewDashboard();
      });

      it('uses default index pattern on an empty dashboard', async () => {
        await testSubjects.click('addFilter');
        await dashboardExpect.fieldSuggestions(['agent']);
        await filterBar.ensureFieldEditorModalIsClosed();
      });

      it('shows index pattern of vis when one is added', async () => {
        await dashboardAddPanel.addVisualization('Rendering-Test:-animal-sounds-pie');
        await header.waitUntilLoadingHasFinished();
        await filterBar.ensureFieldEditorModalIsClosed();
        await testSubjects.click('addFilter');
        await dashboardExpect.fieldSuggestions(['animal']);
        await filterBar.ensureFieldEditorModalIsClosed();
      });

      it('works when a vis with no index pattern is added', async () => {
        await dashboardAddPanel.addVisualization('Rendering-Test:-markdown');
        await header.waitUntilLoadingHasFinished();
        await filterBar.ensureFieldEditorModalIsClosed();
        await testSubjects.click('addFilter');
        await dashboardExpect.fieldSuggestions(['animal']);
      });
    });

    describe('filter pills', function () {
      before(async () => {
        await filterBar.ensureFieldEditorModalIsClosed();
        await dashboard.gotoDashboardLandingPage();
        await dashboard.clickNewDashboard();
        await timePicker.setDefaultDataRange();
        await elasticChart.setNewChartUiDebugFlag(true);
      });

      it('are not selected by default', async function () {
        const filterCount = await filterBar.getFilterCount();
        expect(filterCount).to.equal(0);
      });

      it('are added when a pie chart slice is clicked', async function () {
        await dashboardAddPanel.addVisualization('Rendering Test: pie');
        await dashboard.waitForRenderComplete();
        await pieChart.filterOnPieSlice('4886');
        const filterCount = await filterBar.getFilterCount();
        expect(filterCount).to.equal(1);

        await pieChart.expectPieSliceCount(1);
      });

      it('are preserved after saving a dashboard', async () => {
        await dashboard.saveDashboard('with filters');
        await header.waitUntilLoadingHasFinished();
        await elasticChart.setNewChartUiDebugFlag(true);

        const filterCount = await filterBar.getFilterCount();
        expect(filterCount).to.equal(1);

        await pieChart.expectPieSliceCount(1);
      });

      it('are preserved after opening a dashboard saved with filters', async () => {
        await dashboard.gotoDashboardLandingPage();
        await dashboard.loadSavedDashboard('with filters');
        await header.waitUntilLoadingHasFinished();
        await elasticChart.setNewChartUiDebugFlag(true);
        await queryBar.submitQuery();

        const filterCount = await filterBar.getFilterCount();
        expect(filterCount).to.equal(1);
        await pieChart.expectPieSliceCount(1);
      });

      it("restoring filters doesn't break back button", async () => {
        await browser.goBack();
        await dashboard.expectExistsDashboardLandingPage();
        await browser.goForward();
        await header.waitUntilLoadingHasFinished();
        await dashboard.waitForRenderComplete();
        await elasticChart.setNewChartUiDebugFlag(true);
        await queryBar.submitQuery();
        await pieChart.expectPieSliceCount(1);
      });

      it("saving with pinned filter doesn't unpin them", async () => {
        const filterKey = 'bytes';
        await filterBar.toggleFilterPinned(filterKey);
        await dashboard.switchToEditMode();
        await dashboard.saveDashboard('saved with pinned filters');
        expect(await filterBar.isFilterPinned(filterKey)).to.be(true);
        await pieChart.expectPieSliceCount(1);
      });

      it("navigating to a dashboard with global filter doesn't unpin it if same filter is saved with dashboard", async () => {
        await dashboard.preserveCrossAppState();
        await dashboard.gotoDashboardLandingPage();
        await dashboard.loadSavedDashboard('with filters');
        await header.waitUntilLoadingHasFinished();
        expect(await filterBar.isFilterPinned('bytes')).to.be(true);
        await pieChart.expectPieSliceCount(1);
      });

      it("pinned filters aren't saved", async () => {
        await filterBar.removeFilter('bytes');
        await dashboard.gotoDashboardLandingPage();
        await dashboard.loadSavedDashboard('saved with pinned filters');
        await header.waitUntilLoadingHasFinished();
        expect(await filterBar.getFilterCount()).to.be(0);
        await pieChart.expectPieSliceCount(5);
      });
    });

    describe('saved search filtering', function () {
      before(async () => {
        await filterBar.ensureFieldEditorModalIsClosed();
        await dashboard.gotoDashboardLandingPage();
        await dashboard.clickNewDashboard();
        await timePicker.setDefaultDataRange();
      });

      it('are added when a cell magnifying glass is clicked', async function () {
        await dashboardAddPanel.addSavedSearch('Rendering-Test:-saved-search');
        await dashboard.waitForRenderComplete();
        const isLegacyDefault = await discover.useLegacyTable();
        if (isLegacyDefault) {
          await testSubjects.click('docTableCellFilter');
        } else {
          await dataGrid.clickCellFilterForButtonExcludingControlColumns(1, 1);
        }
        const filterCount = await filterBar.getFilterCount();
        expect(filterCount).to.equal(1);
      });
    });

    describe('bad filters are loaded properly', function () {
      before(async () => {
        await filterBar.ensureFieldEditorModalIsClosed();
        await dashboard.gotoDashboardLandingPage();
        await dashboard.loadSavedDashboard('dashboard with bad filters');
      });

      it('filter with non-existent index pattern renders if it matches a field', async function () {
        const hasBadFieldFilter = await filterBar.hasFilter('name', 'moo', false);
        expect(hasBadFieldFilter).to.be(true);
      });

      it('filter with non-existent field renders in warning mode', async function () {
        const hasBadFieldFilter = await filterBar.hasFilter('baad-field', 'warn', false);
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
