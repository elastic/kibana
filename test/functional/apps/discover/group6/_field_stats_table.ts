/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'discover', 'timePicker', 'header']);
  const esArchiver = getService('esArchiver');
  const testSubjects = getService('testSubjects');
  const kibanaServer = getService('kibanaServer');
  const security = getService('security');
  const defaultSettings = {
    defaultIndex: 'logstash-*',
  };

  describe('discover field statistics table', function () {
    before(async () => {
      await security.testUser.setRoles(['kibana_admin', 'test_logstash_reader']);
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/discover');
    });

    after(async () => {
      await kibanaServer.importExport.unload('test/functional/fixtures/kbn_archiver/discover');
      await esArchiver.unload('test/functional/fixtures/es_archiver/logstash_functional');
      await kibanaServer.savedObjects.cleanStandardList();
    });

    [true, false].forEach((shouldSearchFieldsFromSource) => {
      describe(`discover:searchFieldsFromSource: ${shouldSearchFieldsFromSource}`, function () {
        before(async function () {
          await PageObjects.timePicker.setDefaultAbsoluteRangeViaUiSettings();
          await kibanaServer.uiSettings.update({
            ...defaultSettings,
            'discover:searchFieldsFromSource': shouldSearchFieldsFromSource,
          });
          await PageObjects.common.navigateToApp('discover');
          await PageObjects.header.waitUntilLoadingHasFinished();
          await PageObjects.discover.waitUntilSearchingHasFinished();
        });

        after(async () => {
          await kibanaServer.uiSettings.replace({});
        });

        it('should show Field Statistics data in data view mode', async () => {
          await testSubjects.click('dscViewModeFieldStatsButton');
          await PageObjects.header.waitUntilLoadingHasFinished();
          await testSubjects.existOrFail('dataVisualizerTableContainer');

          await testSubjects.click('dscViewModeDocumentButton');
          await PageObjects.header.waitUntilLoadingHasFinished();
          await testSubjects.existOrFail('discoverDocTable');
        });

        it('should show Field Statistics data in ES|QL mode', async () => {
          await PageObjects.discover.selectTextBaseLang();
          await PageObjects.discover.waitUntilSearchingHasFinished();

          await testSubjects.click('dscViewModeFieldStatsButton');
          await PageObjects.header.waitUntilLoadingHasFinished();
          await testSubjects.existOrFail('dataVisualizerTableContainer');
        });
      });
    });
  });
}
