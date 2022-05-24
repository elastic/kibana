/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FtrProviderContext } from '../../../functional/ftr_provider_context';

export default function ({ getService, getPageObjects, loadTestFile }: FtrProviderContext) {
  const browser = getService('browser');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const appsMenu = getService('appsMenu');
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['common', 'header']);

  describe('runPipeline', function () {
    this.tags(['skipFirefox']);

    before(async () => {
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/visualize.json');
      await kibanaServer.uiSettings.replace({
        'dateFormat:tz': 'Australia/North',
        defaultIndex: 'logstash-*',
        'bfetch:disableCompression': true, // makes it easier to debug while developing tests
      });
      await browser.setWindowSize(1300, 900);
      await PageObjects.common.navigateToApp('settings');
      await appsMenu.clickLink('Run Pipeline');
      await testSubjects.find('pluginContent');
    });

    after(async () => {
      await kibanaServer.importExport.unload(
        'test/functional/fixtures/kbn_archiver/visualize.json'
      );
    });

    loadTestFile(require.resolve('./basic'));
    loadTestFile(require.resolve('./tag_cloud'));
    loadTestFile(require.resolve('./metric'));
    loadTestFile(require.resolve('./esaggs'));
    loadTestFile(require.resolve('./esaggs_timeshift'));
    loadTestFile(require.resolve('./esaggs_multiterms'));
    loadTestFile(require.resolve('./esaggs_sampler'));
    loadTestFile(require.resolve('./esaggs_significanttext'));
    loadTestFile(require.resolve('./esaggs_rareterms'));
    loadTestFile(require.resolve('./esaggs_topmetrics'));
    loadTestFile(require.resolve('./esaggs_histogram'));
  });
}
