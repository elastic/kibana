/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ loadTestFile, getService, getPageObjects }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const security = getService('security');

  const { dashboardControls, common, dashboard } = getPageObjects([
    'dashboardControls',
    'dashboard',
    'common',
  ]);

  async function setup() {
    await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/dashboard/current/data');
    await kibanaServer.savedObjects.cleanStandardList();
    await kibanaServer.importExport.load(
      'test/functional/fixtures/kbn_archiver/dashboard/current/kibana'
    );
    await security.testUser.setRoles(['kibana_admin', 'test_logstash_reader', 'animals']);
    await kibanaServer.uiSettings.replace({
      defaultIndex: '0bf35f60-3dc9-11e8-8660-4d65aa086b3c',
    });

    // enable the controls lab and navigate to the dashboard listing page to start
    await common.navigateToApp('dashboard');
    await dashboardControls.enableControlsLab();
    await common.navigateToApp('dashboard');
    await dashboard.preserveCrossAppState();
  }

  async function teardown() {
    await esArchiver.unload('test/functional/fixtures/es_archiver/dashboard/current/data');
    await security.testUser.restoreDefaults();
    await kibanaServer.savedObjects.cleanStandardList();
  }

  describe('Controls', function () {
    before(setup);
    after(teardown);
    loadTestFile(require.resolve('./controls_callout'));
    loadTestFile(require.resolve('./control_group_settings'));
    loadTestFile(require.resolve('./options_list'));
    loadTestFile(require.resolve('./control_group_chaining'));
  });
}
