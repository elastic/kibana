/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';
import { TimeStrings } from '../../page_objects/common_page';

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

  describe('discover histogram', function describeIndexTests() {
    before(async () => {
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
      await esArchiver.load('test/functional/fixtures/es_archiver/long_window_logstash');
      await esArchiver.load(
        'test/functional/fixtures/es_archiver/long_window_logstash_index_pattern'
      );
      await security.testUser.setRoles(['kibana_admin', 'long_window_logstash']);
      await kibanaServer.uiSettings.replace(defaultSettings);
      await PageObjects.common.navigateToApp('discover');
    });
    after(async () => {
      await esArchiver.unload('test/functional/fixtures/es_archiver/long_window_logstash');
      await esArchiver.unload(
        'test/functional/fixtures/es_archiver/long_window_logstash_index_pattern'
      );
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
      await testSubjects.click('discoverChartOptionsToggle');
      await testSubjects.click('discoverChartToggle');
      canvasExists = await elasticChart.canvasExists();
      expect(canvasExists).to.be(false);
      // histogram is hidden, when reloading the page it should remain hidden
      await browser.refresh();
      canvasExists = await elasticChart.canvasExists();
      expect(canvasExists).to.be(false);
      await testSubjects.click('discoverChartOptionsToggle');
      await testSubjects.click('discoverChartToggle');
      await PageObjects.header.waitUntilLoadingHasFinished();
      canvasExists = await elasticChart.canvasExists();
      expect(canvasExists).to.be(true);
    });
    it('should allow hiding the histogram, persisted in saved search', async () => {
      const from = 'Jan 1, 2010 @ 00:00:00.000';
      const to = 'Mar 21, 2019 @ 00:00:00.000';
      const savedSearch = 'persisted hidden histogram';
      await prepareTest({ from, to });

      // close chart for saved search
      await testSubjects.click('discoverChartOptionsToggle');
      await testSubjects.click('discoverChartToggle');
      let canvasExists = await elasticChart.canvasExists();
      expect(canvasExists).to.be(false);

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
      await testSubjects.click('discoverChartOptionsToggle');
      await testSubjects.click('discoverChartToggle');
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
      await testSubjects.click('discoverChartOptionsToggle');
      await testSubjects.click('discoverChartToggle');
      let canvasExists = await elasticChart.canvasExists();
      expect(canvasExists).to.be(false);

      // save search
      await PageObjects.discover.saveSearch('persisted hidden histogram');
      await PageObjects.header.waitUntilLoadingHasFinished();

      // open chart
      await testSubjects.click('discoverChartOptionsToggle');
      await testSubjects.click('discoverChartToggle');
      canvasExists = await elasticChart.canvasExists();
      expect(canvasExists).to.be(true);

      // go to dashboard
      await PageObjects.common.navigateToApp('dashboard');
      await PageObjects.header.waitUntilLoadingHasFinished();

      // go to discover
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.header.waitUntilLoadingHasFinished();
      canvasExists = await elasticChart.canvasExists();
      expect(canvasExists).to.be(true);

      // close chart
      await testSubjects.click('discoverChartOptionsToggle');
      await testSubjects.click('discoverChartToggle');
      canvasExists = await elasticChart.canvasExists();
      expect(canvasExists).to.be(false);
    });
  });
}
