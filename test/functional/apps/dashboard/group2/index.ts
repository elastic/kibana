/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, loadTestFile }: FtrProviderContext) {
  const browser = getService('browser');
  const esArchiver = getService('esArchiver');

  async function loadCurrentData() {
    await browser.setWindowSize(1300, 900);
    await esArchiver.unload('test/functional/fixtures/es_archiver/logstash_functional');
    await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/dashboard/current/data');
  }

  async function unloadCurrentData() {
    await esArchiver.unload('test/functional/fixtures/es_archiver/dashboard/current/data');
  }

  describe('dashboard app - group 2', function () {
    before(loadCurrentData);
    after(unloadCurrentData);

    loadTestFile(require.resolve('./full_screen_mode'));
    loadTestFile(require.resolve('./dashboard_filter_bar'));
    loadTestFile(require.resolve('./dashboard_filtering'));
    loadTestFile(require.resolve('./panel_expand_toggle'));
    loadTestFile(require.resolve('./dashboard_grid'));
    loadTestFile(require.resolve('./view_edit'));
    loadTestFile(require.resolve('./dashboard_saved_query'));
    // Order of test suites *shouldn't* be important but there's a bug for the view_edit test above
    // https://github.com/elastic/kibana/issues/46752
    // The dashboard_snapshot test below requires the timestamped URL which breaks the view_edit test.
    // If we don't use the timestamp in the URL, the colors in the charts will be different.
    loadTestFile(require.resolve('./dashboard_snapshots'));
    loadTestFile(require.resolve('./embeddable_library'));
  });
}
