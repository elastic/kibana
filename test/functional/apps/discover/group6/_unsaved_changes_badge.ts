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

const SAVED_SEARCH_NAME = 'test saved search';
const SAVED_SEARCH_WITH_FILTERS_NAME = 'test saved search with filters';
const SAVED_SEARCH_ESQL = 'test saved search ES|QL';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const testSubjects = getService('testSubjects');
  const dataGrid = getService('dataGrid');
  const filterBar = getService('filterBar');
  const monacoEditor = getService('monacoEditor');
  const browser = getService('browser');
  const { common, discover, header, timePicker, unifiedFieldList } = getPageObjects([
    'common',
    'discover',
    'header',
    'timePicker',
    'unifiedFieldList',
  ]);
  const security = getService('security');
  const defaultSettings = {
    defaultIndex: 'logstash-*',
    hideAnnouncements: true,
  };

  describe('discover unsaved changes badge', function describeIndexTests() {
    before(async () => {
      await security.testUser.setRoles(['kibana_admin', 'test_logstash_reader']);
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/discover');
    });

    after(async () => {
      await kibanaServer.importExport.unload('test/functional/fixtures/kbn_archiver/discover');
      await kibanaServer.uiSettings.replace({});
      await kibanaServer.savedObjects.cleanStandardList();
    });

    beforeEach(async function () {
      await timePicker.setDefaultAbsoluteRangeViaUiSettings();
      await kibanaServer.uiSettings.update(defaultSettings);
      await common.navigateToApp('discover');
      await header.waitUntilLoadingHasFinished();
      await discover.waitUntilSearchingHasFinished();
    });

    it('should not show the badge initially nor after changes to a draft saved search', async () => {
      await testSubjects.missingOrFail('unsavedChangesBadge');

      await unifiedFieldList.clickFieldListItemAdd('bytes');

      await header.waitUntilLoadingHasFinished();
      await discover.waitUntilSearchingHasFinished();

      await testSubjects.missingOrFail('unsavedChangesBadge');
    });

    it('should show the badge only after changes to a persisted saved search', async () => {
      await discover.saveSearch(SAVED_SEARCH_NAME);
      await discover.waitUntilSearchingHasFinished();

      await testSubjects.missingOrFail('unsavedChangesBadge');

      await unifiedFieldList.clickFieldListItemAdd('bytes');
      await header.waitUntilLoadingHasFinished();
      await discover.waitUntilSearchingHasFinished();

      await testSubjects.existOrFail('unsavedChangesBadge');

      await discover.saveUnsavedChanges();

      await testSubjects.missingOrFail('unsavedChangesBadge');
    });

    it('should not show a badge after loading a saved search, only after changes', async () => {
      await discover.loadSavedSearch(SAVED_SEARCH_NAME);

      await testSubjects.missingOrFail('unsavedChangesBadge');

      await discover.chooseBreakdownField('_index');
      await header.waitUntilLoadingHasFinished();
      await discover.waitUntilSearchingHasFinished();

      await testSubjects.existOrFail('unsavedChangesBadge');
    });

    it('should allow to revert changes', async () => {
      await discover.loadSavedSearch(SAVED_SEARCH_NAME);
      await testSubjects.missingOrFail('unsavedChangesBadge');

      // test changes to columns
      expect(await dataGrid.getHeaderFields()).to.eql(['@timestamp', 'bytes']);
      await unifiedFieldList.clickFieldListItemAdd('extension');
      await header.waitUntilLoadingHasFinished();
      await discover.waitUntilSearchingHasFinished();
      expect(await dataGrid.getHeaderFields()).to.eql(['@timestamp', 'bytes', 'extension']);
      await testSubjects.existOrFail('unsavedChangesBadge');
      await discover.revertUnsavedChanges();
      expect(await dataGrid.getHeaderFields()).to.eql(['@timestamp', 'bytes']);
      await testSubjects.missingOrFail('unsavedChangesBadge');

      // test changes to sample size
      await dataGrid.clickGridSettings();
      expect(await dataGrid.getCurrentSampleSizeValue()).to.be(500);
      await dataGrid.changeSampleSizeValue(250);
      await dataGrid.clickGridSettings();
      await header.waitUntilLoadingHasFinished();
      await discover.waitUntilSearchingHasFinished();
      await testSubjects.existOrFail('unsavedChangesBadge');
      await dataGrid.clickGridSettings();
      expect(await dataGrid.getCurrentSampleSizeValue()).to.be(250);
      await dataGrid.clickGridSettings();
      await discover.revertUnsavedChanges();
      await testSubjects.missingOrFail('unsavedChangesBadge');
      await dataGrid.clickGridSettings();
      expect(await dataGrid.getCurrentSampleSizeValue()).to.be(500);
      await dataGrid.clickGridSettings();

      // test changes to rows per page
      await dataGrid.checkCurrentRowsPerPageToBe(100);
      await dataGrid.changeRowsPerPageTo(25);
      await header.waitUntilLoadingHasFinished();
      await discover.waitUntilSearchingHasFinished();
      await testSubjects.existOrFail('unsavedChangesBadge');
      await dataGrid.checkCurrentRowsPerPageToBe(25);
      await discover.revertUnsavedChanges();
      await testSubjects.missingOrFail('unsavedChangesBadge');
      await dataGrid.checkCurrentRowsPerPageToBe(100);
    });

    it('should hide the badge once user manually reverts changes', async () => {
      await discover.loadSavedSearch(SAVED_SEARCH_NAME);
      await testSubjects.missingOrFail('unsavedChangesBadge');

      // changes to columns
      expect(await dataGrid.getHeaderFields()).to.eql(['@timestamp', 'bytes']);
      await unifiedFieldList.clickFieldListItemAdd('extension');
      await header.waitUntilLoadingHasFinished();
      await discover.waitUntilSearchingHasFinished();
      expect(await dataGrid.getHeaderFields()).to.eql(['@timestamp', 'bytes', 'extension']);
      await testSubjects.existOrFail('unsavedChangesBadge');
      await unifiedFieldList.clickFieldListItemRemove('extension');
      await header.waitUntilLoadingHasFinished();
      await discover.waitUntilSearchingHasFinished();
      expect(await dataGrid.getHeaderFields()).to.eql(['@timestamp', 'bytes']);
      await testSubjects.missingOrFail('unsavedChangesBadge');

      // test changes to breakdown field
      await discover.chooseBreakdownField('_index');
      await header.waitUntilLoadingHasFinished();
      await discover.waitUntilSearchingHasFinished();
      await testSubjects.existOrFail('unsavedChangesBadge');
      await discover.clearBreakdownField();
      await header.waitUntilLoadingHasFinished();
      await discover.waitUntilSearchingHasFinished();
      await testSubjects.missingOrFail('unsavedChangesBadge');
    });

    it('should not show the badge after pinning the first filter but after disabling a filter', async () => {
      await filterBar.addFilter({ field: 'extension', operation: 'is', value: 'png' });
      await filterBar.addFilter({ field: 'bytes', operation: 'exists' });
      await discover.saveSearch(SAVED_SEARCH_WITH_FILTERS_NAME);
      await discover.waitUntilSearchingHasFinished();

      await testSubjects.missingOrFail('unsavedChangesBadge');

      await filterBar.toggleFilterPinned('extension');
      await discover.waitUntilSearchingHasFinished();
      expect(await filterBar.isFilterPinned('extension')).to.be(true);

      await testSubjects.missingOrFail('unsavedChangesBadge');

      await filterBar.toggleFilterNegated('bytes');
      await discover.waitUntilSearchingHasFinished();
      expect(await filterBar.isFilterNegated('bytes')).to.be(true);

      await testSubjects.existOrFail('unsavedChangesBadge');

      await discover.revertUnsavedChanges();
      await testSubjects.missingOrFail('unsavedChangesBadge');

      expect(await filterBar.getFilterCount()).to.be(2);
      expect(await filterBar.isFilterPinned('extension')).to.be(false);
      expect(await filterBar.isFilterNegated('bytes')).to.be(false);
      expect(await discover.getHitCount()).to.be('1,373');
    });

    it('should not show a badge after loading an ES|QL saved search, only after changes', async () => {
      await discover.selectTextBaseLang();

      await monacoEditor.setCodeEditorValue('from logstash-* | limit 10');
      await testSubjects.click('querySubmitButton');
      await header.waitUntilLoadingHasFinished();
      await discover.waitUntilSearchingHasFinished();

      await discover.saveSearch(SAVED_SEARCH_ESQL);
      await discover.waitUntilSearchingHasFinished();

      await testSubjects.missingOrFail('unsavedChangesBadge');

      await browser.refresh();
      await header.waitUntilLoadingHasFinished();
      await discover.waitUntilSearchingHasFinished();

      await testSubjects.missingOrFail('unsavedChangesBadge');

      await monacoEditor.setCodeEditorValue('from logstash-* | limit 100');
      await testSubjects.click('querySubmitButton');
      await header.waitUntilLoadingHasFinished();
      await discover.waitUntilSearchingHasFinished();

      await testSubjects.existOrFail('unsavedChangesBadge');
    });
  });
}
