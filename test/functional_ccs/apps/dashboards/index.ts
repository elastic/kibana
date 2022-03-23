/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, loadTestFile }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const remoteEsArchiver = getService('remoteEsArchiver');
  const browser = getService('browser');

  describe('dashboard app css', function () {
    this.tags('ciGroup6');

    before(async () => {
      await browser.setWindowSize(1300, 800);
      await esArchiver.unload('test/functional/fixtures/es_archiver/logstash_functional');
      await remoteEsArchiver.unload('test/functional/fixtures/es_archiver/logstash_functional');
      await remoteEsArchiver.loadIfNeeded(
        'test/functional/fixtures/es_archiver/dashboard/current/data'
      );
    });

    loadTestFile(require.resolve('./dashboard_filtering_ccs'));

    after(async () => {
      await remoteEsArchiver.unload('test/functional/fixtures/es_archiver/logstash_functional');
    });
  });
}
