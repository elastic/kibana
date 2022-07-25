/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects, loadTestFile }: FtrProviderContext) {
  const browser = getService('browser');
  const esArchiver = getService('esArchiver');
  const PageObjects = getPageObjects(['common']);
  const kibanaServer = getService('kibanaServer');

  describe('context app', function () {
    before(async () => {
      await browser.setWindowSize(1200, 800);
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/visualize.json');
      await kibanaServer.uiSettings.replace({ defaultIndex: 'logstash-*' });
      await PageObjects.common.navigateToApp('discover');
    });

    after(async () => {
      await kibanaServer.importExport.unload(
        'test/functional/fixtures/kbn_archiver/visualize.json'
      );
    });

    loadTestFile(require.resolve('./_context_accessibility'));
    loadTestFile(require.resolve('./_context_navigation'));
    loadTestFile(require.resolve('./_discover_navigation'));
    loadTestFile(require.resolve('./classic/_discover_navigation'));
    loadTestFile(require.resolve('./_filters'));
    loadTestFile(require.resolve('./classic/_filters'));
    loadTestFile(require.resolve('./_size'));
    loadTestFile(require.resolve('./_date_nanos'));
    loadTestFile(require.resolve('./_date_nanos_custom_timestamp'));
  });
}
