/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FtrProviderContext } from '../../../../ftr_provider_context';

export const OPTIONS_LIST_DASHBOARD_NAME = 'Test Options List Control';

export default function ({ loadTestFile, getService, getPageObjects }: FtrProviderContext) {
  const elasticChart = getService('elasticChart');
  const security = getService('security');

  const { timePicker, dashboard } = getPageObjects([
    'dashboardControls',
    'timePicker',
    'dashboard',
    'common',
  ]);

  async function setup() {
    await security.testUser.setRoles(['kibana_admin', 'test_logstash_reader', 'animals']);

    await dashboard.gotoDashboardLandingPage();
    await dashboard.clickNewDashboard();
    await timePicker.setDefaultDataRange();
    await elasticChart.setNewChartUiDebugFlag();
    await dashboard.saveDashboard(OPTIONS_LIST_DASHBOARD_NAME, {
      exitFromEditMode: false,
      storeTimeWithDashboard: true,
    });
  }

  async function teardown() {
    await security.testUser.restoreDefaults();
  }

  describe('Options list control', function () {
    before(setup);
    after(teardown);

    loadTestFile(require.resolve('./options_list_creation_and_editing'));
    loadTestFile(require.resolve('./options_list_dashboard_interaction'));
    loadTestFile(require.resolve('./options_list_suggestions'));
    loadTestFile(require.resolve('./options_list_validation'));
  });
}
