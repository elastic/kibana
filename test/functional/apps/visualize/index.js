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
  const log = getService('log');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');


  describe('visualize app', function () {
    before(async ()=> {
      log.debug('Starting visualize before method');
      browser.setWindowSize(1280, 800);
      await esArchiver.loadIfNeeded('logstash_functional');
      await esArchiver.load('visualize');
      await kibanaServer.uiSettings.replace({ 'defaultIndex': 'logstash-*' });
    });

    describe('', function () {
      this.tags('ciGroup9');

      loadTestFile(require.resolve('./_embedding_chart'));
      loadTestFile(require.resolve('./_chart_types'));
      loadTestFile(require.resolve('./_area_chart'));
      loadTestFile(require.resolve('./_data_table'));
      loadTestFile(require.resolve('./_data_table_nontimeindex'));
    });

    describe('', function () {
      this.tags('ciGroup10');

      loadTestFile(require.resolve('./_inspector'));
      loadTestFile(require.resolve('./_experimental_vis'));
      loadTestFile(require.resolve('./_gauge_chart'));
      loadTestFile(require.resolve('./_heatmap_chart'));
      loadTestFile(require.resolve('./_input_control_vis'));
      loadTestFile(require.resolve('./_histogram_request_start'));
    });

    describe('', function () {
      this.tags('ciGroup11');

      loadTestFile(require.resolve('./_line_chart'));
      loadTestFile(require.resolve('./_pie_chart'));
      loadTestFile(require.resolve('./_region_map'));
      loadTestFile(require.resolve('./_point_series_options'));
      loadTestFile(require.resolve('./_markdown_vis'));
      loadTestFile(require.resolve('./_shared_item'));
      loadTestFile(require.resolve('./_lab_mode'));
      loadTestFile(require.resolve('./_linked_saved_searches'));
      loadTestFile(require.resolve('./_visualize_listing'));
    });

    describe('', function () {
      this.tags('ciGroup12');

      loadTestFile(require.resolve('./_tag_cloud'));
      loadTestFile(require.resolve('./_tile_map'));
      loadTestFile(require.resolve('./_vertical_bar_chart'));
      loadTestFile(require.resolve('./_vertical_bar_chart_nontimeindex'));
      loadTestFile(require.resolve('./_tsvb_chart'));
      loadTestFile(require.resolve('./_vega_chart'));
    });
  });
}
