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

/**
 * This tests both that one of each visualization can be added to a dashboard (as opposed to opening an existing
 * dashboard with the visualizations already on it), as well as conducts a rough type of snapshot testing by checking
 * for various ui components. The downside is these tests are a bit fragile to css changes (though not as fragile as
 * actual screenshot snapshot regression testing), and can be difficult to diagnose failures (which visualization
 * broke?).  The upside is that this offers very good coverage with a minimal time investment.
 */

export default function ({ getService, getPageObjects }) {
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const dashboardExpect = getService('dashboardExpect');
  const testSubjects = getService('testSubjects');
  const dashboardVisualizations = getService('dashboardVisualizations');
  const PageObjects = getPageObjects([
    'common',
    'dashboard',
    'header',
    'visualize',
    'discover',
    'timePicker',
  ]);

  describe('Dashboard Embedding', function describeIndexTests() {
    before(async () => {
      await esArchiver.load('kibana');
      await kibanaServer.uiSettings.replace({
        defaultIndex: '0bf35f60-3dc9-11e8-8660-4d65aa086b3c',
      });
      await PageObjects.common.navigateToApp('dashboard');
      await PageObjects.dashboard.preserveCrossAppState();
      await PageObjects.dashboard.clickNewDashboard();
    });

    it('adding a metric visualization', async function () {
      const originalPanelCount = await PageObjects.dashboard.getPanelCount();
      expect(originalPanelCount).to.eql(0);
      await testSubjects.exists('addVisualizationButton');
      await testSubjects.click('addVisualizationButton');
      await dashboardVisualizations.createAndEmbedMetric('Embedding Vis Test');
      await PageObjects.dashboard.waitForRenderComplete();
      await dashboardExpect.metricValuesExist(['0']);
      const panelCount = await PageObjects.dashboard.getPanelCount();
      expect(panelCount).to.eql(1);
    });

    it('adding a markdown', async function () {
      const originalPanelCount = await PageObjects.dashboard.getPanelCount();
      expect(originalPanelCount).to.eql(1);
      await testSubjects.exists('dashboardAddNewPanelButton');
      await testSubjects.click('dashboardAddNewPanelButton');
      await dashboardVisualizations.createAndEmbedMarkdown({
        name: 'Embedding Markdown Test',
        markdown: 'Nice to meet you, markdown is my name',
      });
      await PageObjects.dashboard.waitForRenderComplete();
      await dashboardExpect.markdownWithValuesExists(['Nice to meet you, markdown is my name']);
      const panelCount = await PageObjects.dashboard.getPanelCount();
      expect(panelCount).to.eql(2);
    });
  });
}
