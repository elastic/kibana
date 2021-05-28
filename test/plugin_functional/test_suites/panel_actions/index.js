/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export default function ({ getService, getPageObjects, loadTestFile }) {
  const browser = getService('browser');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const PageObjects = getPageObjects(['common', 'dashboard']);

  describe('pluggable panel actions', function () {
    before(async () => {
      await browser.setWindowSize(1300, 900);
      await kibanaServer.importExport.load('dashboard/current/kibana');
      await esArchiver.loadIfNeeded('dashboard/current/data');
      await kibanaServer.uiSettings.replace({
        defaultIndex: 'logstash-*',
      });
      await PageObjects.common.navigateToApp('dashboard');
      await PageObjects.dashboard.preserveCrossAppState();
    });

    after(async function () {
      await PageObjects.dashboard.clearSavedObjectsFromAppLinks();
      await kibanaServer.importExport.unload('dashboard/current/kibana');
      await esArchiver.unload('dashboard/current/data');
    });

    loadTestFile(require.resolve('./panel_actions'));
  });
}
