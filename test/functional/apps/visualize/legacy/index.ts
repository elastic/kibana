/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';
import { FORMATS_UI_SETTINGS } from '../../../../../src/plugins/field_formats/common';

export default function ({ getPageObjects, getService, loadTestFile }: FtrProviderContext) {
  const browser = getService('browser');
  const log = getService('log');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const PageObjects = getPageObjects(['visualize']);

  describe('visualize with legacy visualizations', () => {
    before(async () => {
      await PageObjects.visualize.initTests();
      log.debug('Starting visualize legacy before method');
      await browser.setWindowSize(1280, 800);
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/long_window_logstash');
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/visualize.json');
      await kibanaServer.uiSettings.replace({
        defaultIndex: 'logstash-*',
        [FORMATS_UI_SETTINGS.FORMAT_BYTES_DEFAULT_PATTERN]: '0,0.[000]b',
      });
    });

    describe('legacy data table visualization', function () {
      this.tags('ciGroup9');

      loadTestFile(require.resolve('./_data_table'));
    });
  });
}
