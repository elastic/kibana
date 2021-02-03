/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const retry = getService('retry');
  const browser = getService('browser');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const dashboardPanelActions = getService('dashboardPanelActions');
  const PageObjects = getPageObjects(['dashboard', 'visualize', 'header', 'common']);

  describe('expanding a panel', () => {
    before(async () => {
      await esArchiver.load('dashboard/current/kibana');
      await kibanaServer.uiSettings.replace({
        defaultIndex: '0bf35f60-3dc9-11e8-8660-4d65aa086b3c',
      });
      await PageObjects.common.navigateToApp('dashboard');
      await PageObjects.dashboard.preserveCrossAppState();
      await PageObjects.dashboard.loadSavedDashboard('few panels');
    });

    it('hides other panels', async () => {
      await dashboardPanelActions.openContextMenu();
      await dashboardPanelActions.clickExpandPanelToggle();
      await retry.try(async () => {
        const panelCount = await PageObjects.dashboard.getPanelCount();
        expect(panelCount).to.eql(1);
      });
    });

    it('shows other panels after being minimized', async () => {
      const panelCount = await PageObjects.dashboard.getPanelCount();
      // Panels are all minimized on a fresh open of a dashboard, so we need to re-expand in order to then minimize.
      await dashboardPanelActions.openContextMenu();
      await dashboardPanelActions.clickExpandPanelToggle();
      await dashboardPanelActions.openContextMenu();
      await dashboardPanelActions.clickExpandPanelToggle();

      // Add a retry to fix https://github.com/elastic/kibana/issues/14574.  Perhaps the recent changes to this
      // being a CSS update is causing the UI to change slower than grabbing the panels?
      await retry.try(async () => {
        const panelCountAfterMaxThenMinimize = await PageObjects.dashboard.getPanelCount();
        expect(panelCountAfterMaxThenMinimize).to.be(panelCount);
      });
    });

    it('minimizes using the browser back button', async () => {
      const panelCount = await PageObjects.dashboard.getPanelCount();

      await dashboardPanelActions.openContextMenu();
      await dashboardPanelActions.clickExpandPanelToggle();

      await browser.goBack();
      await retry.try(async () => {
        const panelCountAfterMaxThenMinimize = await PageObjects.dashboard.getPanelCount();
        expect(panelCountAfterMaxThenMinimize).to.be(panelCount);
      });
    });
  });
}
