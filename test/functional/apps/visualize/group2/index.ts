/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, loadTestFile }: FtrProviderContext) {
  const browser = getService('browser');
  const log = getService('log');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');

  describe('visualize app', () => {
    before(async () => {
      log.debug('Starting visualize before method');
      await browser.setWindowSize(1280, 800);
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.uiSettings.update({
        'histogram:maxBars': 100,
        'visualization:visualize:legacyHeatmapChartsLibrary': true,
      });
      await browser.refresh();

      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/long_window_logstash');
    });

    after(async () => {
      await kibanaServer.uiSettings.update({
        'histogram:maxBars': 1000,
        'visualization:visualize:legacyHeatmapChartsLibrary': false,
      });
      await browser.refresh();
    });

    loadTestFile(require.resolve('./_inspector'));
    loadTestFile(require.resolve('./_experimental_vis'));
    loadTestFile(require.resolve('./_gauge_chart'));
    loadTestFile(require.resolve('./_heatmap_chart'));
    loadTestFile(require.resolve('./_histogram_request_start'));
    loadTestFile(require.resolve('./_metric_chart'));
  });
}
