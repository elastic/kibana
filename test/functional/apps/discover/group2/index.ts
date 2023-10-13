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

  describe('discover/group2', function () {
    before(async function () {
      await browser.setWindowSize(1600, 1200);
    });

    after(async function unloadMakelogs() {
      await esArchiver.unload('test/functional/fixtures/es_archiver/logstash_functional');
    });

    loadTestFile(require.resolve('./_data_grid'));
    loadTestFile(require.resolve('./_data_grid_context'));
    loadTestFile(require.resolve('./_data_grid_field_data'));
    loadTestFile(require.resolve('./_data_grid_doc_navigation'));
    loadTestFile(require.resolve('./_data_grid_row_navigation'));
    loadTestFile(require.resolve('./_data_grid_doc_table'));
    loadTestFile(require.resolve('./_data_grid_copy_to_clipboard'));
    loadTestFile(require.resolve('./_data_grid_row_height'));
    loadTestFile(require.resolve('./_data_grid_sample_size'));
    loadTestFile(require.resolve('./_data_grid_pagination'));
    loadTestFile(require.resolve('./_data_grid_footer'));
    loadTestFile(require.resolve('./_data_grid_field_tokens'));
  });
}
