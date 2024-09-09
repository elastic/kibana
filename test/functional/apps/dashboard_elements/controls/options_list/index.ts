/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FtrProviderContext } from '../../../../ftr_provider_context';

export const OPTIONS_LIST_DASHBOARD_NAME = 'Test Options List Control';

export default function ({ loadTestFile, getService, getPageObjects }: FtrProviderContext) {
  const elasticChart = getService('elasticChart');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const security = getService('security');

  const { timePicker, dashboard } = getPageObjects(['timePicker', 'dashboard']);

  const setup = async () => {
    await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/dashboard/current/data');
    await kibanaServer.savedObjects.cleanStandardList();
    await kibanaServer.importExport.load(
      'test/functional/fixtures/kbn_archiver/dashboard/current/kibana'
    );
    await security.testUser.setRoles(['kibana_admin', 'test_logstash_reader', 'animals']);
    await kibanaServer.uiSettings.replace({
      defaultIndex: '0bf35f60-3dc9-11e8-8660-4d65aa086b3c',
    });

    await dashboard.navigateToApp();
    await dashboard.gotoDashboardLandingPage();
    await dashboard.clickNewDashboard();
    await timePicker.setDefaultDataRange();
    await elasticChart.setNewChartUiDebugFlag();
    await dashboard.saveDashboard(OPTIONS_LIST_DASHBOARD_NAME, {
      saveAsNew: true,
      exitFromEditMode: false,
      storeTimeWithDashboard: true,
    });
  };

  const teardown = async () => {
    await esArchiver.unload('test/functional/fixtures/es_archiver/dashboard/current/data');
    await security.testUser.restoreDefaults();
    await kibanaServer.savedObjects.cleanStandardList();
  };

  describe('Options list control', () => {
    before(setup);
    after(teardown);

    loadTestFile(require.resolve('./options_list_creation_and_editing'));
    loadTestFile(require.resolve('./options_list_dashboard_interaction'));
    loadTestFile(require.resolve('./options_list_suggestions'));
    loadTestFile(require.resolve('./options_list_validation'));

    loadTestFile(require.resolve('./options_list_allow_expensive_queries_off.ts'));
  });
}
