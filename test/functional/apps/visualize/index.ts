/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { FtrProviderContext } from '../../ftr_provider_context.d';
import { UI_SETTINGS } from '../../../../src/plugins/data/common';

export default function ({ getService, loadTestFile }: FtrProviderContext) {
  const browser = getService('browser');
  const log = getService('log');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const deployment = getService('deployment');
  let isOss = true;

  describe('visualize app', () => {
    before(async () => {
      log.debug('Starting visualize before method');
      await browser.setWindowSize(1280, 800);
      await esArchiver.loadIfNeeded('logstash_functional');
      await esArchiver.loadIfNeeded('long_window_logstash');
      await esArchiver.load('visualize');
      await kibanaServer.uiSettings.replace({
        defaultIndex: 'logstash-*',
        [UI_SETTINGS.FORMAT_BYTES_DEFAULT_PATTERN]: '0,0.[000]b',
      });
      isOss = await deployment.isOss();
    });

    // TODO: Remove when vislib is removed
    describe('new charts library', function () {
      this.tags('ciGroup7');

      before(async () => {
        await kibanaServer.uiSettings.update({
          'visualization:visualize:legacyChartsLibrary': false,
        });
        await browser.refresh();
      });

      after(async () => {
        await kibanaServer.uiSettings.update({
          'visualization:visualize:legacyChartsLibrary': true,
        });
        await browser.refresh();
      });

      // Test replaced vislib chart types
      loadTestFile(require.resolve('./_area_chart'));
      loadTestFile(require.resolve('./_line_chart_split_series'));
      loadTestFile(require.resolve('./_point_series_options'));
      loadTestFile(require.resolve('./_vertical_bar_chart'));
      loadTestFile(require.resolve('./_vertical_bar_chart_nontimeindex'));

      // Test non-replaced vislib chart types
      loadTestFile(require.resolve('./_gauge_chart'));
      loadTestFile(require.resolve('./_heatmap_chart'));
      loadTestFile(require.resolve('./_pie_chart'));
    });

    describe('', function () {
      this.tags('ciGroup9');

      loadTestFile(require.resolve('./_embedding_chart'));
      loadTestFile(require.resolve('./_chart_types'));
      loadTestFile(require.resolve('./_area_chart'));
      loadTestFile(require.resolve('./_data_table'));
      loadTestFile(require.resolve('./_data_table_nontimeindex'));
      loadTestFile(require.resolve('./_data_table_notimeindex_filters'));
    });

    describe('', function () {
      this.tags('ciGroup10');

      loadTestFile(require.resolve('./_inspector'));
      loadTestFile(require.resolve('./_experimental_vis'));
      loadTestFile(require.resolve('./_gauge_chart'));
      loadTestFile(require.resolve('./_heatmap_chart'));
      loadTestFile(require.resolve('./input_control_vis'));
      loadTestFile(require.resolve('./_histogram_request_start'));
      loadTestFile(require.resolve('./_metric_chart'));
    });

    describe('', function () {
      this.tags('ciGroup4');

      loadTestFile(require.resolve('./_line_chart_split_series'));
      loadTestFile(require.resolve('./_line_chart_split_chart'));
      loadTestFile(require.resolve('./_pie_chart'));
      loadTestFile(require.resolve('./_point_series_options'));
      loadTestFile(require.resolve('./_markdown_vis'));
      loadTestFile(require.resolve('./_shared_item'));
      loadTestFile(require.resolve('./_lab_mode'));
      loadTestFile(require.resolve('./_linked_saved_searches'));
      loadTestFile(require.resolve('./_visualize_listing'));

      if (isOss) {
        loadTestFile(require.resolve('./_tile_map'));
        loadTestFile(require.resolve('./_region_map'));
      }
    });

    describe('', function () {
      this.tags('ciGroup12');

      loadTestFile(require.resolve('./_tag_cloud'));
      loadTestFile(require.resolve('./_vertical_bar_chart'));
      loadTestFile(require.resolve('./_vertical_bar_chart_nontimeindex'));
      loadTestFile(require.resolve('./_tsvb_chart'));
      loadTestFile(require.resolve('./_tsvb_time_series'));
      loadTestFile(require.resolve('./_tsvb_markdown'));
      loadTestFile(require.resolve('./_tsvb_table'));
      loadTestFile(require.resolve('./_vega_chart'));
    });
  });
}
