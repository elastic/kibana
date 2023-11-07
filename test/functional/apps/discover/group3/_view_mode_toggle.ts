/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects([
    'common',
    'discover',
    'timePicker',
    'dashboard',
    'unifiedFieldList',
    'header',
  ]);
  const esArchiver = getService('esArchiver');
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const queryBar = getService('queryBar');
  const kibanaServer = getService('kibanaServer');
  const security = getService('security');
  const defaultSettings = {
    defaultIndex: 'logstash-*',
  };

  describe('discover view mode toggle', function () {
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

    [true, false].forEach((useLegacyTable) => {
      describe(`isLegacy: ${useLegacyTable}`, function () {
        before(async function () {
          await PageObjects.timePicker.setDefaultAbsoluteRangeViaUiSettings();
          await kibanaServer.uiSettings.update({
            ...defaultSettings,
            'doc_table:legacy': useLegacyTable,
          });
          await PageObjects.common.navigateToApp('discover');
          await PageObjects.discover.waitUntilSearchingHasFinished();
        });

        after(async () => {
          await kibanaServer.uiSettings.replace({});
        });

        it('should show Documents tab', async () => {
          await testSubjects.existOrFail('dscViewModeToggle');

          if (!useLegacyTable) {
            await testSubjects.existOrFail('dscGridToolbar');
          }

          const documentsTab = await testSubjects.find('dscViewModeDocumentButton');
          expect(await documentsTab.getAttribute('aria-selected')).to.be('true');
        });

        it('should show Document Explorer info callout', async () => {
          await testSubjects.existOrFail(
            useLegacyTable ? 'dscDocumentExplorerLegacyCallout' : 'dscDocumentExplorerTourCallout'
          );
        });

        it('should show an error callout', async () => {
          await queryBar.setQuery('@message::'); // invalid
          await queryBar.submitQuery();
          await PageObjects.header.waitUntilLoadingHasFinished();

          await testSubjects.existOrFail('discoverMainError');

          await queryBar.clearQuery();
          await queryBar.submitQuery();
          await PageObjects.header.waitUntilLoadingHasFinished();

          await testSubjects.missingOrFail('discoverMainError');
        });

        it('should show Field Statistics tab', async () => {
          await testSubjects.click('dscViewModeFieldStatsButton');

          await retry.try(async () => {
            const fieldStatsTab = await testSubjects.find('dscViewModeFieldStatsButton');
            expect(await fieldStatsTab.getAttribute('aria-selected')).to.be('true');
          });

          await testSubjects.existOrFail('dscViewModeToggle');
        });

        it('should not show view mode toggle for text-based searches', async () => {
          await testSubjects.click('dscViewModeDocumentButton');

          await retry.try(async () => {
            const documentsTab = await testSubjects.find('dscViewModeDocumentButton');
            expect(await documentsTab.getAttribute('aria-selected')).to.be('true');
          });

          await testSubjects.existOrFail('dscViewModeToggle');

          await PageObjects.discover.selectTextBaseLang();

          await testSubjects.missingOrFail('dscViewModeToggle');

          if (!useLegacyTable) {
            await testSubjects.existOrFail('dscGridToolbar');
          }
        });

        it('should show text-based columns callout', async () => {
          await testSubjects.missingOrFail('dscSelectedColumnsCallout');
          await PageObjects.unifiedFieldList.clickFieldListItemAdd('extension');
          await PageObjects.header.waitUntilLoadingHasFinished();
          await testSubjects.existOrFail('dscSelectedColumnsCallout');
        });
      });
    });
  });
}
