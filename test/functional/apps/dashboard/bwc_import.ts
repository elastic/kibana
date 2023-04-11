/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import path from 'path';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['dashboard', 'header', 'settings', 'savedObjects', 'common']);
  const dashboardExpect = getService('dashboardExpect');

  describe('bwc import', function describeIndexTests() {
    before(async function () {
      await PageObjects.dashboard.initTests();
      await PageObjects.settings.navigateTo();
      await PageObjects.settings.clickKibanaSavedObjects();
      await PageObjects.savedObjects.importFile(
        path.join(__dirname, 'exports', 'dashboard_6_0_1.json')
      );
      await PageObjects.settings.associateIndexPattern(
        'dd684000-8255-11eb-a5e7-93c302c8f329',
        'logstash-*'
      );
      await PageObjects.savedObjects.clickConfirmChanges();
      await PageObjects.savedObjects.clickImportDone();
      await PageObjects.common.navigateToApp('dashboard');
    });

    describe('6.0.1 dashboard', () => {
      it('loads an imported dashboard', async function () {
        await PageObjects.dashboard.gotoDashboardLandingPage();
        await PageObjects.dashboard.loadSavedDashboard('My custom bwc dashboard');
        await PageObjects.header.waitUntilLoadingHasFinished();

        await dashboardExpect.metricValuesExist(['14,004']);
      });
    });
  });
}
