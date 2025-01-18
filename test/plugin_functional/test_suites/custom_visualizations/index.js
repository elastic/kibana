/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export default function ({ getService, loadTestFile }) {
  const browser = getService('browser');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');

  describe('custom visualizations', function () {
    before(async () => {
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/visualize.json');
      await kibanaServer.uiSettings.replace({
        'dateFormat:tz': 'Australia/North',
        defaultIndex: 'logstash-*',
      });
      await browser.setWindowSize(1300, 900);
    });

    after(async () => {
      await kibanaServer.importExport.unload(
        'test/functional/fixtures/kbn_archiver/visualize.json'
      );
    });

    loadTestFile(require.resolve('./self_changing_vis'));
  });
}
