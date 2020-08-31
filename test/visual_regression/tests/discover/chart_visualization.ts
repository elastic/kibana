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

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
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
    before(async function () {
      await esArchiver.load('discover');

      // and load a set of makelogs data
      await esArchiver.loadIfNeeded('logstash_functional');
      await kibanaServer.uiSettings.replace(defaultSettings);
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.timePicker.setDefaultAbsoluteRange();
    });

    after(function unloadMakelogs() {
      return esArchiver.unload('logstash_functional');
    });

    async function refreshDiscover() {
      await browser.refresh();
      await PageObjects.header.awaitKibanaChrome();
      await PageObjects.header.awaitGlobalLoadingIndicatorHidden();
      await PageObjects.discover.waitUntilSearchingHasFinished();
      await PageObjects.discover.waitForChartLoadingComplete(1);
    }

    async function takeSnapshot() {
      await refreshDiscover();
      await visualTesting.snapshot({
        show: ['discoverChart'],
      });
    }

    describe('query', function () {
      this.tags(['skipFirefox']);

      it('should show bars in the correct time zone', async function () {
        await PageObjects.header.awaitGlobalLoadingIndicatorHidden();
        await PageObjects.discover.waitUntilSearchingHasFinished();
        await takeSnapshot();
      });

      it('should show correct data for chart interval Hour', async function () {
        await PageObjects.discover.setChartInterval('Hour');
        await takeSnapshot();
      });

      it('should show correct data for chart interval Day', async function () {
        await PageObjects.discover.setChartInterval('Day');
        await takeSnapshot();
      });

      it('should show correct data for chart interval Week', async function () {
        await PageObjects.discover.setChartInterval('Week');
        await takeSnapshot();
      });

      it('browser back button should show previous interval Day', async function () {
        await browser.goBack();
        await retry.try(async function tryingForTime() {
          const actualInterval = await PageObjects.discover.getChartInterval();
          expect(actualInterval).to.be('Day');
        });
        await takeSnapshot();
      });

      it('should show correct data for chart interval Month', async function () {
        await PageObjects.discover.setChartInterval('Month');
        await takeSnapshot();
      });

      it('should show correct data for chart interval Year', async function () {
        await PageObjects.discover.setChartInterval('Year');
        await takeSnapshot();
      });

      it('should show correct data for chart interval Auto', async function () {
        await PageObjects.discover.setChartInterval('Auto');
        await takeSnapshot();
      });
    });

    describe('time zone switch', () => {
      it('should show bars in the correct time zone after switching', async function () {
        await kibanaServer.uiSettings.replace({ 'dateFormat:tz': 'America/Phoenix' });
        await refreshDiscover();
        await PageObjects.timePicker.setDefaultAbsoluteRange();
        await takeSnapshot();
      });
    });
  });
}
