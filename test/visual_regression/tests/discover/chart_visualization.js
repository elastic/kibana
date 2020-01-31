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

export default function({ getService, getPageObjects }) {
  const log = getService('log');
  const retry = getService('retry');
  const esArchiver = getService('esArchiver');
  const browser = getService('browser');
  const kibanaServer = getService('kibanaServer');
  const PageObjects = getPageObjects(['common', 'discover', 'header', 'timePicker']);
  const visualTesting = getService('visualTesting');
  const defaultSettings = {
    defaultIndex: 'logstash-*',
    'discover:sampleSize': 1,
  };

  describe('discover', function describeIndexTests() {
    const fromTime = '2015-09-19 06:31:44.000';
    const toTime = '2015-09-23 18:31:44.000';

    before(async function() {
      log.debug('load kibana index with default index pattern');
      await esArchiver.load('discover');

      // and load a set of makelogs data
      await esArchiver.loadIfNeeded('logstash_functional');
      await kibanaServer.uiSettings.replace(defaultSettings);
      log.debug('discover');
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.timePicker.setAbsoluteRange(fromTime, toTime);
    });

    describe('query', function() {
      this.tags(['skipFirefox']);

      it('should show bars in the correct time zone', async function() {
        await PageObjects.header.awaitGlobalLoadingIndicatorHidden();
        await PageObjects.discover.waitUntilSearchingHasFinished();
        await visualTesting.snapshot({
          show: ['discoverChart'],
        });
      });

      it('should show correct data for chart interval Hourly', async function() {
        await PageObjects.header.awaitGlobalLoadingIndicatorHidden();
        await PageObjects.discover.waitUntilSearchingHasFinished();
        await PageObjects.discover.setChartInterval('Hourly');
        await visualTesting.snapshot({
          show: ['discoverChart'],
        });
      });

      it('should show correct data for chart interval Daily', async function() {
        await PageObjects.header.awaitGlobalLoadingIndicatorHidden();
        await PageObjects.discover.waitUntilSearchingHasFinished();
        await PageObjects.discover.setChartInterval('Daily');
        await visualTesting.snapshot({
          show: ['discoverChart'],
        });
      });

      it('should show correct data for chart interval Weekly', async function() {
        await PageObjects.header.awaitGlobalLoadingIndicatorHidden();
        await PageObjects.discover.waitUntilSearchingHasFinished();
        await PageObjects.discover.setChartInterval('Weekly');
        await visualTesting.snapshot({
          show: ['discoverChart'],
        });
      });

      it('browser back button should show previous interval Daily', async function() {
        await browser.goBack();
        await retry.try(async function tryingForTime() {
          const actualInterval = await PageObjects.discover.getChartInterval();
          expect(actualInterval).to.be('Daily');
        });
        await PageObjects.header.awaitGlobalLoadingIndicatorHidden();
        await PageObjects.discover.waitUntilSearchingHasFinished();
        await visualTesting.snapshot({
          show: ['discoverChart'],
        });
      });

      it('should show correct data for chart interval Monthly', async function() {
        await PageObjects.header.awaitGlobalLoadingIndicatorHidden();
        await PageObjects.discover.waitUntilSearchingHasFinished();
        await PageObjects.discover.setChartInterval('Monthly');
        await visualTesting.snapshot({
          show: ['discoverChart'],
        });
      });

      it('should show correct data for chart interval Yearly', async function() {
        await PageObjects.header.awaitGlobalLoadingIndicatorHidden();
        await PageObjects.discover.waitUntilSearchingHasFinished();
        await PageObjects.discover.setChartInterval('Yearly');
        await visualTesting.snapshot({
          show: ['discoverChart'],
        });
      });

      it('should show correct data for chart interval Auto', async function() {
        await PageObjects.header.awaitGlobalLoadingIndicatorHidden();
        await PageObjects.discover.waitUntilSearchingHasFinished();
        await PageObjects.discover.setChartInterval('Auto');
        await visualTesting.snapshot({
          show: ['discoverChart'],
        });
      });
    });

    describe('time zone switch', () => {
      it('should show bars in the correct time zone after switching', async function() {
        await kibanaServer.uiSettings.replace({ 'dateFormat:tz': 'America/Phoenix' });
        await browser.refresh();
        await PageObjects.header.awaitKibanaChrome();
        await PageObjects.timePicker.setAbsoluteRange(fromTime, toTime);
        await PageObjects.header.awaitGlobalLoadingIndicatorHidden();
        await PageObjects.discover.waitUntilSearchingHasFinished();
        await visualTesting.snapshot({
          show: ['discoverChart'],
        });
      });
    });
  });
}
