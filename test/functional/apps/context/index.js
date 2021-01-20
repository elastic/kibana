/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

export default function ({ getService, getPageObjects, loadTestFile }) {
  const browser = getService('browser');
  const esArchiver = getService('esArchiver');
  const PageObjects = getPageObjects(['common']);
  const kibanaServer = getService('kibanaServer');

  describe('context app', function () {
    this.tags('ciGroup1');

    before(async function () {
      await browser.setWindowSize(1200, 800);
      await esArchiver.loadIfNeeded('logstash_functional');
      await esArchiver.load('visualize');
      await kibanaServer.uiSettings.replace({ defaultIndex: 'logstash-*' });
      await PageObjects.common.navigateToApp('discover');
    });

    after(function unloadMakelogs() {
      return esArchiver.unload('logstash_functional');
    });

    loadTestFile(require.resolve('./_context_navigation'));
    loadTestFile(require.resolve('./_discover_navigation'));
    loadTestFile(require.resolve('./_filters'));
    loadTestFile(require.resolve('./_size'));
    loadTestFile(require.resolve('./_date_nanos'));
    loadTestFile(require.resolve('./_date_nanos_custom_timestamp'));
  });
}
