/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, loadTestFile }: FtrProviderContext) {
  const browser = getService('browser');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');

  async function loadLogstash() {
    await browser.setWindowSize(1200, 900);
    await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
  }

  async function unloadLogstash() {
    await esArchiver.unload('test/functional/fixtures/es_archiver/logstash_functional');
    await kibanaServer.savedObjects.cleanStandardList();
  }

  describe('dashboard app - group 4', function () {
    before(loadLogstash);
    after(unloadLogstash);

    loadTestFile(require.resolve('./dashboard_empty'));
    loadTestFile(require.resolve('./dashboard_save'));
    loadTestFile(require.resolve('./dashboard_time'));
    loadTestFile(require.resolve('./dashboard_listing'));
    loadTestFile(require.resolve('./dashboard_clone'));
  });
}
