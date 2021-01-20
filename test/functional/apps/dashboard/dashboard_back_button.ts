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
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const PageObjects = getPageObjects(['dashboard', 'header', 'common', 'visualize', 'timePicker']);
  const browser = getService('browser');

  describe('dashboard back button', () => {
    before(async () => {
      await esArchiver.loadIfNeeded('dashboard/current/kibana');
      await kibanaServer.uiSettings.replace({
        defaultIndex: '0bf35f60-3dc9-11e8-8660-4d65aa086b3c',
      });
      await PageObjects.common.navigateToApp('dashboard');
      await PageObjects.dashboard.preserveCrossAppState();
    });

    it('after navigation from listing page to dashboard back button works', async () => {
      await PageObjects.dashboard.gotoDashboardLandingPage();
      await PageObjects.dashboard.loadSavedDashboard('dashboard with everything');
      await PageObjects.dashboard.waitForRenderComplete();
      await browser.goBack();
      expect(await PageObjects.dashboard.onDashboardLandingPage()).to.be(true);
    });
  });
}
