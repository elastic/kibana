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
  const remote = getService('remote');
  const dashboardPanelActions = getService('dashboardPanelActions');
  const PageObjects = getPageObjects(['dashboard']);

  describe('dashboard grid', () => {
    before(async () => {
      await PageObjects.dashboard.gotoDashboardLandingPage();
      await PageObjects.dashboard.loadSavedDashboard('few panels');
      await PageObjects.dashboard.switchToEditMode();
    });

    describe('move panel', () => {
      // Specific test after https://github.com/elastic/kibana/issues/14764 fix
      it('Can move panel from bottom to top row', async () => {
        const lastVisTitle = 'Rendering Test: datatable';
        const panelTitleBeforeMove = await dashboardPanelActions.getPanelHeading(lastVisTitle);
        const position1 = await panelTitleBeforeMove.getPosition();

        remote
          .moveMouseTo(panelTitleBeforeMove)
          .pressMouseButton()
          .moveMouseTo(null, -20, -450)
          .releaseMouseButton();

        const panelTitleAfterMove = await dashboardPanelActions.getPanelHeading(lastVisTitle);
        const position2 = await panelTitleAfterMove.getPosition();

        expect(position1.y).to.be.greaterThan(position2.y);
      });
    });
  });
}
