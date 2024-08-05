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
  const dataGrid = getService('dataGrid');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const retry = getService('retry');
  const security = getService('security');
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['common', 'discover', 'header', 'timePicker', 'dashboard']);

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
      await PageObjects.timePicker.setDefaultAbsoluteRangeViaUiSettings();
    });

    beforeEach(async () => {
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.discover.waitUntilSearchingHasFinished();
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
  });
}
