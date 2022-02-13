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

  describe('management', function () {
    before(async () => {
      await esArchiver.unload('test/functional/fixtures/es_archiver/logstash_functional');
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/makelogs');
    });

    after(async () => {
      await esArchiver.unload('test/functional/fixtures/es_archiver/makelogs');
    });

    describe('', function () {
      this.tags('ciGroup9');

      loadTestFile(require.resolve('./_create_index_pattern_wizard'));
      loadTestFile(require.resolve('./_index_pattern_create_delete'));
      loadTestFile(require.resolve('./_index_pattern_results_sort'));
      loadTestFile(require.resolve('./_index_pattern_popularity'));
      loadTestFile(require.resolve('./_kibana_settings'));
      loadTestFile(require.resolve('./_scripted_fields_preview'));
      loadTestFile(require.resolve('./_mgmt_import_saved_objects'));
      loadTestFile(require.resolve('./_index_patterns_empty'));
      loadTestFile(require.resolve('./_scripted_fields'));
      loadTestFile(require.resolve('./_runtime_fields'));
      loadTestFile(require.resolve('./_field_formatter'));
      loadTestFile(require.resolve('./_legacy_url_redirect'));
      loadTestFile(require.resolve('./_exclude_index_pattern'));
    });

    describe('', function () {
      this.tags('ciGroup8');

      loadTestFile(require.resolve('./_index_pattern_filter'));
      loadTestFile(require.resolve('./_scripted_fields_filter'));
      loadTestFile(require.resolve('./_import_objects'));
      loadTestFile(require.resolve('./_test_huge_fields'));
      loadTestFile(require.resolve('./_handle_alias'));
      loadTestFile(require.resolve('./_handle_version_conflict'));
    });
  });
}
