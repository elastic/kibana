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

import expect from 'expect.js';

export default function ({ getService, getPageObjects }) {
  const retry = getService('retry');
  const find = getService('find');
  const pieChart = getService('pieChart');
  const dashboardExpect = getService('dashboardExpect');
  const PageObjects = getPageObjects(['common', 'header', 'home', 'dashboard', 'timePicker']);

  describe('sample data', function describeIndexTests() {

    before(async () => {
      await PageObjects.common.navigateToUrl('home', 'tutorial_directory/sampleData');
      await PageObjects.header.waitUntilLoadingHasFinished();
    });

    it('should display registered flights sample data sets', async ()=> {
      await retry.try(async () => {
        const exists = await PageObjects.home.doesSampleDataSetExist('flights');
        expect(exists).to.be(true);
      });
    });

    it('should display registered logs sample data sets', async ()=> {
      await retry.try(async () => {
        const exists = await PageObjects.home.doesSampleDataSetExist('logs');
        expect(exists).to.be(true);
      });
    });

    it('should display registered ecommerce sample data sets', async ()=> {
      await retry.try(async () => {
        const exists = await PageObjects.home.doesSampleDataSetExist('ecommerce');
        expect(exists).to.be(true);
      });
    });

    it('should install flights sample data set', async ()=> {
      await PageObjects.home.addSampleDataSet('flights');
      const isInstalled = await PageObjects.home.isSampleDataSetInstalled('flights');
      expect(isInstalled).to.be(true);
    });

    it('should install logs sample data set', async ()=> {
      await PageObjects.home.addSampleDataSet('logs');
      const isInstalled = await PageObjects.home.isSampleDataSetInstalled('logs');
      expect(isInstalled).to.be(true);
    });

    it('should install ecommerce sample data set', async ()=> {
      await PageObjects.home.addSampleDataSet('ecommerce');
      const isInstalled = await PageObjects.home.isSampleDataSetInstalled('ecommerce');
      expect(isInstalled).to.be(true);
    });

    describe('dashboard', () => {
      afterEach(async () => {
        await PageObjects.common.navigateToUrl('home', 'tutorial_directory/sampleData');
        await PageObjects.header.waitUntilLoadingHasFinished();
      });

      it('should launch sample flights data set dashboard', async ()=> {
        await PageObjects.home.launchSampleDataSet('flights');
        await PageObjects.header.waitUntilLoadingHasFinished();
        const today = new Date();
        const todayYearMonthDay = today.toISOString().substring(0, 10);
        const fromTime = `${todayYearMonthDay} 00:00:00.000`;
        const toTime = `${todayYearMonthDay} 23:59:59.999`;
        await PageObjects.timePicker.setAbsoluteRange(fromTime, toTime);
        const panelCount = await PageObjects.dashboard.getPanelCount();
        expect(panelCount).to.be(19);
      });


      it.skip('pie charts rendered', async () => {
        await pieChart.expectPieSliceCount(4);
      });

      it.skip('area, bar and heatmap charts rendered', async () => {
        await dashboardExpect.seriesElementCount(15);
      });

      it.skip('saved searches render', async () => {
        await dashboardExpect.savedSearchRowCount(50);
      });

      it.skip('input controls render', async () => {
        await dashboardExpect.inputControlItemCount(3);
      });

      it.skip('tag cloud renders', async () => {
        await dashboardExpect.tagCloudWithValuesFound(['Sunny', 'Rain', 'Clear', 'Cloudy', 'Hail']);
      });

      it.skip('vega chart renders', async () => {
        const tsvb = await find.existsByCssSelector('.vgaVis__view');
        expect(tsvb).to.be(true);
      });

      it('should launch sample logs data set dashboard', async ()=> {
        await PageObjects.home.launchSampleDataSet('logs');
        await PageObjects.header.waitUntilLoadingHasFinished();
        const today = new Date();
        const todayYearMonthDay = today.toISOString().substring(0, 10);
        const fromTime = `${todayYearMonthDay} 00:00:00.000`;
        const toTime = `${todayYearMonthDay} 23:59:59.999`;
        await PageObjects.timePicker.setAbsoluteRange(fromTime, toTime);
        const panelCount = await PageObjects.dashboard.getPanelCount();
        expect(panelCount).to.be(11);
      });

      it('should launch sample ecommerce data set dashboard', async ()=> {
        await PageObjects.home.launchSampleDataSet('ecommerce');
        await PageObjects.header.waitUntilLoadingHasFinished();
        const today = new Date();
        const todayYearMonthDay = today.toISOString().substring(0, 10);
        const fromTime = `${todayYearMonthDay} 00:00:00.000`;
        const toTime = `${todayYearMonthDay} 23:59:59.999`;
        await PageObjects.timePicker.setAbsoluteRange(fromTime, toTime);
        const panelCount = await PageObjects.dashboard.getPanelCount();
        expect(panelCount).to.be(12);
      });

    });

    // needs to be in describe block so it is run after 'dashboard describe block'
    describe('uninstall', () => {
      it('should uninstall flights sample data set', async ()=> {
        await PageObjects.home.removeSampleDataSet('flights');
        const isInstalled = await PageObjects.home.isSampleDataSetInstalled('flights');
        expect(isInstalled).to.be(false);
      });

      it('should uninstall logs sample data set', async ()=> {
        await PageObjects.home.removeSampleDataSet('logs');
        const isInstalled = await PageObjects.home.isSampleDataSetInstalled('logs');
        expect(isInstalled).to.be(false);
      });

      it('should uninstall ecommerce sample data set', async ()=> {
        await PageObjects.home.removeSampleDataSet('ecommerce');
        const isInstalled = await PageObjects.home.isSampleDataSetInstalled('ecommerce');
        expect(isInstalled).to.be(false);
      });
    });
  });
}
