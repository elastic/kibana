/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, loadTestFile }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const browser = getService('browser');

  describe('discover/group7', function () {
    before(async function () {
      await browser.setWindowSize(1600, 1200);
    });

    after(async function unloadMakelogs() {
      await esArchiver.unload('test/functional/fixtures/es_archiver/logstash_functional');
    });

    loadTestFile(require.resolve('./_indexpattern_without_timefield'));
    loadTestFile(require.resolve('./_indexpattern_with_unmapped_fields'));
    loadTestFile(require.resolve('./_runtime_fields_editor'));
    loadTestFile(require.resolve('./_huge_fields'));
    loadTestFile(require.resolve('./_search_on_page_load'));
    loadTestFile(require.resolve('./_request_cancellation'));
    loadTestFile(require.resolve('./_new_search'));
  });
}
