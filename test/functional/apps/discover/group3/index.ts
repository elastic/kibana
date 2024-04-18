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

  describe('discover/group3', function () {
    before(async function () {
      await browser.setWindowSize(1300, 800);
    });

    after(async function unloadMakelogs() {
      await esArchiver.unload('test/functional/fixtures/es_archiver/logstash_functional');
    });

    loadTestFile(require.resolve('./_default_columns'));
    loadTestFile(require.resolve('./_time_field_column'));
    loadTestFile(require.resolve('./_drag_drop'));
    loadTestFile(require.resolve('./_sidebar'));
    loadTestFile(require.resolve('./_sidebar_field_stats'));
    loadTestFile(require.resolve('./_request_counts'));
    loadTestFile(require.resolve('./_doc_viewer'));
    loadTestFile(require.resolve('./_view_mode_toggle'));
    loadTestFile(require.resolve('./_unsaved_changes_badge'));
    loadTestFile(require.resolve('./_panels_toggle'));
    loadTestFile(require.resolve('./_lens_vis'));
  });
}
