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

  describe('discover/group4', function () {
    before(async function () {
      await browser.setWindowSize(1600, 1200);
    });

    after(async function unloadMakelogs() {
      await esArchiver.unload('test/functional/fixtures/es_archiver/logstash_functional');
    });

    loadTestFile(require.resolve('./_discover_fields_api'));
    loadTestFile(require.resolve('./_adhoc_data_views'));
    loadTestFile(require.resolve('./_esql_view'));
    loadTestFile(require.resolve('./_date_nested'));
    loadTestFile(require.resolve('./_chart_hidden'));
    loadTestFile(require.resolve('./_context_encoded_url_params'));
    loadTestFile(require.resolve('./_data_view_edit'));
    loadTestFile(require.resolve('./_field_list_new_fields'));
  });
}
