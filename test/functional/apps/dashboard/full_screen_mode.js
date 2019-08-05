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
  const retry = getService('retry');
  const browser = getService('browser');
  const dashboardPanelActions = getService('dashboardPanelActions');
  const PageObjects = getPageObjects(['dashboard', 'common']);

  describe('full screen mode', () => {
    before(async () => {
      await PageObjects.dashboard.loadSavedDashboard('few panels');
    });

    it('option not available in edit mode', async () => {
      await PageObjects.dashboard.switchToEditMode();
      const exists = await PageObjects.dashboard.fullScreenModeMenuItemExists();
      expect(exists).to.be(false);
    });

    it('available in view mode', async () => {
      await PageObjects.dashboard.saveDashboard('full screen test', { saveAsNew: true });
      const exists = await PageObjects.dashboard.fullScreenModeMenuItemExists();
      expect(exists).to.be(true);
    });

    it('hides the chrome', async () => {
      let isChromeVisible = await PageObjects.common.isChromeVisible();
      expect(isChromeVisible).to.be(true);

      await PageObjects.dashboard.clickFullScreenMode();

      await retry.try(async () => {
        isChromeVisible = await PageObjects.common.isChromeVisible();
        expect(isChromeVisible).to.be(false);
      });
    });

    it('displays exit full screen logo button', async () => {
      const exists = await PageObjects.dashboard.exitFullScreenLogoButtonExists();
      expect(exists).to.be(true);
    });

    it('displays exit full screen logo button when panel is expanded', async () => {
      await dashboardPanelActions.openContextMenu();
      await dashboardPanelActions.clickExpandPanelToggle();

      const exists = await PageObjects.dashboard.exitFullScreenTextButtonExists();
      expect(exists).to.be(true);
    });

    it('exits when the text button is clicked on', async () => {
      const logoButton = await PageObjects.dashboard.getExitFullScreenLogoButton();
      await browser.moveMouseTo(logoButton);
      await PageObjects.dashboard.clickExitFullScreenTextButton();

      await retry.try(async () => {
        const isChromeVisible = await PageObjects.common.isChromeVisible();
        expect(isChromeVisible).to.be(true);
      });
    });
  });
}
