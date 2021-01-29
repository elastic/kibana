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
  const pieChart = getService('pieChart');
  const queryBar = getService('queryBar');
  const retry = getService('retry');
  const PageObjects = getPageObjects(['common', 'dashboard', 'discover']);

  describe('dashboard query bar', () => {
    before(async () => {
      await esArchiver.load('dashboard/current/kibana');
      await kibanaServer.uiSettings.replace({
        defaultIndex: '0bf35f60-3dc9-11e8-8660-4d65aa086b3c',
      });
      await PageObjects.common.navigateToApp('dashboard');
      await PageObjects.dashboard.preserveCrossAppState();
      await PageObjects.dashboard.loadSavedDashboard('dashboard with filter');
    });

    it('causes panels to reload when refresh is clicked', async () => {
      await esArchiver.unload('dashboard/current/data');

      await queryBar.clickQuerySubmitButton();
      await retry.tryForTime(5000, async () => {
        const headers = await PageObjects.discover.getColumnHeaders();
        expect(headers.length).to.be(0);
        await pieChart.expectPieSliceCount(0);
      });
    });
  });
}
