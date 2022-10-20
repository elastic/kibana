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
  const log = getService('log');
  const PageObjects = getPageObjects(['common', 'dashboard']);

  describe('pluggable panel actions', function () {
    before(async () => {
      log.info(`setting window size: ${[1300, 900]}`);
      await browser.setWindowSize(1300, 900);
      log.info(`loading dashboard saved objects`);
      await esArchiver.load('test/functional/fixtures/es_archiver/dashboard/current/kibana');
      log.info(`loading dashboard data`);
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/dashboard/current/data');
      log.info(`setting default index`);
      await kibanaServer.uiSettings.replace({
        defaultIndex: 'logstash-*',
      });
      log.info(`navigating to dashboard`);
      await PageObjects.common.navigateToApp('dashboard');
      log.info(`calling preserveCrossAppState`);
      await PageObjects.dashboard.preserveCrossAppState();
    });

    after(async function () {
      await PageObjects.dashboard.clearSavedObjectsFromAppLinks();
      await esArchiver.unload('test/functional/fixtures/es_archiver/dashboard/current/kibana');
      await esArchiver.unload('test/functional/fixtures/es_archiver/dashboard/current/data');
    });

    loadTestFile(require.resolve('./panel_actions'));
  });
}
