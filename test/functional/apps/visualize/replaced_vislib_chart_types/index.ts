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
  const log = getService('log');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');

  // TODO: Remove when vislib is removed
  describe('visualize app - new charts library visualize', () => {
    before(async () => {
      log.debug('Starting visualize before method');
      await browser.setWindowSize(1280, 800);
      await kibanaServer.savedObjects.cleanStandardList();

      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/long_window_logstash');
      await kibanaServer.uiSettings.update({
        'histogram:maxBars': 100,
      });
      await browser.refresh();
    });

    after(async () => {
      await kibanaServer.uiSettings.update({
        'histogram:maxBars': 1000,
      });
      await browser.refresh();
    });

    // Test replaced vislib chart types
    loadTestFile(require.resolve('./_area_chart'));
    loadTestFile(require.resolve('./_line_chart_split_series'));
    loadTestFile(require.resolve('./_line_chart_split_chart'));
    loadTestFile(require.resolve('./_point_series_options'));
    loadTestFile(require.resolve('./_vertical_bar_chart'));
    loadTestFile(require.resolve('./_vertical_bar_chart_nontimeindex'));
    loadTestFile(require.resolve('./_timelion'));
    loadTestFile(require.resolve('../group3/_pie_chart'));
    loadTestFile(require.resolve('../group2/_heatmap_chart'));
  });
}
