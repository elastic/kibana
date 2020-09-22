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

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'dashboard', 'header', 'home', 'settings']);
  const a11y = getService('a11y');
  const dashboardPanelActions = getService('dashboardPanelActions');
  const testSubjects = getService('testSubjects');
  const inspector = getService('inspector');

  describe('Dashboard Panel', () => {
    before(async () => {
      await PageObjects.common.navigateToUrl('home', '/tutorial_directory/sampleData', {
        useActualUrl: true,
      });
      await PageObjects.home.addSampleDataSet('flights');
      await PageObjects.common.navigateToApp('dashboard');
      await testSubjects.click('dashboardListingTitleLink-[Flights]-Global-Flight-Dashboard');
    });

    it('dashboard panel open ', async () => {
      const header = await dashboardPanelActions.getPanelHeading('[Flights] Airline Carrier');
      await dashboardPanelActions.toggleContextMenu(header);
      await a11y.testAppSnapshot();
      // doing this again will close the Context Menu, so that next snapshot can start clean.
      await dashboardPanelActions.toggleContextMenu(header);
    });

    it('dashboard panel inspect', async () => {
      await dashboardPanelActions.openInspectorByTitle('[Flights] Airline Carrier');
      await a11y.testAppSnapshot();
    });

    it('dashboard panel inspector view chooser ', async () => {
      await testSubjects.click('inspectorViewChooser');
      await a11y.testAppSnapshot();
      await testSubjects.click('inspectorViewChooser');
    });

    it('dashboard panel inspector request statistics ', async () => {
      await inspector.openInspectorRequestsView();
      await a11y.testAppSnapshot();
    });

    it('dashboard panel inspector request', async () => {
      await testSubjects.click('inspectorRequestDetailRequest');
      await a11y.testAppSnapshot();
    });

    it('dashboard panel inspector response', async () => {
      await testSubjects.click('inspectorRequestDetailResponse');
      await a11y.testAppSnapshot();
      await inspector.close();
    });

    it('dashboard panel full screen', async () => {
      const header = await dashboardPanelActions.getPanelHeading('[Flights] Airline Carrier');
      await dashboardPanelActions.toggleContextMenu(header);
      await testSubjects.click('embeddablePanelAction-togglePanel');
      await a11y.testAppSnapshot();
    });
  });
}
