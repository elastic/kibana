/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';

import { PIE_CHART_VIS_NAME } from '../../page_objects/dashboard_page';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const dashboardExpect = getService('dashboardExpect');
  const pieChart = getService('pieChart');
  const dashboardVisualizations = getService('dashboardVisualizations');
  const PageObjects = getPageObjects([
    'dashboard',
    'header',
    'visualize',
    'timePicker',
    'discover',
  ]);
  const browser = getService('browser');
  const log = getService('log');
  const kibanaServer = getService('kibanaServer');
  const dataGrid = getService('dataGrid');

  describe('dashboard time picker', function describeIndexTests() {
    before(async function () {
      await PageObjects.dashboard.initTests();
      await PageObjects.dashboard.preserveCrossAppState();
    });

    after(async () => {
      await kibanaServer.uiSettings.replace({});
      await browser.refresh();
      const alert = await browser.getAlert();
      await alert?.accept();
    });

    it('Visualization updated when time picker changes', async () => {
      await PageObjects.dashboard.clickNewDashboard();
      await PageObjects.dashboard.addVisualizations([PIE_CHART_VIS_NAME]);
      await pieChart.expectPieSliceCount(0);

      await PageObjects.timePicker.setHistoricalDataRange();
      await pieChart.expectPieSliceCount(10);
    });

    it('Saved search updated when time picker changes', async () => {
      await PageObjects.dashboard.gotoDashboardLandingPage();
      await PageObjects.dashboard.clickNewDashboard();
      await dashboardVisualizations.createAndAddSavedSearch({
        name: 'saved search',
        fields: ['bytes', 'agent'],
      });

      const isLegacyDefault = await PageObjects.discover.useLegacyTable();
      if (isLegacyDefault) {
        await dashboardExpect.docTableFieldCount(150);

        // Set to time range with no data
        await PageObjects.timePicker.setAbsoluteRange(
          'Jan 1, 2000 @ 00:00:00.000',
          'Jan 1, 2000 @ 01:00:00.000'
        );
        await dashboardExpect.docTableFieldCount(0);
      } else {
        const docCount = await dataGrid.getDocCount();
        expect(docCount).to.above(10);

        // Set to time range with no data
        await PageObjects.timePicker.setAbsoluteRange(
          'Jan 1, 2000 @ 00:00:00.000',
          'Jan 1, 2000 @ 01:00:00.000'
        );
        const noResults = await dataGrid.hasNoResults();
        expect(noResults).to.be.ok();
      }
    });

    it('Timepicker start, end, interval values are set by url', async () => {
      await PageObjects.dashboard.gotoDashboardLandingPage();
      log.debug('Went to landing page');
      await PageObjects.dashboard.clickNewDashboard();
      log.debug('Clicked new dashboard');
      await dashboardVisualizations.createAndAddSavedSearch({
        name: 'saved search',
        fields: ['bytes', 'agent'],
      });
      log.debug('added saved search');
      const currentUrl = await browser.getCurrentUrl();
      const kibanaBaseUrl = currentUrl.substring(0, currentUrl.indexOf('#'));
      const urlQuery =
        `/create?` +
        `_g=(refreshInterval:(pause:!t,value:2000),` +
        `time:(from:'2012-11-17T00:00:00.000Z',mode:absolute,to:'2015-11-17T18:01:36.621Z'))&` +
        `_a=(description:'',filters:!()` +
        `)`;
      log.debug('go to url' + `${kibanaBaseUrl}#${urlQuery}`);
      await browser.get(`${kibanaBaseUrl}#${urlQuery}`, true);
      const alert = await browser.getAlert();
      await alert?.accept();
      await PageObjects.header.waitUntilLoadingHasFinished();
      const time = await PageObjects.timePicker.getTimeConfig();
      const refresh = await PageObjects.timePicker.getRefreshConfig();
      expect(time.start).to.be('Nov 17, 2012 @ 00:00:00.000');
      expect(time.end).to.be('Nov 17, 2015 @ 18:01:36.621');
      expect(refresh.interval).to.be('2');
    });

    it('Timepicker respects dateFormat from UI settings', async () => {
      await kibanaServer.uiSettings.replace({ dateFormat: 'YYYY-MM-DD HH:mm:ss.SSS' });
      await browser.refresh();
      const alert = await browser.getAlert();
      await alert?.accept();
      await PageObjects.dashboard.gotoDashboardLandingPage();
      await PageObjects.dashboard.clickNewDashboard();
      await PageObjects.dashboard.addVisualizations([PIE_CHART_VIS_NAME]);
      // Same date range as `timePicker.setHistoricalDataRange()`
      await PageObjects.timePicker.setAbsoluteRange(
        '2015-09-19 06:31:44.000',
        '2015-09-23 18:31:44.000'
      );
      await pieChart.expectPieSliceCount(10);
    });
  });
}
