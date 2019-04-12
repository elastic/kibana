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

export default function ({ getService }) {
  const find = getService('find');
  const pieChart = getService('pieChart');
  const dashboardExpect = getService('dashboardExpect');

  describe('renders', () => {
    it('pie charts', async () => {
      await pieChart.expectPieSliceCount(8);
    });

    it('metric visualizations', async () => {
      await dashboardExpect.metricValuesExist(['5,922']);
    });

    it('visualizations with series and line charts', async () => {
      await dashboardExpect.seriesElementCount(30);
      await dashboardExpect.lineChartPointsCount(5);
    });

    it('tsvb visualizations', async () => {
      const tsvbGuageExists = await find.existsByCssSelector('.tvbVisHalfGauge');
      expect(tsvbGuageExists).to.be(true);
      await dashboardExpect.tsvbTimeSeriesLegendCount(1);
      await dashboardExpect.tsvbTableCellCount(20);
      await dashboardExpect.tsvbMarkdownWithValuesExists(['Hi Avg last bytes: 5919.43661971831']);
      await dashboardExpect.tsvbTopNValuesExist(['5,544.25', '5,919.437']);
      await dashboardExpect.tsvbMetricValuesExist(['3,526,809,089']);
    });

    it('markdown', async () => {
      await dashboardExpect.markdownWithValuesExists(['I\'m a markdown!']);
    });

    it('goal and guage', async () => {
      await dashboardExpect.goalAndGuageLabelsExist(['40%', '37%', '11.944 GB']);
    });

    it('data table', async () => {
      await dashboardExpect.dataTableRowCount(5);
    });

    it('tag cloud', async () => {
      await dashboardExpect.tagCloudWithValuesFound(['CN', 'IN', 'US', 'BR', 'ID']);
    });

    it('input controls', async () => {
      await dashboardExpect.inputControlItemCount(7);
    });

    it('saved search', async () => {
      await dashboardExpect.savedSearchRowCount(55);
    });
  });
}
