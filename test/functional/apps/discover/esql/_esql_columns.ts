/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../ftr_provider_context';

const SAVED_SEARCH_NON_TRANSFORMATIONAL_INITIAL_COLUMNS = 'nonTransformationalInitialColumns';
const SAVED_SEARCH_NON_TRANSFORMATIONAL_CUSTOM_COLUMNS = 'nonTransformationalCustomColumns';
const SAVED_SEARCH_TRANSFORMATIONAL_INITIAL_COLUMNS = 'transformationalInitialColumns';
const SAVED_SEARCH_TRANSFORMATIONAL_CUSTOM_COLUMNS = 'transformationalCustomColumns';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const security = getService('security');
  const dataGrid = getService('dataGrid');
  const browser = getService('browser');
  const monacoEditor = getService('monacoEditor');
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects([
    'common',
    'discover',
    'dashboard',
    'header',
    'timePicker',
    'unifiedFieldList',
  ]);

  const defaultSettings = {
    defaultIndex: 'logstash-*',
  };

  describe('discover esql columns', function () {
    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await security.testUser.setRoles(['kibana_admin', 'test_logstash_reader']);
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/discover');
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
      await kibanaServer.uiSettings.replace(defaultSettings);
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.timePicker.setDefaultAbsoluteRange();
      await PageObjects.discover.waitUntilSearchingHasFinished();
      await PageObjects.discover.selectTextBaseLang();
      await PageObjects.discover.waitUntilSearchingHasFinished();
    });

    beforeEach(async () => {
      await PageObjects.discover.clickNewSearchButton();
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.discover.waitUntilSearchingHasFinished();
    });

    it('should render initial columns for non-transformational commands correctly', async () => {
      const columns = ['@timestamp', 'Document'];
      expect(await dataGrid.getHeaderFields()).to.eql(columns);

      await browser.refresh();
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.discover.waitUntilSearchingHasFinished();
      expect(await dataGrid.getHeaderFields()).to.eql(columns);

      await PageObjects.discover.saveSearch(SAVED_SEARCH_NON_TRANSFORMATIONAL_INITIAL_COLUMNS);
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.discover.waitUntilSearchingHasFinished();
      expect(await dataGrid.getHeaderFields()).to.eql(columns);
    });

    it('should render custom columns for non-transformational commands correctly', async () => {
      const columns = ['bytes', 'extension'];
      await PageObjects.unifiedFieldList.clickFieldListItemAdd('bytes');
      await PageObjects.unifiedFieldList.clickFieldListItemAdd('extension');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.discover.waitUntilSearchingHasFinished();
      expect(await dataGrid.getHeaderFields()).to.eql(columns);

      await browser.refresh();
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.discover.waitUntilSearchingHasFinished();
      expect(await dataGrid.getHeaderFields()).to.eql(columns);

      await PageObjects.discover.saveSearch(SAVED_SEARCH_NON_TRANSFORMATIONAL_CUSTOM_COLUMNS);
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.discover.waitUntilSearchingHasFinished();
      expect(await dataGrid.getHeaderFields()).to.eql(columns);
    });

    it('should reset columns only if index pattern changes in non-transformational query', async () => {
      const columns = ['@timestamp', 'Document'];
      expect(await dataGrid.getHeaderFields()).to.eql(columns);

      await monacoEditor.setCodeEditorValue('from logstash-* | limit 500');
      await testSubjects.click('querySubmitButton');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.discover.waitUntilSearchingHasFinished();
      expect(await dataGrid.getHeaderFields()).to.eql(columns);

      await monacoEditor.setCodeEditorValue('from logs* | limit 500');
      await testSubjects.click('querySubmitButton');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.discover.waitUntilSearchingHasFinished();
      expect(await dataGrid.getHeaderFields()).to.eql(columns);

      await PageObjects.unifiedFieldList.clickFieldListItemAdd('bytes');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.discover.waitUntilSearchingHasFinished();
      expect(await dataGrid.getHeaderFields()).to.eql(['bytes']);

      // different index pattern => reset columns
      await monacoEditor.setCodeEditorValue('from logstash-* | limit 500');
      await testSubjects.click('querySubmitButton');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.discover.waitUntilSearchingHasFinished();
      expect(await dataGrid.getHeaderFields()).to.eql(columns);

      await PageObjects.unifiedFieldList.clickFieldListItemAdd('extension');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.discover.waitUntilSearchingHasFinished();
      expect(await dataGrid.getHeaderFields()).to.eql(['extension']);

      // same index pattern => don't reset columns
      await monacoEditor.setCodeEditorValue(
        `${await monacoEditor.getCodeEditorValue()} | where bytes > 0`
      );
      await testSubjects.click('querySubmitButton');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.discover.waitUntilSearchingHasFinished();
      expect(await dataGrid.getHeaderFields()).to.eql(['extension']);
    });

    it('should render initial columns for a transformational command correctly', async () => {
      const columns = ['ip', '@timestamp'];
      await monacoEditor.setCodeEditorValue(
        `${await monacoEditor.getCodeEditorValue()} | keep ip, @timestamp`
      );
      await testSubjects.click('querySubmitButton');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.discover.waitUntilSearchingHasFinished();
      expect(await dataGrid.getHeaderFields()).to.eql(columns);

      await browser.refresh();
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.discover.waitUntilSearchingHasFinished();
      expect(await dataGrid.getHeaderFields()).to.eql(columns);

      await PageObjects.discover.saveSearch(SAVED_SEARCH_TRANSFORMATIONAL_INITIAL_COLUMNS);
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.discover.waitUntilSearchingHasFinished();
      expect(await dataGrid.getHeaderFields()).to.eql(columns);
    });

    it('should render custom columns for a transformational command correctly', async () => {
      const columns = ['ip', 'bytes'];
      await monacoEditor.setCodeEditorValue(
        `${await monacoEditor.getCodeEditorValue()} | keep ip, @timestamp, bytes`
      );
      await testSubjects.click('querySubmitButton');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.discover.waitUntilSearchingHasFinished();
      expect(await dataGrid.getHeaderFields()).to.eql(['ip', '@timestamp', 'bytes']);

      await PageObjects.unifiedFieldList.clickFieldListItemRemove('@timestamp');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.discover.waitUntilSearchingHasFinished();
      expect(await dataGrid.getHeaderFields()).to.eql(columns);

      await browser.refresh();
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.discover.waitUntilSearchingHasFinished();
      expect(await dataGrid.getHeaderFields()).to.eql(columns);

      await PageObjects.discover.saveSearch(SAVED_SEARCH_TRANSFORMATIONAL_CUSTOM_COLUMNS);
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.discover.waitUntilSearchingHasFinished();
      expect(await dataGrid.getHeaderFields()).to.eql(columns);
    });

    it('should reset columns if available fields or index pattern are different in transformational query', async () => {
      await monacoEditor.setCodeEditorValue('from logstash-* | keep ip, @timestamp');
      await testSubjects.click('querySubmitButton');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.discover.waitUntilSearchingHasFinished();
      expect(await dataGrid.getHeaderFields()).to.eql(['ip', '@timestamp']);

      // reset columns if available fields are different
      await monacoEditor.setCodeEditorValue('from logstash-* | keep ip, @timestamp, bytes');
      await testSubjects.click('querySubmitButton');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.discover.waitUntilSearchingHasFinished();
      expect(await dataGrid.getHeaderFields()).to.eql(['ip', '@timestamp', 'bytes']);

      // don't reset columns if available fields and index pattern are the same
      await monacoEditor.setCodeEditorValue(
        'from logstash-* | keep ip, @timestamp, bytes | limit 1'
      );
      await testSubjects.click('querySubmitButton');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.discover.waitUntilSearchingHasFinished();
      expect(await dataGrid.getHeaderFields()).to.eql(['ip', '@timestamp', 'bytes']);
      await PageObjects.unifiedFieldList.clickFieldListItemRemove('@timestamp');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.discover.waitUntilSearchingHasFinished();
      expect(await dataGrid.getHeaderFields()).to.eql(['ip', 'bytes']);

      // reset columns if index pattern is different
      await monacoEditor.setCodeEditorValue('from logs* | keep ip, @timestamp, bytes | limit 1');
      await testSubjects.click('querySubmitButton');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.discover.waitUntilSearchingHasFinished();
      expect(await dataGrid.getHeaderFields()).to.eql(['ip', '@timestamp', 'bytes']);
    });

    it('should restore columns correctly when switching between saved searches', async () => {
      await PageObjects.discover.loadSavedSearch(SAVED_SEARCH_NON_TRANSFORMATIONAL_INITIAL_COLUMNS);
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.discover.waitUntilSearchingHasFinished();
      expect(await dataGrid.getHeaderFields()).to.eql(['@timestamp', 'Document']);

      await PageObjects.discover.loadSavedSearch(SAVED_SEARCH_NON_TRANSFORMATIONAL_CUSTOM_COLUMNS);
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.discover.waitUntilSearchingHasFinished();
      expect(await dataGrid.getHeaderFields()).to.eql(['bytes', 'extension']);

      await PageObjects.discover.loadSavedSearch(SAVED_SEARCH_TRANSFORMATIONAL_INITIAL_COLUMNS);
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.discover.waitUntilSearchingHasFinished();
      expect(await dataGrid.getHeaderFields()).to.eql(['ip', '@timestamp']);

      await PageObjects.discover.loadSavedSearch(SAVED_SEARCH_TRANSFORMATIONAL_CUSTOM_COLUMNS);
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.discover.waitUntilSearchingHasFinished();
      expect(await dataGrid.getHeaderFields()).to.eql(['ip', 'bytes']);

      await PageObjects.discover.clickNewSearchButton();
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.discover.waitUntilSearchingHasFinished();
      expect(await dataGrid.getHeaderFields()).to.eql(['@timestamp', 'Document']);
    });
  });
}
