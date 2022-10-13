/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, loadTestFile }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const browser = getService('browser');

  describe('discover/ccs_compatible', function () {
    before(async function () {
      await browser.setWindowSize(1300, 800);
    });

    after(async function unloadMakelogs() {
      await esArchiver.unload('test/functional/fixtures/es_archiver/logstash_functional');
    });

    loadTestFile(require.resolve('./_data_view_editor'));
    loadTestFile(require.resolve('./_saved_queries'));
  });
}
