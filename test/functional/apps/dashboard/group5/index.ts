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
  }

  describe('dashboard app - group 5', function () {
    // TODO: Remove when vislib is removed
    // https://github.com/elastic/kibana/issues/56143
    describe('old charts library', function () {
      before(async () => {
        await loadLogstash();
        await kibanaServer.uiSettings.update({
          'visualization:visualize:legacyPieChartsLibrary': true,
        });
        await browser.refresh();
      });

      after(async () => {
        await unloadLogstash();
        await kibanaServer.uiSettings.update({
          'visualization:visualize:legacyPieChartsLibrary': false,
        });
        await browser.refresh();
      });

      loadTestFile(require.resolve('../group3/dashboard_state'));
    });
  });
}
