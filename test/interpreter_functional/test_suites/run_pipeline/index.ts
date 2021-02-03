/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
      await esArchiver.loadIfNeeded('../functional/fixtures/es_archiver/logstash_functional');
      await esArchiver.load('../functional/fixtures/es_archiver/visualize_embedding');
      await kibanaServer.uiSettings.replace({
        'dateFormat:tz': 'Australia/North',
        defaultIndex: 'logstash-*',
      });
      await browser.setWindowSize(1300, 900);
      await PageObjects.common.navigateToApp('settings');
      await appsMenu.clickLink('Run Pipeline');
      await testSubjects.find('pluginContent');
    });

    loadTestFile(require.resolve('./basic'));
    loadTestFile(require.resolve('./tag_cloud'));
    loadTestFile(require.resolve('./metric'));
    loadTestFile(require.resolve('./esaggs'));
  });
}
