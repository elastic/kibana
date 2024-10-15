/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const queryBar = getService('queryBar');
  const kibanaServer = getService('kibanaServer');
  const dashboardAddPanel = getService('dashboardAddPanel');
  const PageObjects = getPageObjects(['dashboard', 'header', 'common', 'visualize', 'timePicker']);
  const dashboardName = 'dashboard with filter';
  const filterBar = getService('filterBar');
  const security = getService('security');

  describe('dashboard view edit mode', function viewEditModeTests() {
    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.importExport.load(
        'test/functional/fixtures/kbn_archiver/dashboard/current/kibana'
      );
      await security.testUser.setRoles(['kibana_admin', 'test_logstash_reader', 'animals']);
      await kibanaServer.uiSettings.replace({
        defaultIndex: '0bf35f60-3dc9-11e8-8660-4d65aa086b3c',
      });
      await PageObjects.common.navigateToApp('dashboard');
      await PageObjects.dashboard.preserveCrossAppState();
    });

    after(async () => {
      await security.testUser.restoreDefaults();
      await kibanaServer.savedObjects.cleanStandardList();
    });

    it('create new dashboard opens in edit mode', async function () {
      await PageObjects.dashboard.gotoDashboardLandingPage();
      await PageObjects.dashboard.clickNewDashboard();
      const isInViewMode = await PageObjects.dashboard.getIsInViewMode();
      expect(isInViewMode).to.be(false);
    });

    it('existing dashboard opens in view mode', async function () {
      await PageObjects.dashboard.gotoDashboardLandingPage();
      await PageObjects.dashboard.loadSavedDashboard(dashboardName);
      const inViewMode = await PageObjects.dashboard.getIsInViewMode();

      expect(inViewMode).to.equal(true);
    });

    describe('save', function () {
      it('auto exits out of edit mode', async function () {
        await PageObjects.dashboard.gotoDashboardEditMode(dashboardName);
        await PageObjects.dashboard.saveDashboard(dashboardName);
        const isViewMode = await PageObjects.dashboard.getIsInViewMode();
        expect(isViewMode).to.equal(true);
      });
    });

    describe('shows lose changes warning', function () {
      describe('and loses changes on confirmation', function () {
        beforeEach(async function () {
          await PageObjects.dashboard.gotoDashboardEditMode(dashboardName);
        });

        it('when time changed is stored with dashboard', async function () {
          await PageObjects.timePicker.setDefaultDataRange();

          const originalTime = await PageObjects.timePicker.getTimeConfig();

          await PageObjects.dashboard.saveDashboard(dashboardName, {
            storeTimeWithDashboard: true,
          });

          await PageObjects.timePicker.setAbsoluteRange(
            'Sep 19, 2013 @ 06:31:44.000',
            'Sep 19, 2013 @ 06:31:44.000'
          );
          await PageObjects.dashboard.clickCancelOutOfEditMode();

          const newTime = await PageObjects.timePicker.getTimeConfig();

          expect(newTime.start).to.equal(originalTime.start);
          expect(newTime.end).to.equal(originalTime.end);
        });

        it('when the query is edited and applied', async function () {
          const originalQuery = await queryBar.getQueryString();
          await queryBar.setQuery(`${originalQuery}and extra stuff`);
          await queryBar.submitQuery();

          await PageObjects.dashboard.clickCancelOutOfEditMode();

          const query = await queryBar.getQueryString();
          expect(query).to.equal(originalQuery);
        });

        it('when a filter is deleted', async function () {
          // This may seem like a pointless line but there was a bug that only arose when the dashboard
          // was loaded initially
          await PageObjects.dashboard.loadSavedDashboard(dashboardName);
          await PageObjects.dashboard.switchToEditMode();

          let hasFilter = await filterBar.hasFilter('animal', 'dog');
          expect(hasFilter).to.be(true);

          await filterBar.removeFilter('animal');

          hasFilter = await filterBar.hasFilter('animal', 'dog');
          expect(hasFilter).to.be(false);

          await PageObjects.dashboard.clickCancelOutOfEditMode();

          hasFilter = await filterBar.hasFilter('animal', 'dog');
          expect(hasFilter).to.be(true);
        });

        it('when a new vis is added', async function () {
          const originalPanelCount = await PageObjects.dashboard.getPanelCount();
          await dashboardAddPanel.clickEditorMenuButton();
          await dashboardAddPanel.clickAggBasedVisualizations();
          await PageObjects.visualize.clickAreaChart();
          await PageObjects.visualize.clickNewSearch();
          await PageObjects.visualize.saveVisualizationExpectSuccess('new viz panel', {
            saveAsNew: false,
            redirectToOrigin: true,
          });

          await PageObjects.dashboard.clickCancelOutOfEditMode(false);
          // for this sleep see https://github.com/elastic/kibana/issues/22299
          await PageObjects.common.sleep(500);

          // confirm lose changes
          await PageObjects.common.clickConfirmOnModal();

          const panelCount = await PageObjects.dashboard.getPanelCount();
          expect(panelCount).to.eql(originalPanelCount);
        });

        it('when an existing vis is added', async function () {
          const originalPanelCount = await PageObjects.dashboard.getPanelCount();

          await dashboardAddPanel.addVisualization('new viz panel');
          await PageObjects.dashboard.clickCancelOutOfEditMode();

          const panelCount = await PageObjects.dashboard.getPanelCount();
          expect(panelCount).to.eql(originalPanelCount);
        });
      });

      describe('and preserves edits on cancel', function () {
        it('when time changed is stored with dashboard', async function () {
          await PageObjects.dashboard.gotoDashboardEditMode(dashboardName);
          await PageObjects.timePicker.setAbsoluteRange(
            'Sep 19, 2013 @ 06:31:44.000',
            'Sep 19, 2013 @ 06:31:44.000'
          );
          await PageObjects.dashboard.saveDashboard(dashboardName);
          await PageObjects.dashboard.switchToEditMode();
          await PageObjects.timePicker.setAbsoluteRange(
            'Sep 19, 2015 @ 06:31:44.000',
            'Sep 19, 2015 @ 06:31:44.000'
          );
          await PageObjects.dashboard.clickCancelOutOfEditMode(false);

          await PageObjects.common.clickCancelOnModal();
          await PageObjects.dashboard.saveDashboard(dashboardName, {
            storeTimeWithDashboard: true,
          });

          await PageObjects.dashboard.loadSavedDashboard(dashboardName);

          const time = await PageObjects.timePicker.getTimeConfig();

          expect(time.start).to.equal('Sep 19, 2015 @ 06:31:44.000');
          expect(time.end).to.equal('Sep 19, 2015 @ 06:31:44.000');
        });
      });
    });

    describe('and preserves edits on cancel', function () {
      it('when time changed is stored with dashboard', async function () {
        await PageObjects.dashboard.gotoDashboardEditMode(dashboardName);
        await PageObjects.timePicker.setDefaultDataRange();
        await PageObjects.dashboard.saveDashboard(dashboardName);
        await PageObjects.dashboard.switchToEditMode();
        await PageObjects.timePicker.setAbsoluteRange(
          'Sep 19, 2013 @ 06:31:44.000',
          'Sep 19, 2013 @ 06:31:44.000'
        );
        const newTime = await PageObjects.timePicker.getTimeConfig();

        await PageObjects.dashboard.clickCancelOutOfEditMode(false);

        await PageObjects.common.clickCancelOnModal();
        await PageObjects.dashboard.saveDashboard(dashboardName, { storeTimeWithDashboard: true });

        await PageObjects.dashboard.loadSavedDashboard(dashboardName);

        const time = await PageObjects.timePicker.getTimeConfig();

        expect(time.start).to.equal(newTime.start);
        expect(time.end).to.equal(newTime.end);
      });
    });

    describe('Does not show lose changes warning', function () {
      it('when time changed is not stored with dashboard', async function () {
        await PageObjects.dashboard.gotoDashboardEditMode(dashboardName);
        await PageObjects.dashboard.saveDashboard(dashboardName, { storeTimeWithDashboard: false });
        await PageObjects.timePicker.setAbsoluteRange(
          'Oct 19, 2014 @ 06:31:44.000',
          'Dec 19, 2014 @ 06:31:44.000'
        );
        await PageObjects.dashboard.clickCancelOutOfEditMode(false);

        await PageObjects.common.expectConfirmModalOpenState(false);
      });

      // See https://github.com/elastic/kibana/issues/10110 - this is intentional.
      it('when the query is edited but not applied', async function () {
        await PageObjects.dashboard.gotoDashboardEditMode(dashboardName);

        const originalQuery = await queryBar.getQueryString();
        await queryBar.setQuery(`${originalQuery}extra stuff`);

        await PageObjects.dashboard.clickCancelOutOfEditMode(false);

        await PageObjects.common.expectConfirmModalOpenState(false);

        await PageObjects.dashboard.loadSavedDashboard(dashboardName);
        const query = await queryBar.getQueryString();
        expect(query).to.equal(originalQuery);
      });
    });
  });
}
