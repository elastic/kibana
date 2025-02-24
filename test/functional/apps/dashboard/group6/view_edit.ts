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
  const queryBar = getService('queryBar');
  const kibanaServer = getService('kibanaServer');
  const dashboardAddPanel = getService('dashboardAddPanel');
  const { dashboard, common, timePicker } = getPageObjects(['dashboard', 'common', 'timePicker']);
  const dashboardName = 'dashboard with filter';
  const copyOfDashboardName = `Copy of ${dashboardName}`;
  const filterBar = getService('filterBar');
  const security = getService('security');

  // Failing: See https://github.com/elastic/kibana/issues/200748
  describe.skip('dashboard view edit mode', function viewEditModeTests() {
    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.importExport.load(
        'test/functional/fixtures/kbn_archiver/dashboard/current/kibana'
      );
      await security.testUser.setRoles(['kibana_admin', 'test_logstash_reader', 'animals']);
      await kibanaServer.uiSettings.replace({
        defaultIndex: '0bf35f60-3dc9-11e8-8660-4d65aa086b3c',
      });
      await dashboard.navigateToApp();
      await dashboard.preserveCrossAppState();
    });

    after(async () => {
      await security.testUser.restoreDefaults();
      await kibanaServer.savedObjects.cleanStandardList();
    });

    it('existing dashboard opens in last used view mode', async function () {
      await dashboard.gotoDashboardLandingPage();
      await dashboard.loadSavedDashboard(dashboardName);
      expect(await dashboard.getIsInViewMode()).to.equal(true);

      await dashboard.switchToEditMode();

      await dashboard.gotoDashboardLandingPage();
      await dashboard.loadSavedDashboard(dashboardName);
      expect(await dashboard.getIsInViewMode()).to.equal(false);

      await dashboard.gotoDashboardLandingPage();
      await dashboard.loadSavedDashboard('few panels');
      expect(await dashboard.getIsInViewMode()).to.equal(false);

      await dashboard.clickCancelOutOfEditMode();
    });

    it('create new dashboard opens in edit mode', async function () {
      await dashboard.gotoDashboardLandingPage();
      await dashboard.clickNewDashboard();
      const isInViewMode = await dashboard.getIsInViewMode();
      expect(isInViewMode).to.be(false);
    });

    describe('save as new', () => {
      it('keeps duplicated dashboard in edit mode', async () => {
        await dashboard.gotoDashboardEditMode(dashboardName);
        await dashboard.duplicateDashboard(copyOfDashboardName);
        const isViewMode = await dashboard.getIsInViewMode();
        expect(isViewMode).to.equal(false);
      });
    });

    describe('save', function () {
      it('keeps dashboard in edit mode', async function () {
        await dashboard.gotoDashboardEditMode(copyOfDashboardName);
        // change dashboard time to cause unsaved change
        await timePicker.setAbsoluteRange(
          'Sep 19, 2013 @ 00:00:00.000',
          'Sep 19, 2013 @ 07:00:00.000'
        );
        await dashboard.saveDashboard(copyOfDashboardName, {
          storeTimeWithDashboard: true,
          saveAsNew: false,
        });
        const isViewMode = await dashboard.getIsInViewMode();
        expect(isViewMode).to.equal(false);
      });
    });

    describe('shows lose changes warning', function () {
      describe('and loses changes on confirmation', function () {
        beforeEach(async function () {
          await dashboard.gotoDashboardEditMode(dashboardName);
        });

        it('when time changed is stored with dashboard', async function () {
          await timePicker.setDefaultDataRange();

          const originalTime = await timePicker.getTimeConfig();

          await dashboard.saveDashboard(dashboardName, {
            storeTimeWithDashboard: true,
            saveAsNew: false,
          });

          await timePicker.setAbsoluteRange(
            'Sep 19, 2013 @ 06:31:44.000',
            'Sep 19, 2013 @ 06:31:44.000'
          );
          await dashboard.clickCancelOutOfEditMode();

          const newTime = await timePicker.getTimeConfig();

          expect(newTime.start).to.equal(originalTime.start);
          expect(newTime.end).to.equal(originalTime.end);
        });

        it('when the query is edited and applied', async function () {
          const originalQuery = await queryBar.getQueryString();
          await queryBar.setQuery(`${originalQuery}and extra stuff`);
          await queryBar.submitQuery();

          await dashboard.clickCancelOutOfEditMode();

          const query = await queryBar.getQueryString();
          expect(query).to.equal(originalQuery);
        });

        it('when a filter is deleted', async function () {
          // This may seem like a pointless line but there was a bug that only arose when the dashboard
          // was loaded initially
          await dashboard.loadSavedDashboard(dashboardName);
          await dashboard.switchToEditMode();

          let hasFilter = await filterBar.hasFilter('animal', 'dog');
          expect(hasFilter).to.be(true);

          await filterBar.removeFilter('animal');

          hasFilter = await filterBar.hasFilter('animal', 'dog');
          expect(hasFilter).to.be(false);

          await dashboard.clickCancelOutOfEditMode();

          hasFilter = await filterBar.hasFilter('animal', 'dog');
          expect(hasFilter).to.be(true);
        });

        it('when a panel is added', async function () {
          const originalPanelCount = await dashboard.getPanelCount();

          await dashboardAddPanel.addVisualization('new viz panel');
          await dashboard.clickCancelOutOfEditMode();

          const panelCount = await dashboard.getPanelCount();
          expect(panelCount).to.eql(originalPanelCount);
        });
      });

      describe('and preserves edits on cancel', function () {
        it('when time changed is stored with dashboard', async function () {
          await dashboard.gotoDashboardEditMode(dashboardName);
          await timePicker.setAbsoluteRange(
            'Sep 19, 2013 @ 06:31:44.000',
            'Sep 19, 2013 @ 06:31:44.000'
          );
          await dashboard.saveDashboard(dashboardName, { saveAsNew: false });
          await dashboard.switchToEditMode();
          await timePicker.setAbsoluteRange(
            'Sep 19, 2015 @ 06:31:44.000',
            'Sep 19, 2015 @ 06:31:44.000'
          );
          await dashboard.clickCancelOutOfEditMode(false);

          await common.clickCancelOnModal();
          await dashboard.saveDashboard(dashboardName, {
            saveAsNew: false,
            storeTimeWithDashboard: true,
          });

          await dashboard.loadSavedDashboard(dashboardName);

          const time = await timePicker.getTimeConfig();

          expect(time.start).to.equal('Sep 19, 2015 @ 06:31:44.000');
          expect(time.end).to.equal('Sep 19, 2015 @ 06:31:44.000');
        });
      });
    });

    describe('and preserves edits on cancel', function () {
      it('when time changed is stored with dashboard', async function () {
        await dashboard.gotoDashboardEditMode(dashboardName);
        await timePicker.setDefaultDataRange();
        await dashboard.saveDashboard(dashboardName, { saveAsNew: false });
        await timePicker.setAbsoluteRange(
          'Sep 19, 2013 @ 06:31:44.000',
          'Sep 19, 2013 @ 06:31:44.000'
        );
        const newTime = await timePicker.getTimeConfig();

        await dashboard.clickCancelOutOfEditMode(false);

        await common.clickCancelOnModal();
        await dashboard.saveDashboard(dashboardName, {
          storeTimeWithDashboard: true,
          saveAsNew: false,
        });

        await dashboard.loadSavedDashboard(dashboardName);

        const time = await timePicker.getTimeConfig();

        expect(time.start).to.equal(newTime.start);
        expect(time.end).to.equal(newTime.end);
      });
    });

    describe('Does not show lose changes warning', function () {
      it('when time changed is not stored with dashboard', async function () {
        await dashboard.gotoDashboardEditMode(dashboardName);
        await dashboard.saveDashboard(dashboardName, {
          storeTimeWithDashboard: false,
          saveAsNew: false,
        });
        await timePicker.setAbsoluteRange(
          'Oct 19, 2014 @ 06:31:44.000',
          'Dec 19, 2014 @ 06:31:44.000'
        );
        await dashboard.clickCancelOutOfEditMode(false);

        await common.expectConfirmModalOpenState(false);
      });

      // See https://github.com/elastic/kibana/issues/10110 - this is intentional.
      it('when the query is edited but not applied', async function () {
        await dashboard.gotoDashboardEditMode(dashboardName);

        const originalQuery = await queryBar.getQueryString();
        await queryBar.setQuery(`${originalQuery}extra stuff`);

        await dashboard.clickCancelOutOfEditMode(false);

        await common.expectConfirmModalOpenState(false);

        await dashboard.loadSavedDashboard(dashboardName);
        const query = await queryBar.getQueryString();
        expect(query).to.equal(originalQuery);
      });
    });
  });
}
