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
  const esArchiver = getService('esArchiver');
  const PageObjects = getPageObjects([
    'common',
    'discover',
    'timePicker',
    'header',
    'unifiedSearch',
  ]);
  const kibanaServer = getService('kibanaServer');
  const filterBar = getService('filterBar');
  const queryBar = getService('queryBar');
  const monacoEditor = getService('monacoEditor');
  const testSubjects = getService('testSubjects');
  const security = getService('security');

  describe('discover new search action', function () {
    before(async function () {
      await security.testUser.setRoles(['kibana_admin', 'test_logstash_reader']);
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/discover.json');
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
      await kibanaServer.uiSettings.replace({ defaultIndex: 'logstash-*' });
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.timePicker.setDefaultAbsoluteRange();
    });

    after(async () => {
      await kibanaServer.importExport.unload('test/functional/fixtures/kbn_archiver/discover.json');
      await esArchiver.unload('test/functional/fixtures/es_archiver/logstash_functional');
      await kibanaServer.uiSettings.replace({});
      await kibanaServer.savedObjects.cleanStandardList();
    });

    it('should work correctly for data view mode', async function () {
      await filterBar.addFilter({ field: 'extension', operation: 'is', value: 'png' });
      await PageObjects.header.waitUntilLoadingHasFinished();
      await queryBar.setQuery('bytes > 15000');
      await queryBar.submitQuery();
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.discover.waitUntilSearchingHasFinished();
      expect(await PageObjects.discover.getHitCount()).to.be('353');
      expect(await filterBar.hasFilter('extension', 'png')).to.be(true);
      expect(await queryBar.getQueryString()).to.be('bytes > 15000');

      await PageObjects.discover.clickNewSearchButton();
      await PageObjects.discover.waitUntilSearchingHasFinished();
      expect(await PageObjects.discover.getHitCount()).to.be('14,004');
      expect(await filterBar.hasFilter('extension', 'png')).to.be(false);
      expect(await queryBar.getQueryString()).to.be('');
    });

    it('should work correctly for a saved search in data view mode', async function () {
      await PageObjects.discover.createAdHocDataView('logs*', true);
      await filterBar.addFilter({ field: 'extension', operation: 'is', value: 'css' });
      await PageObjects.header.waitUntilLoadingHasFinished();
      await queryBar.setQuery('bytes > 100');
      await queryBar.submitQuery();
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.discover.waitUntilSearchingHasFinished();
      expect(await PageObjects.discover.getHitCount()).to.be('2,108');
      expect(await filterBar.hasFilter('extension', 'css')).to.be(true);
      expect(await queryBar.getQueryString()).to.be('bytes > 100');

      await PageObjects.discover.saveSearch('adHoc');
      await PageObjects.discover.waitUntilSearchingHasFinished();
      expect(await PageObjects.discover.getHitCount()).to.be('2,108');

      await PageObjects.discover.clickNewSearchButton();
      await PageObjects.discover.waitUntilSearchingHasFinished();
      expect(await PageObjects.discover.getHitCount()).to.be('14,004');
      expect(await filterBar.hasFilter('extension', 'css')).to.be(false);
      expect(await queryBar.getQueryString()).to.be('');
      expect(
        await PageObjects.unifiedSearch.getSelectedDataView('discover-dataView-switch-link')
      ).to.be('logs**');
      expect(await PageObjects.discover.isAdHocDataViewSelected()).to.be(true);
    });

    it('should work correctly for ESQL mode', async () => {
      await PageObjects.discover.selectTextBaseLang();

      const testQuery = `from logstash-* | limit 100 | stats countB = count(bytes) by geo.dest | sort countB`;
      await monacoEditor.setCodeEditorValue(testQuery);
      await testSubjects.click('querySubmitButton');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.discover.waitUntilSearchingHasFinished();
      expect(await PageObjects.discover.getHitCountInt()).to.greaterThan(10);
      await testSubjects.existOrFail('unifiedHistogramSuggestionSelector');

      await PageObjects.discover.clickNewSearchButton();
      await PageObjects.discover.waitUntilSearchingHasFinished();
      expect(await monacoEditor.getCodeEditorValue()).to.be('from logstash-* | limit 10');
      await testSubjects.missingOrFail('unifiedHistogramSuggestionSelector'); // histogram also updated
      expect(await PageObjects.discover.getHitCount()).to.be('10');
    });

    it('should work correctly for a saved search in ESQL mode', async () => {
      await PageObjects.discover.selectTextBaseLang();

      const testQuery = `from logstash-* | limit 100 | stats countB = count(bytes) by geo.dest | sort countB`;
      await monacoEditor.setCodeEditorValue(testQuery);
      await testSubjects.click('querySubmitButton');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.discover.waitUntilSearchingHasFinished();
      expect(await PageObjects.discover.getHitCountInt()).to.greaterThan(10);
      await testSubjects.existOrFail('unifiedHistogramSuggestionSelector');

      await PageObjects.discover.saveSearch('esql');
      await PageObjects.discover.waitUntilSearchingHasFinished();
      expect(await PageObjects.discover.getHitCountInt()).to.greaterThan(10);

      await PageObjects.discover.clickNewSearchButton();
      await PageObjects.discover.waitUntilSearchingHasFinished();
      expect(await monacoEditor.getCodeEditorValue()).to.be('from logstash-* | limit 10');
      await testSubjects.missingOrFail('unifiedHistogramSuggestionSelector'); // histogram also updated
      expect(await PageObjects.discover.getHitCount()).to.be('10');
    });
  });
}
