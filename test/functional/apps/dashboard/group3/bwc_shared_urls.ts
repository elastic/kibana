/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['dashboard', 'header']);
  const toasts = getService('toasts');
  const browser = getService('browser');
  const log = getService('log');
  const queryBar = getService('queryBar');

  let kibanaLegacyBaseUrl: string;

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

        const warningToast = await toasts.getToastElement(1);
        expect(await warningToast.getVisibleText()).to.contain('Cannot load panels');

        await PageObjects.dashboard.waitForRenderComplete();
      });
    });

    describe('6.0 urls', () => {
      let savedDashboardId: string;

      it('loads an unsaved dashboard', async function () {
        const url = `${kibanaLegacyBaseUrl}#/dashboard?${urlQuery}`;
        log.debug(`Navigating to ${url}`);
        await browser.get(url, true);
        await PageObjects.header.waitUntilLoadingHasFinished();
        const query = await queryBar.getQueryString();
        expect(query).to.equal('memory:>220000');

        const warningToast = await toasts.getToastElement(1);
        expect(await warningToast.getVisibleText()).to.contain('Cannot load panels');
        await PageObjects.dashboard.waitForRenderComplete();
      });

      it('loads a saved dashboard', async function () {
        await PageObjects.dashboard.saveDashboard('saved with colors', {
          storeTimeWithDashboard: true,
        });

        savedDashboardId = await PageObjects.dashboard.getDashboardIdFromCurrentUrl();
        const url = `${kibanaLegacyBaseUrl}#/dashboard/${savedDashboardId}`;
        log.debug(`Navigating to ${url}`);
        await browser.get(url, true);
        await PageObjects.header.waitUntilLoadingHasFinished();

        const query = await queryBar.getQueryString();
        expect(query).to.equal('memory:>220000');

        await PageObjects.dashboard.waitForRenderComplete();
      });

      it('loads a saved dashboard with query via dashboard_no_match', async function () {
        await PageObjects.dashboard.gotoDashboardLandingPage();
        const currentUrl = await browser.getCurrentUrl();
        const dashboardBaseUrl = currentUrl.substring(0, currentUrl.indexOf('/app/dashboards'));
        const url = `${dashboardBaseUrl}/app/dashboards#/dashboard/${savedDashboardId}?_a=(query:(language:kuery,query:'boop'))`;
        log.debug(`Navigating to ${url}`);
        await browser.get(url);
        await PageObjects.header.waitUntilLoadingHasFinished();

        const query = await queryBar.getQueryString();
        expect(query).to.equal('boop');

        await PageObjects.dashboard.waitForRenderComplete();
      });

      it('uiState in url takes precedence over saved dashboard state', async function () {
        const id = await PageObjects.dashboard.getDashboardIdFromCurrentUrl();
        const updatedQuery = urlQuery.replace(/F9D9F9/g, '000000');
        const url = `${kibanaLegacyBaseUrl}#/dashboard/${id}?${updatedQuery}`;
        log.debug(`Navigating to ${url}`);

        await browser.get(url, true);
        await PageObjects.header.waitUntilLoadingHasFinished();
      });

      it('back button works for old dashboards after state migrations', async () => {
        await PageObjects.dashboard.preserveCrossAppState();
        const oldId = await PageObjects.dashboard.getDashboardIdFromCurrentUrl();
        await PageObjects.dashboard.waitForRenderComplete();

        const url = `${kibanaLegacyBaseUrl}#/dashboard?${urlQuery}`;
        log.debug(`Navigating to ${url}`);
        await browser.get(url);
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.dashboard.waitForRenderComplete();
        await browser.goBack();

        await PageObjects.header.waitUntilLoadingHasFinished();
        const newId = await PageObjects.dashboard.getDashboardIdFromCurrentUrl();
        expect(newId).to.be.equal(oldId);
        await PageObjects.dashboard.waitForRenderComplete();
        await queryBar.submitQuery();
      });
    });
  });
}
