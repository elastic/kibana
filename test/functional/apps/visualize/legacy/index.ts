/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { FtrProviderContext } from '../../../ftr_provider_context.d';
import { UI_SETTINGS } from '../../../../../src/plugins/data/common';

export default function ({ getService, loadTestFile }: FtrProviderContext) {
  const browser = getService('browser');
  const log = getService('log');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');

  describe('visualize with legacy visualizations', () => {
    before(async () => {
      log.debug('Starting visualize legacy before method');
      await browser.setWindowSize(1280, 800);
      await esArchiver.loadIfNeeded('logstash_functional');
      await esArchiver.loadIfNeeded('long_window_logstash');
      await esArchiver.load('visualize');
      await kibanaServer.uiSettings.replace({
        defaultIndex: 'logstash-*',
        [UI_SETTINGS.FORMAT_BYTES_DEFAULT_PATTERN]: '0,0.[000]b',
      });
    });

    describe('legacy data table visualization', function () {
      this.tags('ciGroup9');

      loadTestFile(require.resolve('./_data_table'));
    });
  });
}
