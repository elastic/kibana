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
  const testSubjects = getService('testSubjects');
  const dashboardAddPanel = getService('dashboardAddPanel');
  const PageObjects = getPageObjects(['dashboard']);

  describe('dark theme', async () => {
    before(async () => {
      await PageObjects.dashboard.clickNewDashboard();
    });

    after(async () => {
      await dashboardAddPanel.closeAddPanel();
      await PageObjects.dashboard.gotoDashboardLandingPage();
    });

    // Visual builder applies dark theme by investigating appState for 'options.darkTheme'
    // This test ensures everything is properly wired together and Visual Builder adds dark theme classes
    it('should display Visual Builder timeseries with reversed class', async () => {
      await dashboardAddPanel.addVisualization('Rendering Test: tsvb-ts');
      await PageObjects.dashboard.useDarkTheme(true);
      const classNames = await testSubjects.getAttribute('timeseriesChart', 'class');
      expect(classNames.includes('reversed')).to.be(true);
    });

  });
}

