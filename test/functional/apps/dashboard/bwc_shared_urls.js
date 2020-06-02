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
  const PageObjects = getPageObjects(['dashboard', 'header']);
  const dashboardExpect = getService('dashboardExpect');
  const pieChart = getService('pieChart');
  const browser = getService('browser');
  const log = getService('log');
  const queryBar = getService('queryBar');

  let kibanaLegacyBaseUrl;

  const urlQuery =
    `` +
    `_g=(refreshInterval:(pause:!t,value:0),` +
    `time:(from:'2012-11-17T00:00:00.000Z',mode:absolute,to:'2015-11-17T18:01:36.621Z'))&` +
    `_a=(description:'',filters:!(),` +
    `fullScreenMode:!f,` +
    `options:(),` +
    `panels:!((col:1,id:Visualization-MetricChart,panelIndex:1,row:1,size_x:6,size_y:3,type:visualization),` +
    `(col:7,id:Visualization-PieChart,panelIndex:2,row:1,size_x:6,size_y:3,type:visualization)),` +
    `query:(language:lucene,query:'memory:%3E220000'),` +
    `timeRestore:!f,` +
    `title:'New+Dashboard',` +
    `uiState:(P-1:(vis:(defaultColors:('0+-+100':'rgb(0,104,55)'))),` +
    `P-2:(vis:(colors:('200,000':%23F9D9F9,` +
    `'240,000':%23F9D9F9,` +
    `'280,000':%23F9D9F9,` +
    `'320,000':%23F9D9F9,` +
    `'360,000':%23F9D9F9),` +
    `legendOpen:!t))),` +
    `viewMode:edit)`;

  describe('bwc shared urls', function describeIndexTests() {
    before(async function () {
      await PageObjects.dashboard.initTests();
      await PageObjects.dashboard.preserveCrossAppState();

      const currentUrl = await browser.getCurrentUrl();
      kibanaLegacyBaseUrl =
        currentUrl.substring(0, currentUrl.indexOf('/app/dashboards')) + '/app/kibana';
    });

    describe('5.6 urls', () => {
      it('url with filters and query', async () => {
        const url56 =
          `` +
          `_g=(refreshInterval:(display:Off,pause:!f,value:0),` +
          `time:(from:'2012-11-17T00:00:00.000Z',mode:absolute,to:'2015-11-17T18:01:36.621Z'))&` +
          `_a=(` +
          `description:'',` +
          `filters:!(('$state':(store:appState),` +
          `meta:(alias:!n,disabled:!f,index:'logstash-*',key:bytes,negate:!f,type:phrase,value:'12345'),` +
          `query:(match:(bytes:(query:12345,type:phrase))))),` +
          `fullScreenMode:!f,` +
          `options:(),` +
          `panels:!((col:1,id:Visualization-MetricChart,panelIndex:1,row:1,size_x:6,size_y:3,type:visualization),` +
          `(col:7,id:Visualization-PieChart,panelIndex:2,row:1,size_x:6,size_y:3,type:visualization)),` +
          `query:(query_string:(analyze_wildcard:!t,query:'memory:>220000')),` +
          `timeRestore:!f,` +
          `title:'New+Dashboard',` +
          `uiState:(),` +
          `viewMode:edit)`;
        const url = `${kibanaLegacyBaseUrl}#/dashboard?${url56}`;
        log.debug(`Navigating to ${url}`);
        await browser.get(url, true);
        await PageObjects.header.waitUntilLoadingHasFinished();

        const query = await queryBar.getQueryString();
        expect(query).to.equal('memory:>220000');

        await pieChart.expectPieSliceCount(0);
        await dashboardExpect.panelCount(2);
      });
    });

    describe('6.0 urls', () => {
      it('loads an unsaved dashboard', async function () {
        const url = `${kibanaLegacyBaseUrl}#/dashboard?${urlQuery}`;
        log.debug(`Navigating to ${url}`);
        await browser.get(url, true);
        await PageObjects.header.waitUntilLoadingHasFinished();

        const query = await queryBar.getQueryString();
        expect(query).to.equal('memory:>220000');

        await pieChart.expectPieSliceCount(5);
        await dashboardExpect.panelCount(2);
        await dashboardExpect.selectedLegendColorCount('#F9D9F9', 5);
      });

      it('loads a saved dashboard', async function () {
        await PageObjects.dashboard.saveDashboard('saved with colors', {
          storeTimeWithDashboard: true,
        });

        const id = await PageObjects.dashboard.getDashboardIdFromCurrentUrl();
        const url = `${kibanaLegacyBaseUrl}#/dashboard/${id}`;
        log.debug(`Navigating to ${url}`);
        await browser.get(url, true);
        await PageObjects.header.waitUntilLoadingHasFinished();

        const query = await queryBar.getQueryString();
        expect(query).to.equal('memory:>220000');

        await pieChart.expectPieSliceCount(5);
        await dashboardExpect.panelCount(2);
        await dashboardExpect.selectedLegendColorCount('#F9D9F9', 5);
      });

      it('uiState in url takes precedence over saved dashboard state', async function () {
        const id = await PageObjects.dashboard.getDashboardIdFromCurrentUrl();
        const updatedQuery = urlQuery.replace(/F9D9F9/g, '000000');
        const url = `${kibanaLegacyBaseUrl}#/dashboard/${id}?${updatedQuery}`;
        log.debug(`Navigating to ${url}`);

        await browser.get(url, true);
        await PageObjects.header.waitUntilLoadingHasFinished();

        await dashboardExpect.selectedLegendColorCount('#000000', 5);
      });

      it('back button works for old dashboards after state migrations', async () => {
        await PageObjects.dashboard.preserveCrossAppState();
        const oldId = await PageObjects.dashboard.getDashboardIdFromCurrentUrl();
        await PageObjects.dashboard.waitForRenderComplete();
        await dashboardExpect.selectedLegendColorCount('#000000', 5);

        const url = `${kibanaLegacyBaseUrl}#/dashboard?${urlQuery}`;
        log.debug(`Navigating to ${url}`);
        await browser.get(url);
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.dashboard.waitForRenderComplete();
        await dashboardExpect.selectedLegendColorCount('#F9D9F9', 5);
        await browser.goBack();

        await PageObjects.header.waitUntilLoadingHasFinished();
        const newId = await PageObjects.dashboard.getDashboardIdFromCurrentUrl();
        expect(newId).to.be.equal(oldId);
        await PageObjects.dashboard.waitForRenderComplete();
        await dashboardExpect.selectedLegendColorCount('#000000', 5);
      });
    });
  });
}
