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

/**
 * This tests both that one of each visualization can be added to a dashboard (as opposed to opening an existing
 * dashboard with the visualizations already on it), as well as conducts a rough type of snapshot testing by checking
 * for various ui components. The downside is these tests are a bit fragile to css changes (though not as fragile as
 * actual screenshot snapshot regression testing), and can be difficult to diagnose failures (which visualization
 * broke?).  The upside is that this offers very good coverage with a minimal time investment.
 */

export default function ({ getService, getPageObjects }) {
  const log = getService('log');
  const find = getService('find');
  const browser = getService('browser');
  const pieChart = getService('pieChart');
  const dashboardExpect = getService('dashboardExpect');
  const dashboardAddPanel = getService('dashboardAddPanel');
  const PageObjects = getPageObjects(['common', 'dashboard', 'header', 'visualize', 'discover', 'timePicker']);
  const retry = getService('retry');

  const expectAllDataRenders = async () => {
    await pieChart.expectPieSliceCount(16);
    await dashboardExpect.metricValuesExist(['7,544']);
    await dashboardExpect.seriesElementCount(19);
    const tsvbGuageExists = await find.existsByCssSelector('.tvbVisHalfGauge');
    expect(tsvbGuageExists).to.be(true);
    await dashboardExpect.timelionLegendCount(0);
    await dashboardExpect.markdownWithValuesExists(['I\'m a markdown!']);
    await dashboardExpect.vegaTextsExist(['5,000']);
    await dashboardExpect.goalAndGuageLabelsExist(['63%', '56%', '11.915 GB']);
    await dashboardExpect.dataTableRowCount(5);
    await dashboardExpect.tagCloudWithValuesFound(['CN', 'IN', 'US', 'BR', 'ID']);
    // TODO add test for 'region map viz'
    // TODO add test for 'tsvb gauge' viz
    await dashboardExpect.tsvbTimeSeriesLegendCount(1);
    // TODO add test for 'geo map' viz
    // This tests the presence of the two input control embeddables
    await dashboardExpect.inputControlItemCount(5);
    await dashboardExpect.tsvbTableCellCount(20);
    await dashboardExpect.tsvbMarkdownWithValuesExists(['Hi Avg last bytes: 6286.674715909091']);
    await dashboardExpect.tsvbTopNValuesExist(['5,734.79', '6,286.675']);
    await dashboardExpect.tsvbMetricValuesExist(['210,007,889,606']);
    // TODO add test for 'animal sound pie' viz
    // This tests the area chart and non timebased line chart points
    await dashboardExpect.lineChartPointsCount(5);
    // TODO add test for 'scripted filter and query' viz
    // TODO add test for 'animal weight linked to search' viz
    // TODO add test for the last vega viz
    await dashboardExpect.savedSearchRowCount(50);
  };

  const expectNoDataRenders = async () => {
    await pieChart.expectPieSliceCount(0);
    await dashboardExpect.seriesElementCount(0);
    await dashboardExpect.dataTableRowCount(0);
    await dashboardExpect.savedSearchRowCount(0);
    await dashboardExpect.inputControlItemCount(5);
    await dashboardExpect.metricValuesExist(['0']);
    await dashboardExpect.markdownWithValuesExists(['I\'m a markdown!']);

    // Three instead of 0 because there is a visualization based off a non time based index that
    // should still show data.
    await dashboardExpect.lineChartPointsCount(3);

    await dashboardExpect.timelionLegendCount(0);
    const tsvbGuageExists = await find.existsByCssSelector('.tvbVisHalfGauge');
    expect(tsvbGuageExists).to.be(true);
    await dashboardExpect.tsvbMetricValuesExist(['0']);
    await dashboardExpect.tsvbMarkdownWithValuesExists(['Hi Avg last bytes: 0']);
    await dashboardExpect.tsvbTableCellCount(0);
    await dashboardExpect.tsvbTimeSeriesLegendCount(1);
    await dashboardExpect.tsvbTopNValuesExist(['0']);
    await dashboardExpect.vegaTextsDoNotExist(['5,000']);
  };

  describe('dashboard embeddable rendering', function describeIndexTests() {
    before(async () => {
      await PageObjects.dashboard.clickNewDashboard();

      const fromTime = '2018-01-01 00:00:00.000';
      const toTime = '2018-04-13 00:00:00.000';
      await PageObjects.timePicker.setAbsoluteRange(fromTime, toTime);
    });

    after(async () => {
      // Get rid of the timestamp added in this test, as well any global or app state.
      const currentUrl = await browser.getCurrentUrl();
      const newUrl = currentUrl.replace(/\?.*$/, '');
      await browser.get(newUrl, false);
    });

    it('adding visualizations', async () => {
      await dashboardAddPanel.addEveryVisualization('"Rendering Test"');

      // This one is rendered via svg which lets us do better testing of what is being rendered.
      await dashboardAddPanel.addVisualization('Filter Bytes Test: vega');

      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.dashboard.waitForRenderComplete();
      const panelCount = await PageObjects.dashboard.getPanelCount();
      log.debug(`---------------------------- panel count = ${panelCount}`);
      const panelData = await PageObjects.dashboard.getPanelSharedItemData();
      log.debug(`---------------------------- panelData.length = ${panelData.length}`);
      const panelTitles = panelData.map(x => x.title);
      log.debug(panelTitles);
      // we've seen failures where we only find 26 of 27 expected panels with data-render-complete="true"
      // and we've also seen failures where we only found 26 panels.  It's been hard
      // to debug so let's just compare the whole set and we'll get more specific error logging
      expect(panelTitles).to.eql([ 'Rendering Test: pie',
        'Rendering Test: metric',
        'Rendering Test: heatmap',
        'Rendering Test: guage',
        'Rendering Test: timelion',
        'Rendering Test: markdown',
        'Rendering Test: vega',
        'Rendering Test: goal',
        'Rendering Test: datatable',
        'Rendering Test: bar',
        'Rendering Test: tag cloud',
        'Rendering Test: region map',
        'Rendering Test: tsvb-guage',
        'Rendering Test: input control',
        'Rendering Test: tsvb-table',
        'Rendering Test: tsvb-markdown',
        'Rendering Test: tsvb-topn',
        'Rendering Test: tsvb-metric',
        'Rendering Test: tsvb-ts',
        'Rendering Test: geo map',
        'Rendering Test: input control parent',
        'Rendering Test: animal sounds pie',
        'Rendering Test: area with not filter',
        'Rendering Test: scripted filter and query',
        'Rendering Test: animal weights linked to search',
        'Rendering Test: non timebased line chart - dog data - with filter',
        'Filter Bytes Test: vega' ]);
    });

    it('adding saved searches', async () => {
      await dashboardAddPanel.addEverySavedSearch('"Rendering Test"');
      await dashboardAddPanel.closeAddPanel();
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.dashboard.waitForRenderComplete();

      await retry.try(async function tryingForTime() {
        const panelCount = await PageObjects.dashboard.getPanelCount();
        const panelData = await PageObjects.dashboard.getPanelSharedItemData();
        const panelTitles = panelData.map(x => x.title);
        console.log(panelTitles);

        expect(panelTitles).to.eql([ 'Rendering Test: pie',
          'Rendering Test: metric',
          'Rendering Test: heatmap',
          'Rendering Test: guage',
          'Rendering Test: timelion',
          'Rendering Test: markdown',
          'Rendering Test: vega',
          'Rendering Test: goal',
          'Rendering Test: datatable',
          'Rendering Test: bar',
          'Rendering Test: tag cloud',
          'Rendering Test: region map',
          'Rendering Test: tsvb-guage',
          'Rendering Test: input control',
          'Rendering Test: tsvb-table',
          'Rendering Test: tsvb-markdown',
          'Rendering Test: tsvb-topn',
          'Rendering Test: tsvb-metric',
          'Rendering Test: tsvb-ts',
          'Rendering Test: geo map',
          'Rendering Test: input control parent',
          'Rendering Test: animal sounds pie',
          'Rendering Test: area with not filter',
          'Rendering Test: scripted filter and query',
          'Rendering Test: animal weights linked to search',
          'Rendering Test: non timebased line chart - dog data - with filter',
          'Filter Bytes Test: vega',
          'Rendering Test: saved search' ]);

        expect(panelCount).to.be(28);
      });
      await PageObjects.dashboard.saveDashboard('embeddable rendering test', { storeTimeWithDashboard: true });
    });

    it('initial render test', async () => {
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.dashboard.waitForRenderComplete();
      await expectAllDataRenders();
    });

    it('data rendered correctly when dashboard is opened from listing page', async () => {
      // Change the time to make sure that it's updated when re-opened from the listing page.
      const fromTime = '2018-05-10 00:00:00.000';
      const toTime = '2018-05-11 00:00:00.000';
      await PageObjects.timePicker.setAbsoluteRange(fromTime, toTime);
      await PageObjects.dashboard.loadSavedDashboard('embeddable rendering test');
      await PageObjects.dashboard.waitForRenderComplete();
      await expectAllDataRenders();
    });

    it('data rendered correctly when dashboard is hard refreshed', async () => {
      const currentUrl = await browser.getCurrentUrl();
      await browser.get(currentUrl, true);
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.dashboard.waitForRenderComplete();
      await expectAllDataRenders();
    });

    it('panels are updated when time changes outside of data', async () => {
      const fromTime = '2018-05-11 00:00:00.000';
      const toTime = '2018-05-12 00:00:00.000';
      await PageObjects.timePicker.setAbsoluteRange(fromTime, toTime);
      await PageObjects.dashboard.waitForRenderComplete();
      await expectNoDataRenders();
    });

    it('panels are updated when time changes inside of data', async () => {
      const fromTime = '2018-01-01 00:00:00.000';
      const toTime = '2018-04-13 00:00:00.000';
      await PageObjects.timePicker.setAbsoluteRange(fromTime, toTime);
      await PageObjects.dashboard.waitForRenderComplete();
      await expectAllDataRenders();
    });
  });
}
