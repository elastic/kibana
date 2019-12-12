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
  const PageObjects = getPageObjects(['common', 'discover', 'header', 'timePicker']);
  const defaultSettings = {
    defaultIndex: 'logstash-*',
  };

  describe('discover app', function describeIndexTests() {
    const fromTime = '2015-09-19 06:31:44.000';
    const toTime = '2015-09-23 18:31:44.000';

    before(async function () {
      // delete .kibana index and update configDoc
      await kibanaServer.uiSettings.replace(defaultSettings);

      log.debug('load kibana index with default index pattern');
      await esArchiver.load('discover');
      await esArchiver.loadIfNeeded('long_window_logstash');
      await esArchiver.loadIfNeeded('visualize');
      // and load a set of makelogs data
      await esArchiver.loadIfNeeded('logstash_functional');
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

      it('should show correct time range string in chart', async function () {
        const actualTimeString = await PageObjects.discover.getChartTimespan();
        const expectedTimeString = `Sep 19, 2015 @ 06:31:44.000 - Sep 23, 2015 @ 18:31:44.000`;
        expect(actualTimeString).to.be(expectedTimeString);
      });

      it('should modify the time range when a bar is clicked', async function () {
        await PageObjects.timePicker.setAbsoluteRange(fromTime, toTime);
        await PageObjects.discover.clickHistogramBar();
        const time = await PageObjects.timePicker.getTimeConfig();
        expect(time.start).to.be('Sep 21, 2015 @ 09:00:00.000');
        expect(time.end).to.be('Sep 21, 2015 @ 12:00:00.000');
        const rowData = await PageObjects.discover.getDocTableField(1);
        expect(rowData).to.have.string('Sep 21, 2015 @ 11:59:22.316');
      });

      it('should modify the time range when the histogram is brushed', async function () {
        await PageObjects.timePicker.setAbsoluteRange(fromTime, toTime);
        await PageObjects.discover.brushHistogram();

        const newDurationHours = await PageObjects.timePicker.getTimeDurationInHours();
        expect(Math.round(newDurationHours)).to.be(25);
        const rowData = await PageObjects.discover.getDocTableField(1);
        expect(Date.parse(rowData)).to.be.within(Date.parse('Sep 20, 2015 @ 22:00:00.000'), Date.parse('Sep 20, 2015 @ 23:30:00.000'));
      });

      it('should show correct initial chart interval of Auto', async function () {
        await PageObjects.timePicker.setAbsoluteRange(fromTime, toTime);
        await PageObjects.discover.waitUntilSearchingHasFinished();
        const actualInterval = await PageObjects.discover.getChartInterval();

        const expectedInterval = 'Auto';
        expect(actualInterval).to.be(expectedInterval);
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
    });

    describe('query #2, which has an empty time range', () => {
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

    describe('filter editor', function () {
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
      // skipping this until we get an elastic-chart alternative to check the ticks value
      it.skip('should show ticks in the correct time zone after switching', async function () {
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
      });
      it('should show bars in the correct time zone after switching', async function () {
        await kibanaServer.uiSettings.replace({ 'dateFormat:tz': 'America/Phoenix' });
        await browser.refresh();
        await PageObjects.header.awaitKibanaChrome();
        await PageObjects.timePicker.setAbsoluteRange(fromTime, toTime);

        log.debug('check that the newest doc timestamp is now -7 hours from the UTC time in the first test');
        const rowData = await PageObjects.discover.getDocTableIndex(1);
        expect(rowData.startsWith('Sep 22, 2015 @ 16:50:13.253')).to.be.ok();
      });
    });
  });
}
