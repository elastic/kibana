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
  const find = getService('find');
  const dashboardExpect = getService('dashboardExpect');
  const dashboardAddPanel = getService('dashboardAddPanel');
  const PageObjects = getPageObjects(['common', 'dashboard', 'header', 'visualize', 'discover']);

  describe('dashboard embeddable rendering', function describeIndexTests() {
    before(async () => {
      await PageObjects.dashboard.clickNewDashboard();
      const fromTime = '2018-01-01 00:00:00.000';
      const toTime = '2018-04-13 00:00:00.000';
      await PageObjects.header.setAbsoluteRange(fromTime, toTime);
    });

    it('adding visualizations', async () => {
      await dashboardAddPanel.addEveryVisualization('"Rendering Test"');
      await PageObjects.header.waitUntilLoadingHasFinished();
      const panelCount = await PageObjects.dashboard.getPanelCount();
      expect(panelCount).to.be(26);
    });

    it('adding saved searches', async () => {
      await dashboardAddPanel.addEverySavedSearch('"Rendering Test"');
      await dashboardAddPanel.closeAddPanel();
      await PageObjects.header.waitUntilLoadingHasFinished();
      const panelCount = await PageObjects.dashboard.getPanelCount();
      expect(panelCount).to.be(27);

      // Not neccessary but helpful for local debugging.
      await PageObjects.dashboard.saveDashboard('embeddable rendering test');
    });

    it('pie charts rendered', async () => {
      await dashboardExpect.pieSliceCount(16);
    });

    it('area, bar and heatmap charts rendered', async () => {
      await dashboardExpect.seriesElementCount(19);
    });

    it('data tables render', async () => {
      await dashboardExpect.dataTableRowCount(5);
    });

    it('saved searches render', async () => {
      await dashboardExpect.savedSearchRowCount(50);
    });

    it('goal and guage render', async () => {
      await dashboardExpect.goalAndGuageLabelsExist(['63%', '56%', '11.915 GB']);
    });

    it('input controls render', async () => {
      await dashboardExpect.inputControlItemCount(5);
    });

    it('metric vis renders', async () => {
      await dashboardExpect.metricValuesExist(['7,544']);
    });

    it('markdown renders', async () => {
      await dashboardExpect.markdownWithValuesExists(['I\'m a markdown!']);
    });

    it('line charts render', async () => {
      await dashboardExpect.lineChartPointsCount(5);
    });

    it('tag cloud renders', async () => {
      await dashboardExpect.tagCloudWithValuesFound(['CN', 'IN', 'US', 'BR', 'ID']);
    });

    it('timelion chart renders', async () => {
      await dashboardExpect.timelionLegendCount(0);
    });

    it('tsvb guage renders', async () => {
      const tsvbGuageExists = await find.existsByCssSelector('.thorHalfGauge');
      expect(tsvbGuageExists).to.be(true);
    });

    it('tsvb metric chart renders', async () => {
      await dashboardExpect.tsvbMetricValuesExist(['210,007,889,606']);
    });

    it('tsvb markdown renders', async () => {
      await dashboardExpect.tsvbMarkdownWithValuesExists(['Hi Avg last bytes: 6286.674715909091']);
    });

    it('tsvb table chart renders', async () => {
      await dashboardExpect.tsvbTableCellCount(20);
    });

    it('tsvb time series renders', async () => {
      await dashboardExpect.tsvbTimeSeriesLegendCount(1);
    });

    it('tsvb top n chart renders', async () => {
      await dashboardExpect.tsvbTopNValuesExist(['5,734.79', '6,286.67']);
    });

    it('vega chart renders', async () => {
      const tsvb = await find.existsByCssSelector('.vega-view-container');
      expect(tsvb).to.be(true);
    });
  });
}
