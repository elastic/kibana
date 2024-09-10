/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const pieChart = getService('pieChart');
  const queryBar = getService('queryBar');
  const retry = getService('retry');
  const security = getService('security');
  const PageObjects = getPageObjects(['common', 'dashboard', 'discover']);

  describe('dashboard query bar', () => {
    before(async () => {
      await security.testUser.setRoles(['kibana_admin', 'test_logstash_reader', 'animals']);
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.importExport.load(
        'test/functional/fixtures/kbn_archiver/dashboard/current/kibana'
      );
      await kibanaServer.uiSettings.replace({
        defaultIndex: '0bf35f60-3dc9-11e8-8660-4d65aa086b3c',
      });
      await PageObjects.dashboard.navigateToApp();
      await PageObjects.dashboard.preserveCrossAppState();
      await PageObjects.dashboard.loadSavedDashboard('dashboard with filter');
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await security.testUser.restoreDefaults();
    });

    it('causes panels to reload when refresh is clicked', async () => {
      await esArchiver.unload('test/functional/fixtures/es_archiver/dashboard/current/data');
      await queryBar.clickQuerySubmitButton();
      await retry.tryForTime(5000, async () => {
        const headers = await PageObjects.discover.getColumnHeaders();
        expect(headers.length).to.be(0);
        await pieChart.expectEmptyPieChart();
      });
    });
  });
}
