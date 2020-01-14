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

export default function({ getService, getPageObjects }) {
  const retry = getService('retry');
  const PageObjects = getPageObjects(['dashboard', 'header', 'common']);

  describe('dashboard clone', function describeIndexTests() {
    const dashboardName = 'Dashboard Clone Test';
    const clonedDashboardName = dashboardName + ' Copy';

    before(async function() {
      return PageObjects.dashboard.initTests();
    });

    it('Clone saves a copy', async function() {
      await PageObjects.dashboard.clickNewDashboard();
      await PageObjects.dashboard.addVisualizations(
        PageObjects.dashboard.getTestVisualizationNames()
      );
      await PageObjects.dashboard.enterDashboardTitleAndClickSave(dashboardName);

      await PageObjects.dashboard.clickClone();
      await PageObjects.dashboard.confirmClone();

      const countOfDashboards = await PageObjects.dashboard.getDashboardCountWithName(
        clonedDashboardName
      );
      expect(countOfDashboards).to.equal(1);
    });

    it('the copy should have all the same visualizations', async function() {
      await PageObjects.dashboard.loadSavedDashboard(clonedDashboardName);
      await retry.try(async () => {
        const panelTitles = await PageObjects.dashboard.getPanelTitles();
        expect(panelTitles).to.eql(PageObjects.dashboard.getTestVisualizationNames());
      });
    });

    it('clone appends Copy to the dashboard title name', async () => {
      await PageObjects.dashboard.loadSavedDashboard(dashboardName);
      await PageObjects.dashboard.clickClone();

      const title = await PageObjects.dashboard.getCloneTitle();
      expect(title).to.be(clonedDashboardName);
    });

    it('and warns on duplicate name', async function() {
      await PageObjects.dashboard.confirmClone();
      await PageObjects.dashboard.expectDuplicateTitleWarningDisplayed({ displayed: true });
    });

    it("and doesn't save", async () => {
      await PageObjects.dashboard.cancelClone();

      const countOfDashboards = await PageObjects.dashboard.getDashboardCountWithName(
        dashboardName
      );
      expect(countOfDashboards).to.equal(1);
    });

    it('Clones on confirm duplicate title warning', async function() {
      await PageObjects.dashboard.loadSavedDashboard(dashboardName);
      await PageObjects.dashboard.clickClone();

      await PageObjects.dashboard.confirmClone();
      await PageObjects.dashboard.expectDuplicateTitleWarningDisplayed({ displayed: true });
      await PageObjects.dashboard.confirmClone();
      await PageObjects.dashboard.waitForRenderComplete();

      const countOfDashboards = await PageObjects.dashboard.getDashboardCountWithName(
        dashboardName + ' Copy'
      );
      expect(countOfDashboards).to.equal(2);
    });
  });
}
