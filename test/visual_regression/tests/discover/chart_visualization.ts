/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({
  getService,
  getPageObjects,
  updateBaselines,
}: FtrProviderContext & { updateBaselines: boolean }) {
  const retry = getService('retry');
  const esArchiver = getService('esArchiver');
  const browser = getService('browser');
  const kibanaServer = getService('kibanaServer');
  const PageObjects = getPageObjects(['common', 'discover', 'header', 'timePicker']);
  const screenshot = getService('screenshots');
  const defaultSettings = {
    defaultIndex: 'logstash-*',
    'discover:sampleSize': 1,
  };

  describe('discover', function describeIndexTests() {
    before(async function () {
      updateBaselines = true; // TODO: Remove this.  It's only used to get all the screenshots from Buildkite
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.importExport.load(
        'test/functional/fixtures/kbn_archiver/discover/visual_regression'
      );

      // and load a set of makelogs data
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
      await kibanaServer.uiSettings.replace(defaultSettings);
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.timePicker.setDefaultAbsoluteRange();
    });

    after(async function unloadMakelogs() {
      await esArchiver.unload('test/functional/fixtures/es_archiver/logstash_functional');
      await kibanaServer.savedObjects.cleanStandardList();
    });

    async function refreshDiscover() {
      await browser.refresh();
      await PageObjects.header.awaitKibanaChrome();
      await PageObjects.header.awaitGlobalLoadingIndicatorHidden();
      await PageObjects.discover.waitUntilSearchingHasFinished();
      await PageObjects.discover.waitForChartLoadingComplete(1);
    }

    describe('query', function () {
      this.tags(['skipFirefox']);

      it('should show bars in the correct time zone', async function () {
        await PageObjects.header.awaitGlobalLoadingIndicatorHidden();
        await PageObjects.discover.waitUntilSearchingHasFinished();
        const percentDifference = await screenshot.compareAgainstBaseline(
          'discover_tz',
          updateBaselines
        );
        expect(percentDifference).to.be.lessThan(0.001);
      });

      it('should show correct data for chart interval Hour', async function () {
        await PageObjects.discover.setChartInterval('Hour');
        const percentDifference = await screenshot.compareAgainstBaseline(
          'discover_hour',
          updateBaselines
        );
        expect(percentDifference).to.be.lessThan(0.001);
      });

      it('should show correct data for chart interval Day', async function () {
        await PageObjects.discover.setChartInterval('Day');
        const percentDifference = await screenshot.compareAgainstBaseline(
          'discover_day',
          updateBaselines
        );
        expect(percentDifference).to.be.lessThan(0.001);
      });

      it('should show correct data for chart interval Week', async function () {
        await PageObjects.discover.setChartInterval('Week');
        const percentDifference = await screenshot.compareAgainstBaseline(
          'discover_week',
          updateBaselines
        );
        expect(percentDifference).to.be.lessThan(0.001);
      });

      it('browser back button should show previous interval Day', async function () {
        await browser.goBack();
        await retry.try(async function tryingForTime() {
          const actualInterval = await PageObjects.discover.getChartInterval();
          expect(actualInterval).to.be('Day');
        });
        const percentDifference = await screenshot.compareAgainstBaseline(
          'discover_previous_day',
          updateBaselines
        );
        expect(percentDifference).to.be.lessThan(0.001);
      });

      it('should show correct data for chart interval Month', async function () {
        await PageObjects.discover.setChartInterval('Month');
        const percentDifference = await screenshot.compareAgainstBaseline(
          'discover_month',
          updateBaselines
        );
        expect(percentDifference).to.be.lessThan(0.001);
      });

      it('should show correct data for chart interval Year', async function () {
        await PageObjects.discover.setChartInterval('Year');
        const percentDifference = await screenshot.compareAgainstBaseline(
          'discover_year',
          updateBaselines
        );
        expect(percentDifference).to.be.lessThan(0.001);
      });

      it('should show correct data for chart interval Auto', async function () {
        await PageObjects.discover.setChartInterval('Auto');
        const percentDifference = await screenshot.compareAgainstBaseline(
          'discover_auto',
          updateBaselines
        );
        expect(percentDifference).to.be.lessThan(0.001);
      });
    });

    describe('time zone switch', () => {
      it('should show bars in the correct time zone after switching', async function () {
        await kibanaServer.uiSettings.replace({ 'dateFormat:tz': 'America/Phoenix' });
        await refreshDiscover();
        await PageObjects.timePicker.setDefaultAbsoluteRange();
        const percentDifference = await screenshot.compareAgainstBaseline(
          'discover_switch_tz',
          updateBaselines
        );
        expect(percentDifference).to.be.lessThan(0.001);
      });
    });
  });
}
