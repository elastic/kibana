/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import path from 'path';

export const KIBANA_ARCHIVE_PATH = path.resolve(
  __dirname,
  '../../../functional/fixtures/es_archiver/dashboard/current/kibana'
);
export const DATA_ARCHIVE_PATH = path.resolve(
  __dirname,
  '../../../functional/fixtures/es_archiver/dashboard/current/data'
);

export default function ({ getService, getPageObjects, loadTestFile }) {
  const browser = getService('browser');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const PageObjects = getPageObjects(['common', 'dashboard']);

  describe('pluggable panel actions', function () {
    before(async () => {
      await browser.setWindowSize(1300, 900);
      await esArchiver.load(KIBANA_ARCHIVE_PATH);
      await esArchiver.loadIfNeeded(DATA_ARCHIVE_PATH);
      await kibanaServer.uiSettings.replace({
        defaultIndex: 'logstash-*',
      });
      await PageObjects.common.navigateToApp('dashboard');
      await PageObjects.dashboard.preserveCrossAppState();
    });

    after(async function () {
      await PageObjects.dashboard.clearSavedObjectsFromAppLinks();
      await esArchiver.unload(KIBANA_ARCHIVE_PATH);
      await esArchiver.unload(DATA_ARCHIVE_PATH);
    });

    loadTestFile(require.resolve('./panel_actions'));
  });
}
