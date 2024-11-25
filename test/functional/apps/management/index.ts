/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, loadTestFile }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');

  describe('management', function () {
    before(async () => {
      await esArchiver.unload('test/functional/fixtures/es_archiver/logstash_functional');
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/makelogs');
    });

    after(async () => {
      await esArchiver.unload('test/functional/fixtures/es_archiver/makelogs');
    });

    loadTestFile(require.resolve('./data_views/_create_index_pattern_wizard'));
    loadTestFile(require.resolve('./data_views/_data_view_create_delete'));
    loadTestFile(require.resolve('./data_views/_index_pattern_results_sort'));
    loadTestFile(require.resolve('./data_views/_index_pattern_popularity'));
    loadTestFile(require.resolve('./_kibana_settings'));
    loadTestFile(require.resolve('./data_views/_scripted_fields_preview'));
    loadTestFile(require.resolve('./_mgmt_import_saved_objects'));
    loadTestFile(require.resolve('./data_views/_index_patterns_empty'));
    loadTestFile(require.resolve('./data_views/_scripted_fields'));
    loadTestFile(require.resolve('./data_views/_scripted_fields_classic_table'));
    loadTestFile(require.resolve('./data_views/_runtime_fields'));
    loadTestFile(require.resolve('./data_views/_runtime_fields_composite'));
    loadTestFile(require.resolve('./data_views/_field_formatter'));
    loadTestFile(require.resolve('./data_views/_legacy_url_redirect'));
    loadTestFile(require.resolve('./data_views/_exclude_index_pattern'));
    loadTestFile(require.resolve('./data_views/_index_pattern_filter'));
    loadTestFile(require.resolve('./data_views/_try_esql'));
    loadTestFile(require.resolve('./data_views/_scripted_fields_filter'));
    loadTestFile(require.resolve('./_import_objects'));
    loadTestFile(require.resolve('./data_views/_test_huge_fields'));
    loadTestFile(require.resolve('./data_views/_handle_alias'));
    loadTestFile(require.resolve('./data_views/_handle_version_conflict'));
    loadTestFile(require.resolve('./data_views/_handle_not_found'));
    loadTestFile(require.resolve('./data_views/_data_view_relationships'));
    loadTestFile(require.resolve('./data_views/_edit_field'));
    loadTestFile(require.resolve('./_files'));
    loadTestFile(require.resolve('./_data_view_field_filters'));
    loadTestFile(require.resolve('./data_views/_cache'));
  });
}
