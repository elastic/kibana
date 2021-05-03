/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FtrProviderContext } from '../../ftr_provider_context.d';

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
      await esArchiver.load('empty_kibana');

      await esArchiver.loadIfNeeded('logstash_functional');
      await esArchiver.loadIfNeeded('long_window_logstash');

      isOss = await deployment.isOss();
    });

    // TODO: Remove when vislib is removed
    describe('new charts library', function () {
      this.tags('ciGroup7');

      before(() => update(false));

      after(() => update(true));

      [
        // Test replaced vislib chart types
        './_line_chart_split_chart',
        './_point_series_options',
        './_vertical_bar_chart',
        './_vertical_bar_chart_nontimeindex',
        './_line_chart_split_series',
      ].forEach(load);
    });

    describe('', function () {
      this.tags('ciGroup9');

      [
        './_embedding_chart',
        './_area_chart',
        './_data_table',
        './_data_table_nontimeindex',
        './_data_table_notimeindex_filters',
      ].forEach(load);

      // this check is not needed when the CI doesn't run anymore for the OSS
      if (!isOss) load('./_chart_types');
    });

    describe('', function () {
      this.tags('ciGroup10');

      [
        './_inspector',
        './_experimental_vis',
        './_gauge_chart',
        './_heatmap_chart',
        './input_control_vis',
        './_histogram_request_start',
        './_metric_chart',
      ].forEach(load);
    });

    describe('', function () {
      this.tags('ciGroup4');

      [
        './_pie_chart',
        './_point_series_options',
        './_markdown_vis',
        './_shared_item',
        './_lab_mode',
        './_linked_saved_searches',
        './_visualize_listing',
        './_add_to_dashboard.ts',
      ].forEach(load);

      if (isOss) ['./_tile_map', './_region_map'].forEach(load);
    });

    describe('', function () {
      this.tags('ciGroup12');

      [
        './_tag_cloud',
        './_vertical_bar_chart',
        './_vertical_bar_chart_nontimeindex',
        './_tsvb_chart',
        './_tsvb_time_series',
        './_tsvb_markdown',
        './_tsvb_table',
        './_vega_chart',
      ].forEach(load);
    });
  });

  async function update(x: boolean) {
    await kibanaServer.uiSettings.update({
      'visualization:visualize:legacyChartsLibrary': x,
    });
    await browser.refresh();
  }

  function load(x: string) {
    loadTestFile(require.resolve(x));
  }
}
