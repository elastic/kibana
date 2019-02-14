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

export default function ({ getService, loadTestFile, getPageObjects }) {
  const browser = getService('browser');
  const esArchiver = getService('esArchiver');
  const PageObjects = getPageObjects(['dashboard']);

  async function loadCurrentData() {
    await browser.setWindowSize(1300, 900);
    await PageObjects.dashboard.initTests({
      kibanaIndex: 'dashboard/current/kibana',
      dataIndex: 'dashboard/current/data',
      defaultIndex: 'logstash-*',
    });
    await PageObjects.dashboard.preserveCrossAppState();
  }

  async function unloadCurrentData() {
    await PageObjects.dashboard.clearSavedObjectsFromAppLinks();
    await esArchiver.unload('dashboard/current/kibana');
    await esArchiver.unload('dashboard/current/data');
  }

  describe('dashboard app', function () {
    // This has to be first since the other tests create some embeddables as side affects and our counting assumes
    // a fresh index.
    describe('using current data', function () {
      this.tags('ciGroup2');
      before(loadCurrentData);
      after(unloadCurrentData);

      loadTestFile(require.resolve('./_empty_dashboard'));
      loadTestFile(require.resolve('./_embeddable_rendering'));
      loadTestFile(require.resolve('./_create_and_add_embeddables'));
      loadTestFile(require.resolve('./_time_zones'));
      loadTestFile(require.resolve('./_dashboard_options'));
      loadTestFile(require.resolve('./_data_shared_attributes'));
      loadTestFile(require.resolve('./_embed_mode'));

      // Note: This one must be last because it unloads some data for one of its tests!
      // No, this isn't ideal, but loading/unloading takes so much time and these are all bunched
      // to improve efficiency...
      loadTestFile(require.resolve('./_dashboard_query_bar'));
    });

    describe('using current data', function () {
      this.tags('ciGroup3');
      before(loadCurrentData);
      after(unloadCurrentData);

      loadTestFile(require.resolve('./_full_screen_mode'));
      loadTestFile(require.resolve('./_dashboard_filter_bar'));
      loadTestFile(require.resolve('./_dashboard_filtering'));
      loadTestFile(require.resolve('./_panel_expand_toggle'));
      loadTestFile(require.resolve('./_dashboard_grid'));
      loadTestFile(require.resolve('./_dashboard_snapshots'));
      loadTestFile(require.resolve('./_view_edit'));
    });

    // Each of these tests call initTests themselves, the way it was originally written.  The above tests only load
    // the data once to save on time. Eventually, all of these tests should just use current data and we can reserve
    // legacy data only for specifically testing BWC situations.
    describe('using legacy data', function () {
      this.tags('ciGroup4');
      before(() => browser.setWindowSize(1200, 900));

      loadTestFile(require.resolve('./_dashboard_time_picker'));
      loadTestFile(require.resolve('./_bwc_shared_urls'));
      loadTestFile(require.resolve('./_panel_controls'));
      loadTestFile(require.resolve('./_dashboard_state'));
    });

    describe('using legacy data', function () {
      this.tags('ciGroup5');
      before(() => browser.setWindowSize(1200, 900));

      loadTestFile(require.resolve('./_dashboard_save'));
      loadTestFile(require.resolve('./_dashboard_time'));
      loadTestFile(require.resolve('./_dashboard_listing'));
      loadTestFile(require.resolve('./_dashboard_clone'));
    });
  });
}
