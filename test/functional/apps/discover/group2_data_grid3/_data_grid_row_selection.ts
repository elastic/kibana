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
  const dataGrid = getService('dataGrid');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const retry = getService('retry');
  const security = getService('security');
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');
  const { common, discover, header, timePicker, unifiedFieldList } = getPageObjects([
    'common',
    'discover',
    'header',
    'timePicker',
    'unifiedFieldList',
  ]);

  const PAGE_SIZE = 5;
  const defaultSettings = {
    defaultIndex: 'logstash-*',
    'discover:sampleRowsPerPage': PAGE_SIZE,
    hideAnnouncements: true,
  };

  describe('discover data grid row selection', function describeIndexTests() {
    before(async function () {
      await security.testUser.setRoles(['kibana_admin', 'test_logstash_reader']);
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/discover');
      await kibanaServer.uiSettings.replace(defaultSettings);
      await timePicker.setDefaultAbsoluteRangeViaUiSettings();
    });

    beforeEach(async () => {
      await common.navigateToApp('discover');
      await header.waitUntilLoadingHasFinished();
      await discover.waitUntilSearchingHasFinished();
    });

    after(async function () {
      await kibanaServer.uiSettings.replace({});
      await kibanaServer.importExport.unload('test/functional/fixtures/kbn_archiver/discover');
      await esArchiver.unload('test/functional/fixtures/es_archiver/logstash_functional');
      await kibanaServer.savedObjects.cleanStandardList();
    });

    it('should be able to select rows manually', async () => {
      expect(await dataGrid.isSelectedRowsMenuVisible()).to.be(false);

      await dataGrid.selectRow(1);

      await retry.try(async () => {
        expect(await dataGrid.isSelectedRowsMenuVisible()).to.be(true);
        expect(await dataGrid.getNumberOfSelectedRowsOnCurrentPage()).to.be(1);
        expect(await dataGrid.getNumberOfSelectedRows()).to.be(1);
      });

      await dataGrid.selectRow(2);

      await retry.try(async () => {
        expect(await dataGrid.isSelectedRowsMenuVisible()).to.be(true);
        expect(await dataGrid.getNumberOfSelectedRowsOnCurrentPage()).to.be(2);
        expect(await dataGrid.getNumberOfSelectedRows()).to.be(2);
      });

      // deselect
      await dataGrid.selectRow(2);

      await retry.try(async () => {
        expect(await dataGrid.isSelectedRowsMenuVisible()).to.be(true);
        expect(await dataGrid.getNumberOfSelectedRowsOnCurrentPage()).to.be(1);
        expect(await dataGrid.getNumberOfSelectedRows()).to.be(1);
      });
    });

    it('should be able to bulk select rows', async () => {
      expect(await dataGrid.isSelectedRowsMenuVisible()).to.be(false);
      expect(await testSubjects.getAttribute('selectAllDocsOnPageToggle', 'title')).to.be(
        'Select all visible rows'
      );

      await dataGrid.selectRow(1);

      await retry.try(async () => {
        expect(await dataGrid.isSelectedRowsMenuVisible()).to.be(true);
        expect(await dataGrid.getNumberOfSelectedRowsOnCurrentPage()).to.be(1);
        expect(await dataGrid.getNumberOfSelectedRows()).to.be(1);
        expect(await testSubjects.getAttribute('selectAllDocsOnPageToggle', 'title')).to.be(
          'Deselect all visible rows'
        );
      });

      await dataGrid.toggleSelectAllRowsOnCurrentPage();

      await retry.try(async () => {
        expect(await dataGrid.isSelectedRowsMenuVisible()).to.be(false);
        expect(await dataGrid.getNumberOfSelectedRowsOnCurrentPage()).to.be(0);
        expect(await testSubjects.getAttribute('selectAllDocsOnPageToggle', 'title')).to.be(
          'Select all visible rows'
        );
      });

      await dataGrid.toggleSelectAllRowsOnCurrentPage();

      await retry.try(async () => {
        expect(await dataGrid.isSelectedRowsMenuVisible()).to.be(true);
        expect(await dataGrid.getNumberOfSelectedRowsOnCurrentPage()).to.be(PAGE_SIZE);
        expect(await dataGrid.getNumberOfSelectedRows()).to.be(PAGE_SIZE);
        expect(await testSubjects.getAttribute('selectAllDocsOnPageToggle', 'title')).to.be(
          'Deselect all visible rows'
        );
        expect(await testSubjects.getVisibleText('dscGridSelectAllDocs')).to.be('Select all 500');
      });

      await dataGrid.selectAllRows();

      await retry.try(async () => {
        expect(await dataGrid.isSelectedRowsMenuVisible()).to.be(true);
        expect(await dataGrid.getNumberOfSelectedRowsOnCurrentPage()).to.be(PAGE_SIZE);
        expect(await dataGrid.getNumberOfSelectedRows()).to.be(500);
        expect(await testSubjects.getAttribute('selectAllDocsOnPageToggle', 'title')).to.be(
          'Deselect all visible rows'
        );
        await testSubjects.missingOrFail('dscGridSelectAllDocs');
      });

      await dataGrid.toggleSelectAllRowsOnCurrentPage();

      await retry.try(async () => {
        expect(await dataGrid.isSelectedRowsMenuVisible()).to.be(true);
        expect(await dataGrid.getNumberOfSelectedRowsOnCurrentPage()).to.be(0);
        expect(await dataGrid.getNumberOfSelectedRows()).to.be(500 - PAGE_SIZE);
        expect(await testSubjects.getAttribute('selectAllDocsOnPageToggle', 'title')).to.be(
          'Select all visible rows'
        );
        await testSubjects.existOrFail('dscGridSelectAllDocs');
      });

      await dataGrid.openSelectedRowsMenu();
      await testSubjects.click('dscGridClearSelectedDocuments');

      await retry.try(async () => {
        expect(await dataGrid.isSelectedRowsMenuVisible()).to.be(false);
        expect(await dataGrid.getNumberOfSelectedRowsOnCurrentPage()).to.be(0);
        expect(await testSubjects.getAttribute('selectAllDocsOnPageToggle', 'title')).to.be(
          'Select all visible rows'
        );
        await testSubjects.missingOrFail('dscGridSelectAllDocs');
      });
    });

    it('can copy selected rows as JSON', async () => {
      await dataGrid.selectRow(2);
      await dataGrid.selectRow(1);

      await retry.try(async () => {
        expect(await dataGrid.isSelectedRowsMenuVisible()).to.be(true);
        expect(await dataGrid.getNumberOfSelectedRowsOnCurrentPage()).to.be(2);
        expect(await dataGrid.getNumberOfSelectedRows()).to.be(2);
      });

      await dataGrid.openSelectedRowsMenu();
      await testSubjects.click('dscGridCopySelectedDocumentsJSON');

      await retry.try(async () => {
        await testSubjects.missingOrFail('unifiedDataTableSelectionMenu');
      });

      const clipboardData = await browser.execute(() => navigator.clipboard.readText());
      expect(
        clipboardData.startsWith(
          '[{"_index":"logstash-2015.09.22","_id":"AU_x3-TcGFA8no6Qjipx","_version":1,"_score":null,"fields":{'
        )
      ).to.be(true);
    });

    it('can copy selected rows as text', async () => {
      await dataGrid.selectRow(2);
      await dataGrid.selectRow(1);

      await retry.try(async () => {
        expect(await dataGrid.isSelectedRowsMenuVisible()).to.be(true);
        expect(await dataGrid.getNumberOfSelectedRowsOnCurrentPage()).to.be(2);
        expect(await dataGrid.getNumberOfSelectedRows()).to.be(2);
      });

      await dataGrid.openSelectedRowsMenu();
      await testSubjects.click('unifiedDataTableCopyRowsAsText');

      await retry.try(async () => {
        await testSubjects.missingOrFail('unifiedDataTableSelectionMenu');
      });

      const clipboardData = await browser.execute(() => navigator.clipboard.readText());
      expect(
        clipboardData.startsWith(
          '"\'@timestamp"\t"\'@message"\t"\'@message.raw"\t"\'@tags"\t"\'@tags.raw"\t"_id"'
        )
      ).to.be(true);
    });

    it('can copy columns for selected rows as text', async () => {
      await unifiedFieldList.clickFieldListItemAdd('extension');
      await unifiedFieldList.clickFieldListItemAdd('bytes');
      await retry.try(async () => {
        expect(await dataGrid.getHeaderFields()).to.eql(['@timestamp', 'extension', 'bytes']);
      });

      await dataGrid.selectRow(1);
      await dataGrid.selectRow(0);

      await retry.try(async () => {
        expect(await dataGrid.isSelectedRowsMenuVisible()).to.be(true);
        expect(await dataGrid.getNumberOfSelectedRowsOnCurrentPage()).to.be(2);
        expect(await dataGrid.getNumberOfSelectedRows()).to.be(2);
      });

      await dataGrid.openSelectedRowsMenu();
      await testSubjects.click('unifiedDataTableCopyRowsAsText');

      await retry.try(async () => {
        await testSubjects.missingOrFail('unifiedDataTableSelectionMenu');
      });

      const clipboardData = await browser.execute(() => navigator.clipboard.readText());
      expect(clipboardData).to.be(
        '"\'@timestamp"\textension\tbytes\n"Sep 22, 2015 @ 23:50:13.253"\tjpg\t"7,124"\n"Sep 22, 2015 @ 23:43:58.175"\tjpg\t"5,453"'
      );
    });
  });
}
