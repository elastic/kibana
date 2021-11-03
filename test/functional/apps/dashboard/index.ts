/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, loadTestFile }: FtrProviderContext) {
  const browser = getService('browser');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');

  async function loadCurrentData() {
    await browser.setWindowSize(1300, 900);
    await esArchiver.unload('test/functional/fixtures/es_archiver/logstash_functional');
    await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/dashboard/current/data');
  }

  async function unloadCurrentData() {
    await esArchiver.unload('test/functional/fixtures/es_archiver/dashboard/current/data');
  }

  async function loadLogstash() {
    await browser.setWindowSize(1200, 900);
    await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
  }

  async function unloadLogstash() {
    await esArchiver.unload('test/functional/fixtures/es_archiver/logstash_functional');
  }

  describe('dashboard app', function () {
    // This has to be first since the other tests create some embeddables as side affects and our counting assumes
    // a fresh index.
    describe('using current data', function () {
      this.tags('ciGroup2');
      before(loadCurrentData);
      after(unloadCurrentData);

      loadTestFile(require.resolve('./empty_dashboard'));
      loadTestFile(require.resolve('./url_field_formatter'));
      loadTestFile(require.resolve('./embeddable_rendering'));
      loadTestFile(require.resolve('./embeddable_data_grid'));
      loadTestFile(require.resolve('./create_and_add_embeddables'));
      loadTestFile(require.resolve('./edit_embeddable_redirects'));
      loadTestFile(require.resolve('./dashboard_unsaved_state'));
      loadTestFile(require.resolve('./dashboard_unsaved_listing'));
      loadTestFile(require.resolve('./edit_visualizations'));
      loadTestFile(require.resolve('./dashboard_options'));
      loadTestFile(require.resolve('./data_shared_attributes'));
      loadTestFile(require.resolve('./share'));
      loadTestFile(require.resolve('./embed_mode'));
      loadTestFile(require.resolve('./dashboard_back_button'));
      loadTestFile(require.resolve('./dashboard_error_handling'));
      loadTestFile(require.resolve('./legacy_urls'));
      loadTestFile(require.resolve('./saved_search_embeddable'));

      // Note: This one must be last because it unloads some data for one of its tests!
      // No, this isn't ideal, but loading/unloading takes so much time and these are all bunched
      // to improve efficiency...
      loadTestFile(require.resolve('./dashboard_query_bar'));
    });

    describe('using current data', function () {
      this.tags('ciGroup3');
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

    // Each of these tests call initTests themselves, the way it was originally written.  The above tests only load
    // the data once to save on time. Eventually, all of these tests should just use current data and we can reserve
    // legacy data only for specifically testing BWC situations.
    describe('using legacy data', function () {
      this.tags('ciGroup4');
      before(loadLogstash);
      after(unloadLogstash);

      loadTestFile(require.resolve('./dashboard_time_picker'));
      loadTestFile(require.resolve('./bwc_shared_urls'));
      loadTestFile(require.resolve('./panel_replacing'));
      loadTestFile(require.resolve('./panel_cloning'));
      loadTestFile(require.resolve('./copy_panel_to'));
      loadTestFile(require.resolve('./panel_context_menu'));
      loadTestFile(require.resolve('./dashboard_state'));
    });

    describe('using legacy data', function () {
      this.tags('ciGroup5');
      before(loadLogstash);
      after(unloadLogstash);

      loadTestFile(require.resolve('./dashboard_save'));
      loadTestFile(require.resolve('./dashboard_time'));
      loadTestFile(require.resolve('./dashboard_listing'));
      loadTestFile(require.resolve('./dashboard_clone'));
    });

    // TODO: Remove when vislib is removed
    // https://github.com/elastic/kibana/issues/56143
    describe('new charts library', function () {
      this.tags('ciGroup6');

      before(async () => {
        await loadLogstash();
        await kibanaServer.uiSettings.update({
          'visualization:visualize:legacyPieChartsLibrary': false,
        });
        await browser.refresh();
      });

      after(async () => {
        await unloadLogstash();
        await kibanaServer.uiSettings.update({
          'visualization:visualize:legacyPieChartsLibrary': true,
        });
        await browser.refresh();
      });

      loadTestFile(require.resolve('./dashboard_state'));
    });
  });
}
