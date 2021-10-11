/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import moment from 'moment';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const retry = getService('retry');
  const find = getService('find');
  const log = getService('log');
  const security = getService('security');
  const elasticChart = getService('elasticChart');
  const renderable = getService('renderable');
  const dashboardExpect = getService('dashboardExpect');
  const PageObjects = getPageObjects(['common', 'header', 'home', 'dashboard', 'timePicker']);
  const kibanaServer = getService('kibanaServer');

  interface UrlData {
    appName: string;
    subUrl: string;
    opts: { useActualUrl: boolean };
  }
  const timeAndNav = (range: { from: string; to: string }) => (urlData: UrlData) => async () => {
    await kibanaServer.uiSettings.replace({ 'timepicker:timeDefaults': JSON.stringify(range) });
    await nav(urlData);

    async function nav(urlObj: UrlData) {
      const { appName, subUrl, opts } = urlObj;
      const { useActualUrl } = opts;
      await PageObjects.common.navigateToUrl(appName, subUrl, { useActualUrl });
    }
  };

  const today = moment().format('MMM D, YYYY');
  const from = `${today} @ 00:00:00.000`;
  const to = `${today} @ 23:59:59.999`;

  const navToday = timeAndNav({ from, to })({
    appName: 'home',
    subUrl: '/tutorial_directory/sampleData',
    opts: { useActualUrl: true },
  });

  describe('sample data', function describeIndexTests() {
    before(async () => {
      await security.testUser.setRoles(['kibana_admin', 'kibana_sample_admin']);
      await PageObjects.common.navigateToUrl('home', '/tutorial_directory/sampleData', {
        useActualUrl: true,
      });
      await PageObjects.header.waitUntilLoadingHasFinished();
    });

    after(async () => {
      await security.testUser.restoreDefaults();
      await kibanaServer.uiSettings.unset('timepicker:timeDefaults');
    });

    it('should display registered flights sample data sets', async () => {
      await retry.try(async () => {
        const exists = await PageObjects.home.doesSampleDataSetExist('flights');
        expect(exists).to.be(true);
      });
    });

    it('should display registered logs sample data sets', async () => {
      await retry.try(async () => {
        const exists = await PageObjects.home.doesSampleDataSetExist('logs');
        expect(exists).to.be(true);
      });
    });

    it('should display registered ecommerce sample data sets', async () => {
      await retry.try(async () => {
        const exists = await PageObjects.home.doesSampleDataSetExist('ecommerce');
        expect(exists).to.be(true);
      });
    });

    it('should install flights sample data set', async () => {
      await PageObjects.home.addSampleDataSet('flights');
      const isInstalled = await PageObjects.home.isSampleDataSetInstalled('flights');
      expect(isInstalled).to.be(true);
    });

    it('should install logs sample data set', async () => {
      await PageObjects.home.addSampleDataSet('logs');
      const isInstalled = await PageObjects.home.isSampleDataSetInstalled('logs');
      expect(isInstalled).to.be(true);
    });

    it('should install ecommerce sample data set', async () => {
      await PageObjects.home.addSampleDataSet('ecommerce');
      const isInstalled = await PageObjects.home.isSampleDataSetInstalled('ecommerce');
      expect(isInstalled).to.be(true);
    });

    describe('dashboard', () => {
      beforeEach(async () => {
        await PageObjects.common.navigateToUrl('home', '/tutorial_directory/sampleData', {
          useActualUrl: true,
        });
        await PageObjects.header.waitUntilLoadingHasFinished();
      });

      it('should launch sample flights data set dashboard', async () => {
        await navToday();
        await PageObjects.home.launchSampleDashboard('flights');
        await PageObjects.header.waitUntilLoadingHasFinished();
        await renderable.waitForRender();
        const panelCount = await PageObjects.dashboard.getPanelCount();
        expect(panelCount).to.be(17);
      });

      it('should render visualizations', async () => {
        await PageObjects.home.launchSampleDashboard('flights');
        await PageObjects.header.waitUntilLoadingHasFinished();
        await renderable.waitForRender();
        log.debug('Checking charts rendered');
        await elasticChart.waitForRenderComplete('lnsVisualizationContainer');
        log.debug('Checking saved searches rendered');
        await dashboardExpect.savedSearchRowCount(10);
        log.debug('Checking input controls rendered');
        await dashboardExpect.inputControlItemCount(3);
        log.debug('Checking tag cloud rendered');
        await dashboardExpect.tagCloudWithValuesFound(['Sunny', 'Rain', 'Clear', 'Cloudy', 'Hail']);
        log.debug('Checking vega chart rendered');
        expect(await find.existsByCssSelector('.vgaVis__view')).to.be(true);
      });

      it('should launch sample logs data set dashboard', async () => {
        await navToday();
        await PageObjects.home.launchSampleDashboard('logs');
        await PageObjects.header.waitUntilLoadingHasFinished();
        await renderable.waitForRender();
        const panelCount = await PageObjects.dashboard.getPanelCount();
        expect(panelCount).to.be(13);
      });

      it('should launch sample ecommerce data set dashboard', async () => {
        await navToday();
        await PageObjects.home.launchSampleDashboard('ecommerce');
        await PageObjects.header.waitUntilLoadingHasFinished();
        await renderable.waitForRender();
        const panelCount = await PageObjects.dashboard.getPanelCount();
        expect(panelCount).to.be(15);
      });
    });

    // needs to be in describe block so it is run after 'dashboard describe block'
    describe('uninstall', () => {
      beforeEach(async () => {
        await PageObjects.common.navigateToUrl('home', '/tutorial_directory/sampleData', {
          useActualUrl: true,
        });
        await PageObjects.header.waitUntilLoadingHasFinished();
      });

      it('should uninstall flights sample data set', async () => {
        await PageObjects.home.removeSampleDataSet('flights');
        const isInstalled = await PageObjects.home.isSampleDataSetInstalled('flights');
        expect(isInstalled).to.be(false);
      });

      it('should uninstall logs sample data set', async () => {
        await PageObjects.home.removeSampleDataSet('logs');
        const isInstalled = await PageObjects.home.isSampleDataSetInstalled('logs');
        expect(isInstalled).to.be(false);
      });

      it('should uninstall ecommerce sample data set', async () => {
        await PageObjects.home.removeSampleDataSet('ecommerce');
        const isInstalled = await PageObjects.home.isSampleDataSetInstalled('ecommerce');
        expect(isInstalled).to.be(false);
      });
    });
  });
}
