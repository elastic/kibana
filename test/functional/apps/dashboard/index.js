/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

export default function ({ getService, loadTestFile }) {
  const browser = getService('browser');
  const esArchiver = getService('esArchiver');

  async function loadCurrentData() {
    await browser.setWindowSize(1300, 900);
    await esArchiver.unload('logstash_functional');
    await esArchiver.loadIfNeeded('dashboard/current/data');
  }

  async function unloadCurrentData() {
    await esArchiver.unload('dashboard/current/data');
  }

  async function loadLogstash() {
    await browser.setWindowSize(1200, 900);
    await esArchiver.loadIfNeeded('logstash_functional');
  }

  async function unloadLogstash() {
    await esArchiver.unload('logstash_functional');
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
      loadTestFile(require.resolve('./create_and_add_embeddables'));
      loadTestFile(require.resolve('./edit_embeddable_redirects'));
      loadTestFile(require.resolve('./time_zones'));
      loadTestFile(require.resolve('./dashboard_options'));
      loadTestFile(require.resolve('./data_shared_attributes'));
      loadTestFile(require.resolve('./embed_mode'));
      loadTestFile(require.resolve('./dashboard_back_button'));
      loadTestFile(require.resolve('./dashboard_error_handling'));
      loadTestFile(require.resolve('./legacy_urls'));

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
      loadTestFile(require.resolve('./panel_controls'));
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
  });
}
