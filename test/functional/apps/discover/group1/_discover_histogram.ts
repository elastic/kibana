/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { TimeStrings } from '../../../page_objects/common_page';
import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const elasticChart = getService('elasticChart');
  const kibanaServer = getService('kibanaServer');
  const security = getService('security');
  const PageObjects = getPageObjects(['settings', 'common', 'discover', 'header', 'timePicker']);
  const defaultSettings = {
    defaultIndex: 'long-window-logstash-*',
    'dateFormat:tz': 'Europe/Berlin',
  };
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');
  const retry = getService('retry');
  const log = getService('log');
  const queryBar = getService('queryBar');

  describe('discover histogram', function describeIndexTests() {
    before(async () => {
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
      await esArchiver.load('test/functional/fixtures/es_archiver/long_window_logstash');
      await kibanaServer.importExport.load(
        'test/functional/fixtures/kbn_archiver/long_window_logstash_index_pattern'
      );
      await security.testUser.setRoles(['kibana_admin', 'long_window_logstash']);
      await kibanaServer.uiSettings.replace(defaultSettings);
      await PageObjects.common.navigateToApp('discover');
    });
    after(async () => {
      await esArchiver.unload('test/functional/fixtures/es_archiver/long_window_logstash');
      await kibanaServer.savedObjects.cleanStandardList();
      await security.testUser.restoreDefaults();
      await PageObjects.common.unsetTime();
    });

    async function prepareTest(time: TimeStrings, interval?: string) {
      await PageObjects.common.setTime(time);
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.discover.waitUntilSearchingHasFinished();
      if (interval) {
        await PageObjects.discover.setChartInterval(interval);
        await PageObjects.header.waitUntilLoadingHasFinished();
      }
    }

    it('should modify the time range when the histogram is brushed', async function () {
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.discover.waitUntilSearchingHasFinished();
      await PageObjects.timePicker.setDefaultAbsoluteRange();
      await PageObjects.discover.waitUntilSearchingHasFinished();
      // this is the number of renderings of the histogram needed when new data is fetched
      let renderingCountInc = 1;
      const prevRenderingCount = await elasticChart.getVisualizationRenderingCount();
      await PageObjects.timePicker.setDefaultAbsoluteRange();
      await PageObjects.discover.waitUntilSearchingHasFinished();
      await retry.waitFor('chart rendering complete', async () => {
        const actualCount = await elasticChart.getVisualizationRenderingCount();
        const expectedCount = prevRenderingCount + renderingCountInc;
        log.debug(`renderings before brushing - actual: ${actualCount} expected: ${expectedCount}`);
        return actualCount === expectedCount;
      });
      let prevRowData = '';
      // to make sure the table is already rendered
      await retry.try(async () => {
        prevRowData = await PageObjects.discover.getDocTableField(1);
        log.debug(`The first timestamp value in doc table before brushing: ${prevRowData}`);
      });

      await PageObjects.discover.brushHistogram();
      await PageObjects.discover.waitUntilSearchingHasFinished();
      renderingCountInc = 2;
      await retry.waitFor('chart rendering complete after being brushed', async () => {
        const actualCount = await elasticChart.getVisualizationRenderingCount();
        const expectedCount = prevRenderingCount + renderingCountInc * 2;
        log.debug(`renderings after brushing - actual: ${actualCount} expected: ${expectedCount}`);
        return actualCount <= expectedCount;
      });
      const newDurationHours = await PageObjects.timePicker.getTimeDurationInHours();
      expect(Math.round(newDurationHours)).to.be(26);

      await retry.waitFor('doc table containing the documents of the brushed range', async () => {
        const rowData = await PageObjects.discover.getDocTableField(1);
        log.debug(`The first timestamp value in doc table after brushing: ${rowData}`);
        return prevRowData !== rowData;
      });
    });

    it('should update the histogram timerange when the query is resubmitted', async function () {
      await kibanaServer.uiSettings.update({
        'timepicker:timeDefaults': '{  "from": "2015-09-18T19:37:13.000Z",  "to": "now"}',
      });
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.header.awaitKibanaChrome();
      const initialTimeString = await PageObjects.discover.getChartTimespan();
      await queryBar.clickQuerySubmitButton();
      await PageObjects.discover.waitUntilSearchingHasFinished();

      await retry.waitFor('chart timespan to have changed', async () => {
        const refreshedTimeString = await PageObjects.discover.getChartTimespan();
        await queryBar.clickQuerySubmitButton();
        await PageObjects.discover.waitUntilSearchingHasFinished();
        log.debug(
          `Timestamp before: ${initialTimeString}, Timestamp after: ${refreshedTimeString}`
        );
        return refreshedTimeString !== initialTimeString;
      });
    });

    it('should visualize monthly data with different day intervals', async () => {
      const from = 'Nov 1, 2017 @ 00:00:00.000';
      const to = 'Mar 21, 2018 @ 00:00:00.000';
      await prepareTest({ from, to }, 'Month');
      const chartCanvasExist = await elasticChart.canvasExists();
      expect(chartCanvasExist).to.be(true);
    });
    it('should visualize weekly data with within DST changes', async () => {
      const from = 'Mar 1, 2018 @ 00:00:00.000';
      const to = 'May 1, 2018 @ 00:00:00.000';
      await prepareTest({ from, to }, 'Week');
      const chartCanvasExist = await elasticChart.canvasExists();
      expect(chartCanvasExist).to.be(true);
    });
    it('should visualize monthly data with different years scaled to 30 days', async () => {
      const from = 'Jan 1, 2010 @ 00:00:00.000';
      const to = 'Mar 21, 2019 @ 00:00:00.000';
      await prepareTest({ from, to }, 'Day');
      const chartCanvasExist = await elasticChart.canvasExists();
      expect(chartCanvasExist).to.be(true);
      const chartIntervalIconTip = await PageObjects.discover.getChartIntervalWarningIcon();
      expect(chartIntervalIconTip).to.be(true);
    });
    it('should allow hide/show histogram, persisted in url state', async () => {
      const from = 'Jan 1, 2010 @ 00:00:00.000';
      const to = 'Mar 21, 2019 @ 00:00:00.000';
      await prepareTest({ from, to });
      let canvasExists = await elasticChart.canvasExists();
      expect(canvasExists).to.be(true);
      await testSubjects.click('unifiedHistogramChartOptionsToggle');
      await testSubjects.click('unifiedHistogramChartToggle');
      await retry.try(async () => {
        canvasExists = await elasticChart.canvasExists();
        expect(canvasExists).to.be(false);
      });
      // histogram is hidden, when reloading the page it should remain hidden
      await browser.refresh();
      canvasExists = await elasticChart.canvasExists();
      expect(canvasExists).to.be(false);
      await testSubjects.click('unifiedHistogramChartOptionsToggle');
      await testSubjects.click('unifiedHistogramChartToggle');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await retry.try(async () => {
        canvasExists = await elasticChart.canvasExists();
        expect(canvasExists).to.be(true);
      });
    });
    it('should allow hiding the histogram, persisted in saved search', async () => {
      const from = 'Jan 1, 2010 @ 00:00:00.000';
      const to = 'Mar 21, 2019 @ 00:00:00.000';
      const savedSearch = 'persisted hidden histogram';
      await prepareTest({ from, to });

      // close chart for saved search
      await testSubjects.click('unifiedHistogramChartOptionsToggle');
      await testSubjects.click('unifiedHistogramChartToggle');
      let canvasExists: boolean;
      await retry.try(async () => {
        canvasExists = await elasticChart.canvasExists();
        expect(canvasExists).to.be(false);
      });

      // save search
      await PageObjects.discover.saveSearch(savedSearch);
      await PageObjects.header.waitUntilLoadingHasFinished();

      // open new search
      await PageObjects.discover.clickNewSearchButton();
      await PageObjects.header.waitUntilLoadingHasFinished();

      // load saved search
      await PageObjects.discover.loadSavedSearch(savedSearch);
      await PageObjects.header.waitUntilLoadingHasFinished();
      canvasExists = await elasticChart.canvasExists();
      expect(canvasExists).to.be(false);

      // open chart for saved search
      await testSubjects.click('unifiedHistogramChartOptionsToggle');
      await testSubjects.click('unifiedHistogramChartToggle');
      await retry.waitFor(`Discover histogram to be displayed`, async () => {
        canvasExists = await elasticChart.canvasExists();
        return canvasExists;
      });

      // save search
      await PageObjects.discover.saveSearch(savedSearch);
      await PageObjects.header.waitUntilLoadingHasFinished();

      // open new search
      await PageObjects.discover.clickNewSearchButton();
      await PageObjects.header.waitUntilLoadingHasFinished();

      // load saved search
      await PageObjects.discover.loadSavedSearch(savedSearch);
      await PageObjects.header.waitUntilLoadingHasFinished();
      canvasExists = await elasticChart.canvasExists();
      expect(canvasExists).to.be(true);
    });
    it('should show permitted hidden histogram state when returning back to discover', async () => {
      // close chart
      await testSubjects.click('unifiedHistogramChartOptionsToggle');
      await testSubjects.click('unifiedHistogramChartToggle');
      let canvasExists: boolean;
      await retry.try(async () => {
        canvasExists = await elasticChart.canvasExists();
        expect(canvasExists).to.be(false);
      });

      // save search
      await PageObjects.discover.saveSearch('persisted hidden histogram');
      await PageObjects.header.waitUntilLoadingHasFinished();

      // open chart
      await testSubjects.click('unifiedHistogramChartOptionsToggle');
      await testSubjects.click('unifiedHistogramChartToggle');
      await retry.try(async () => {
        canvasExists = await elasticChart.canvasExists();
        expect(canvasExists).to.be(true);
      });

      // go to dashboard
      await PageObjects.common.navigateToApp('dashboard');
      await PageObjects.header.waitUntilLoadingHasFinished();

      // go to discover
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.header.waitUntilLoadingHasFinished();
      canvasExists = await elasticChart.canvasExists();
      expect(canvasExists).to.be(true);

      // close chart
      await testSubjects.click('unifiedHistogramChartOptionsToggle');
      await testSubjects.click('unifiedHistogramChartToggle');
      await retry.try(async () => {
        canvasExists = await elasticChart.canvasExists();
        expect(canvasExists).to.be(false);
      });
    });
  });
}
