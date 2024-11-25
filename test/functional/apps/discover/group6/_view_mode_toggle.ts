/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const { common, discover, timePicker, unifiedFieldList, header } = getPageObjects([
    'common',
    'discover',
    'timePicker',
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
          await timePicker.setDefaultAbsoluteRangeViaUiSettings();
          await kibanaServer.uiSettings.update({
            ...defaultSettings,
            'doc_table:legacy': useLegacyTable,
          });
          await common.navigateToApp('discover');
          await discover.waitUntilSearchingHasFinished();
        });

        after(async () => {
          await kibanaServer.uiSettings.replace({});
        });

        it('should show Documents tab', async () => {
          await testSubjects.existOrFail('dscViewModeToggle');

          if (!useLegacyTable) {
            await testSubjects.existOrFail('unifiedDataTableToolbar');
          }

          const documentsTab = await testSubjects.find('dscViewModeDocumentButton');
          expect(await documentsTab.getAttribute('aria-selected')).to.be('true');
        });

        it('should show legacy Document Explorer info callout', async () => {
          if (useLegacyTable) {
            await testSubjects.existOrFail('dscDocumentExplorerLegacyCallout');
          } else {
            await testSubjects.missingOrFail('dscDocumentExplorerLegacyCallout');
          }
        });

        it('should show an error callout', async () => {
          await queryBar.setQuery('@message::'); // invalid
          await queryBar.submitQuery();
          await header.waitUntilLoadingHasFinished();

          await discover.showsErrorCallout();

          await queryBar.clearQuery();
          await queryBar.submitQuery();
          await header.waitUntilLoadingHasFinished();

          await testSubjects.missingOrFail('discoverErrorCalloutTitle');
        });

        describe('Patterns tab (basic license)', function () {
          this.tags('skipFIPS');

          it('should not show', async function () {
            await testSubjects.missingOrFail('dscViewModePatternAnalysisButton');
          });
        });

        it('should not show Field Statistics tab', async () => {
          await testSubjects.existOrFail('dscViewModeToggle');
        });

        it('should not show view mode toggle for ES|QL searches', async () => {
          await testSubjects.click('dscViewModeDocumentButton');

          await retry.try(async () => {
            const documentsTab = await testSubjects.find('dscViewModeDocumentButton');
            expect(await documentsTab.getAttribute('aria-selected')).to.be('true');
          });

          await testSubjects.existOrFail('dscViewModeToggle');

          await discover.selectTextBaseLang();

          await testSubjects.missingOrFail('dscViewModeToggle');
          await testSubjects.existOrFail('discoverQueryTotalHits');

          if (!useLegacyTable) {
            await testSubjects.existOrFail('unifiedDataTableToolbar');
          }
        });

        it('should show ES|QL columns callout', async () => {
          await testSubjects.missingOrFail('dscSelectedColumnsCallout');
          await unifiedFieldList.clickFieldListItemAdd('extension');
          await header.waitUntilLoadingHasFinished();
          await testSubjects.existOrFail('dscSelectedColumnsCallout');
        });
      });
    });
  });
}
