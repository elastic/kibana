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

  describe('discover/group1', function () {
    before(async function () {
      await browser.setWindowSize(1300, 800);
    });

    after(async function unloadMakelogs() {
      await esArchiver.unload('test/functional/fixtures/es_archiver/logstash_functional');
    });

    loadTestFile(require.resolve('./_no_data'));
    loadTestFile(require.resolve('./_discover'));
    loadTestFile(require.resolve('./_discover_accessibility'));
    loadTestFile(require.resolve('./_discover_histogram_breakdown'));
    loadTestFile(require.resolve('./_discover_histogram'));
    loadTestFile(require.resolve('./_doc_accessibility'));
    loadTestFile(require.resolve('./_filter_editor'));
    loadTestFile(require.resolve('./_errors'));
    loadTestFile(require.resolve('./_field_data'));
    loadTestFile(require.resolve('./_field_data_with_fields_api'));
    loadTestFile(require.resolve('./_shared_links'));
    loadTestFile(require.resolve('./_sidebar'));
    loadTestFile(require.resolve('./_source_filters'));
    loadTestFile(require.resolve('./_large_string'));
    loadTestFile(require.resolve('./_greeting_screen'));
    loadTestFile(require.resolve('./_inspector'));
    loadTestFile(require.resolve('./_date_nanos'));
    loadTestFile(require.resolve('./_date_nanos_mixed'));
  });
}
