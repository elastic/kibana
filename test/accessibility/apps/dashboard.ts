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

import { FtrProviderContext } from '../ftr_provider_context';

export default function({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'dashboard', 'header', 'home']);
  const a11y = getService('a11y');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const dashboardPanelActions = getService('dashboardPanelActions');
  const dashboardAddPanel = getService('dashboardAddPanel');
  const testSubjects = getService('testSubjects');

  describe('Dashboard', () => {
    const dashboardName = 'Dashboard Listing A11y';
    before(async () => {
      // await esArchiver.loadIfNeeded('logstash_functional');
      // await kibanaServer.uiSettings.update({
      //   defaultIndex: 'logstash-*',
      // });
      await PageObjects.common.navigateToUrl('home', 'tutorial_directory/sampleData');
      await PageObjects.home.addSampleDataSet('flights');
    });

    it('dashboard', async () => {
      await PageObjects.common.navigateToApp('dashboard');
      await a11y.testAppSnapshot();
    });

    it('create dashboard button', async () => {
      await PageObjects.dashboard.clickNewDashboard();
      await a11y.testAppSnapshot();
    });

    it('save empty dashboard', async () => {
      await PageObjects.dashboard.saveDashboard(dashboardName);
      await a11y.testAppSnapshot();
    });

    it('Open Edit mode', async () => {
      await PageObjects.dashboard.switchToEditMode();
      await a11y.testAppSnapshot();
    });

    it('Open add panel', async () => {
      await dashboardAddPanel.ensureAddPanelIsShowing();
      await a11y.testAppSnapshot();
    });

    it('add a visualization', async () => {
      await testSubjects.click('savedObjectTitle[Flights]-Delay-Buckets');
      await a11y.testAppSnapshot();
    });

    it('add a saved search', async () => {
      await testSubjects.click('savedObjectTitle[Flights]-Flight-Log');
      await a11y.testAppSnapshot();
    });

    // it('save the dashboard', async () => {
    //   await PageObjects.dashboard.saveDashboard(dashboardName);
    //   await a11y.testAppSnapshot();
    // });

    it.skip('Dashboard listing table', async () => {
      await PageObjects.dashboard.gotoDashboardLandingPage();
      await a11y.testAppSnapshot();
    });

    it.skip('Open flight dashboard', async () => {
      await testSubjects.click('dashboardListingTitleLink-[Flights]-Global-Flight-Dashboard');
      await a11y.testAppSnapshot();
    });
  });
}
