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
  const log = getService('log');
  const retry = getService('retry');
  const esArchiver = getService('esArchiver');
  const browser = getService('browser');
  const kibanaServer = getService('kibanaServer');
  const filterBar = getService('filterBar');
  const PageObjects = getPageObjects(['common', 'discover', 'header', 'visualize', 'timePicker']);
  const defaultSettings = {
    defaultIndex: 'logstash-*',
  };

  describe('discover test', function describeIndexTests() {
    const fromTime = '2015-09-19 06:31:44.000';
    const toTime = '2015-09-23 18:31:44.000';

    before(async function () {
      log.debug('load kibana index with default index pattern');
      await esArchiver.load('discover');

      // and load a set of makelogs data
      await esArchiver.loadIfNeeded('logstash_functional');
      await kibanaServer.uiSettings.replace(defaultSettings);
      log.debug('discover');
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.timePicker.setAbsoluteRange(fromTime, toTime);
    });

    describe('query', function () {
      this.tags(['skipFirefox']);
      const queryName1 = 'Query # 1';

      it('should show correct time range string by timepicker', async function () {
        const time = await PageObjects.timePicker.getTimeConfig();
        expect(time.start).to.be('Sep 19, 2015 @ 06:31:44.000');
        expect(time.end).to.be('Sep 23, 2015 @ 18:31:44.000');
        const rowData = await PageObjects.discover.getDocTableIndex(1);
        log.debug('check the newest doc timestamp in UTC (check diff timezone in last test)');
        expect(rowData.startsWith('Sep 22, 2015 @ 23:50:13.253')).to.be.ok();
      });

      it('save query should show toast message and display query name', async function () {
        await PageObjects.discover.saveSearch(queryName1);
        const actualQueryNameString = await PageObjects.discover.getCurrentQueryName();
        expect(actualQueryNameString).to.be(queryName1);
      });

      it('load query should show query name', async function () {
        await PageObjects.discover.loadSavedSearch(queryName1);

        await retry.try(async function () {
          expect(await PageObjects.discover.getCurrentQueryName()).to.be(
            queryName1
          );
        });
      });

      it('should show the correct hit count', async function () {
        const expectedHitCount = '14,004';
        await retry.try(async function () {
          expect(await PageObjects.discover.getHitCount()).to.be(
            expectedHitCount
          );
        });
      });

      it('should show the correct bar chart', async function () {
        const expectedBarChartData = [
          35,
          189,
          694,
          1347,
          1285,
          704,
          176,
          29,
          39,
          189,
          640,
          1276,
          1327,
          663,
          166,
          25,
          30,
          164,
          663,
          1320,
          1270,
          681,
          188,
          27,
        ];
        await verifyChartData(expectedBarChartData);
      });

      it('should show correct time range string in chart', async function () {
        const actualTimeString = await PageObjects.discover.getChartTimespan();
        const expectedTimeString = `Sep 19, 2015 @ 06:31:44.000 - Sep 23, 2015 @ 18:31:44.000`;
        expect(actualTimeString).to.be(expectedTimeString);
      });

      it('should show bars in the correct time zone', async function () {
        const maxTicks = [
          '2015-09-20 00:00',
          '2015-09-20 12:00',
          '2015-09-21 00:00',
          '2015-09-21 12:00',
          '2015-09-22 00:00',
          '2015-09-22 12:00',
          '2015-09-23 00:00',
          '2015-09-23 12:00'
        ];

        for (const tick of await PageObjects.discover.getBarChartXTicks()) {
          if (!maxTicks.includes(tick)) {
            throw new Error(`unexpected x-axis tick "${tick}"`);
          }
        }
      });

      it('should modify the time range when a bar is clicked', async function () {
        await PageObjects.timePicker.setAbsoluteRange(fromTime, toTime);
        await PageObjects.visualize.waitForVisualization();
        await PageObjects.discover.clickHistogramBar(0);
        await PageObjects.visualize.waitForVisualization();
        const time = await PageObjects.timePicker.getTimeConfig();
        expect(time.start).to.be('Sep 20, 2015 @ 00:00:00.000');
        expect(time.end).to.be('Sep 20, 2015 @ 03:00:00.000');
      });

      it('should modify the time range when the histogram is brushed', async function () {
        await PageObjects.timePicker.setAbsoluteRange(fromTime, toTime);
        await PageObjects.visualize.waitForVisualization();
        await PageObjects.discover.brushHistogram(0, 1);
        await PageObjects.visualize.waitForVisualization();

        const newDurationHours = await PageObjects.timePicker.getTimeDurationInHours();
        if (newDurationHours < 1 || newDurationHours >= 5) {
          throw new Error(`expected new duration of ${newDurationHours} hours to be between 1 and 5 hours`);
        }
      });

      it('should show correct initial chart interval of Auto', async function () {
        await PageObjects.timePicker.setAbsoluteRange(fromTime, toTime);
        await PageObjects.discover.waitUntilSearchingHasFinished();
        const actualInterval = await PageObjects.discover.getChartInterval();

        const expectedInterval = 'Auto';
        expect(actualInterval).to.be(expectedInterval);
      });

      it('should show correct data for chart interval Hourly', async function () {
        await PageObjects.header.awaitGlobalLoadingIndicatorHidden();
        await PageObjects.discover.setChartInterval('Hourly');

        const expectedBarChartData = [
          4,
          7,
          16,
          23,
          38,
          87,
          132,
          159,
          248,
          320,
          349,
          376,
          380,
          324,
          293,
          233,
          188,
          125,
          69,
          40,
          28,
          17,
          2,
          3,
          8,
          10,
          12,
          28,
          36,
          84,
          111,
          157,
          229,
          292,
          324,
          373,
          378,
          345,
          306,
          223,
          167,
          124,
          72,
          35,
          22,
          11,
          7,
          1,
          6,
          5,
          12,
          25,
          27,
          76,
          111,
          175,
          228,
          294,
          358,
          372,
          366,
          344,
          276,
          213,
          201,
          113,
          72,
          39,
          36,
          12,
          7,
          3,
        ];
        await verifyChartData(expectedBarChartData);
      });

      it('should show correct data for chart interval Daily', async function () {
        const chartInterval = 'Daily';
        const expectedBarChartData = [4757, 4614, 4633];
        await PageObjects.discover.setChartInterval(chartInterval);
        await retry.try(async () => {
          await verifyChartData(expectedBarChartData);
        });
      });

      it('should show correct data for chart interval Weekly', async function () {
        const chartInterval = 'Weekly';
        const expectedBarChartData = [4757, 9247];

        await PageObjects.discover.setChartInterval(chartInterval);
        await retry.try(async () => {
          await verifyChartData(expectedBarChartData);
        });
      });

      it('browser back button should show previous interval Daily', async function () {
        const expectedChartInterval = 'Daily';
        const expectedBarChartData = [4757, 4614, 4633];

        await browser.goBack();
        await retry.try(async function tryingForTime() {
          const actualInterval = await PageObjects.discover.getChartInterval();
          expect(actualInterval).to.be(expectedChartInterval);
        });
        await verifyChartData(expectedBarChartData);
      });

      it('should show correct data for chart interval Monthly', async function () {
        const chartInterval = 'Monthly';
        const expectedBarChartData = [13129];

        await PageObjects.discover.setChartInterval(chartInterval);
        await verifyChartData(expectedBarChartData);
      });

      it('should show correct data for chart interval Yearly', async function () {
        const chartInterval = 'Yearly';
        const expectedBarChartData = [13129];

        await PageObjects.discover.setChartInterval(chartInterval);
        await verifyChartData(expectedBarChartData);
      });

      it('should show correct data for chart interval Auto', async function () {
        const chartInterval = 'Auto';
        const expectedBarChartData = [
          35,
          189,
          694,
          1347,
          1285,
          704,
          176,
          29,
          39,
          189,
          640,
          1276,
          1327,
          663,
          166,
          25,
          30,
          164,
          663,
          1320,
          1270,
          681,
          188,
          27,
        ];

        await PageObjects.discover.setChartInterval(chartInterval);
        await verifyChartData(expectedBarChartData);
      });

      it('should show Auto chart interval', async function () {
        const expectedChartInterval = 'Auto';

        const actualInterval = await PageObjects.discover.getChartInterval();
        expect(actualInterval).to.be(expectedChartInterval);
      });

      it('should not show "no results"', async () => {
        const isVisible = await PageObjects.discover.hasNoResults();
        expect(isVisible).to.be(false);
      });

      async function verifyChartData(expectedBarChartData) {
        await retry.try(async function tryingForTime() {
          const paths = await PageObjects.discover.getBarChartData();
          // the largest bars are over 100 pixels high so this is less than 1% tolerance
          const barHeightTolerance = 1;
          let stringResults = '';
          let hasFailure = false;
          for (let y = 0; y < expectedBarChartData.length; y++) {
            stringResults +=
              y +
              ': expected = ' +
              expectedBarChartData[y] +
              ', actual = ' +
              paths[y] +
              ', Pass = ' +
              (Math.abs(expectedBarChartData[y] - paths[y]) <
                barHeightTolerance) +
              '\n';
            if (
              Math.abs(expectedBarChartData[y] - paths[y]) > barHeightTolerance
            ) {
              hasFailure = true;
            }
          }
          if (hasFailure) {
            log.debug(stringResults);
            log.debug(paths);
          }
          for (let x = 0; x < expectedBarChartData.length; x++) {
            expect(
              Math.abs(expectedBarChartData[x] - paths[x]) < barHeightTolerance
            ).to.be.ok();
          }
        });
      }
    });

    describe('query #2, which has an empty time range', async () => {
      const fromTime = '1999-06-11 09:22:11.000';
      const toTime = '1999-06-12 11:21:04.000';

      before(async () => {
        log.debug('setAbsoluteRangeForAnotherQuery');
        await PageObjects.timePicker.setAbsoluteRange(fromTime, toTime);
        await PageObjects.discover.waitUntilSearchingHasFinished();
      });

      it('should show "no results"', async () => {
        const isVisible = await PageObjects.discover.hasNoResults();
        expect(isVisible).to.be(true);
      });

      it('should suggest a new time range is picked', async () => {
        const isVisible = await PageObjects.discover.hasNoResultsTimepicker();
        expect(isVisible).to.be(true);
      });
    });

    describe('filter editor', async function () {
      it('should add a phrases filter', async function () {
        await filterBar.addFilter('extension.raw', 'is one of', 'jpg');
        expect(await filterBar.hasFilter('extension.raw', 'jpg')).to.be(true);
      });

      it('should show the phrases if you re-open a phrases filter', async function () {
        await filterBar.clickEditFilter('extension.raw', 'jpg');
        const phrases = await filterBar.getFilterEditorSelectedPhrases();
        expect(phrases.length).to.be(1);
        expect(phrases[0]).to.be('jpg');
      });
    });

    describe('data-shared-item', function () {
      it('should have correct data-shared-item title and description', async () => {
        const expected = {
          title: 'A Saved Search',
          description: 'A Saved Search Description',
        };

        await retry.try(async () => {
          await PageObjects.discover.loadSavedSearch(expected.title);
          const {
            title,
            description,
          } = await PageObjects.common.getSharedItemTitleAndDescription();
          expect(title).to.eql(expected.title);
          expect(description).to.eql(expected.description);
        });
      });
    });

    describe('time zone switch', () => {
      it('should show bars in the correct time zone after switching', async function () {

        await kibanaServer.uiSettings.replace({ 'dateFormat:tz': 'America/Phoenix' });
        await browser.refresh();
        await PageObjects.header.awaitKibanaChrome();
        await PageObjects.timePicker.setAbsoluteRange(fromTime, toTime);

        const maxTicks = [
          '2015-09-20 00:00',
          '2015-09-20 12:00',
          '2015-09-21 00:00',
          '2015-09-21 12:00',
          '2015-09-22 00:00',
          '2015-09-22 12:00',
          '2015-09-23 00:00',
          '2015-09-23 12:00'
        ];

        await retry.try(async function () {
          for (const tick of await PageObjects.discover.getBarChartXTicks()) {
            if (!maxTicks.includes(tick)) {
              throw new Error(`unexpected x-axis tick "${tick}"`);
            }
          }
        });
        log.debug('check that the newest doc timestamp is now -7 hours from the UTC time in the first test');
        const rowData = await PageObjects.discover.getDocTableIndex(1);
        expect(rowData.startsWith('Sep 22, 2015 @ 16:50:13.253')).to.be.ok();
      });

    });
  });
}
