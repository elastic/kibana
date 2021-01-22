/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

export default function ({ getService, loadTestFile }) {
  const browser = getService('browser');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');

  describe('custom visualizations', function () {
    before(async () => {
      await esArchiver.loadIfNeeded('../functional/fixtures/es_archiver/logstash_functional');
      await esArchiver.loadIfNeeded('../functional/fixtures/es_archiver/visualize');
      await kibanaServer.uiSettings.replace({
        'dateFormat:tz': 'Australia/North',
        defaultIndex: 'logstash-*',
      });
      await browser.setWindowSize(1300, 900);
    });

    loadTestFile(require.resolve('./self_changing_vis'));
  });
}
