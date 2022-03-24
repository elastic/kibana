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
  const log = getService('log');
  const esArchiver = getService('esArchiver');

  describe('dashboard elements', () => {
    before(async () => {
      log.debug('Starting before method');
      await browser.setWindowSize(1280, 800);
      await esArchiver.load('test/functional/fixtures/es_archiver/empty_kibana');

      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/long_window_logstash');
    });

    after(async () => {
      await esArchiver.unload('test/functional/fixtures/es_archiver/empty_kibana');
      await esArchiver.unload('test/functional/fixtures/es_archiver/logstash_functional');
      await esArchiver.unload('test/functional/fixtures/es_archiver/long_window_logstash');
    });

    describe('dashboard elements ciGroup10', function () {
      this.tags('ciGroup10');

      loadTestFile(require.resolve('./input_control_vis'));
      loadTestFile(require.resolve('./controls'));
      loadTestFile(require.resolve('./_markdown_vis'));
      loadTestFile(require.resolve('./controls'));
    });
  });
}
