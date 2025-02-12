/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import { Key } from 'selenium-webdriver';
import { INPUT_TEST_SUBJ } from '@kbn/data-grid-in-table-search';
import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const browser = getService('browser');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const dataGrid = getService('dataGrid');
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const queryBar = getService('queryBar');
  const monacoEditor = getService('monacoEditor');
  const security = getService('security');
  const { common, discover, timePicker, unifiedFieldList, header } = getPageObjects([
    'common',
    'discover',
    'timePicker',
    'unifiedFieldList',
    'header',
  ]);
  const defaultSettings = { defaultIndex: 'logstash-*' };

  describe('discover data grid in-table search', function describeIndexTests() {
    before(async () => {
      await security.testUser.setRoles(['kibana_admin', 'test_logstash_reader']);
      await browser.setWindowSize(1200, 2000);
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

    it('should show highlights for in-table search', async () => {
      expect(await dataGrid.getCurrentPageNumber()).to.be('1');

      await dataGrid.runInTableSearch('Sep 22, 2015 @ 18:16:13.025');
      expect(await dataGrid.getInTableSearchMatchesCounter()).to.be('1/3');
      expect(await dataGrid.getInTableSearchCellMatchesCount(1, '@timestamp')).to.be(1);
      expect(await dataGrid.getInTableSearchCellMatchesCount(1, '_source')).to.be(2);
      expect(await dataGrid.getInTableSearchCellMatchesCount(2, '@timestamp')).to.be(0);
      expect(await dataGrid.getInTableSearchCellMatchesCount(2, '_source')).to.be(0);
      expect(await dataGrid.getCurrentPageNumber()).to.be('3');

      await dataGrid.runInTableSearch('http');
      expect(await dataGrid.getInTableSearchMatchesCounter()).to.be('1/6386');
      expect(await dataGrid.getInTableSearchCellMatchesCount(0, '@timestamp')).to.be(0);
      expect(await dataGrid.getInTableSearchCellMatchesCount(0, '_source')).to.be(13);
      expect(await dataGrid.getCurrentPageNumber()).to.be('1');

      await dataGrid.exitInTableSearch();

      await retry.waitFor('no highlights', async () => {
        return (await dataGrid.getInTableSearchCellMatchesCount(0, '@timestamp')) === 0;
      });
    });

    it('uses different colors for highlights in the table', async () => {
      await discover.selectTextBaseLang();
      await header.waitUntilLoadingHasFinished();
      await discover.waitUntilSearchingHasFinished();
      const testQuery = `from logstash-* | sort @timestamp | limit 10`;
      await monacoEditor.setCodeEditorValue(testQuery);
      await testSubjects.click('querySubmitButton');
      await header.waitUntilLoadingHasFinished();
      await discover.waitUntilSearchingHasFinished();

      await dataGrid.runInTableSearch('2015 @');
      expect(await dataGrid.getInTableSearchMatchesCounter()).to.be('1/30');
      expect(await dataGrid.getInTableSearchCellMatchesCount(0, '@timestamp')).to.be(1);
      expect(await dataGrid.getInTableSearchCellMatchesCount(0, '_source')).to.be(2);

      const firstRowFirstCellMatches = await dataGrid.getInTableSearchCellMatchElements(
        0,
        '@timestamp'
      );
      const secondRowRowFirstCellMatches = await dataGrid.getInTableSearchCellMatchElements(
        1,
        '@timestamp'
      );
      const activeMatchBackgroundColor = await firstRowFirstCellMatches[0].getComputedStyle(
        'background-color'
      );
      const anotherMatchBackgroundColor = await secondRowRowFirstCellMatches[0].getComputedStyle(
        'background-color'
      );
      expect(activeMatchBackgroundColor).to.contain('rgba');
      expect(anotherMatchBackgroundColor).to.contain('rgba');
      expect(activeMatchBackgroundColor).not.to.be(anotherMatchBackgroundColor);
    });

    it('can navigate between matches', async () => {
      await dataGrid.changeRowsPerPageTo(10);
      await unifiedFieldList.clickFieldListItemAdd('extension');
      await header.waitUntilLoadingHasFinished();
      await discover.waitUntilSearchingHasFinished();
      await queryBar.setQuery('response : 404 and @tags.raw : "info" and bytes < 1000');
      await queryBar.submitQuery();
      await header.waitUntilLoadingHasFinished();
      await discover.waitUntilSearchingHasFinished();

      await dataGrid.runInTableSearch('php');

      expect(await dataGrid.getInTableSearchMatchesCounter()).to.be('1/4');
      expect(await dataGrid.getCurrentPageNumber()).to.be('1');

      await dataGrid.goToNextInTableSearchMatch();
      expect(await dataGrid.getInTableSearchMatchesCounter()).to.be('2/4');
      expect(await dataGrid.getCurrentPageNumber()).to.be('1');

      await dataGrid.goToNextInTableSearchMatch();
      expect(await dataGrid.getInTableSearchMatchesCounter()).to.be('3/4');
      expect(await dataGrid.getCurrentPageNumber()).to.be('2');

      await dataGrid.goToNextInTableSearchMatch();
      expect(await dataGrid.getInTableSearchMatchesCounter()).to.be('4/4');
      expect(await dataGrid.getCurrentPageNumber()).to.be('3');

      await dataGrid.goToNextInTableSearchMatch();
      expect(await dataGrid.getInTableSearchMatchesCounter()).to.be('1/4');
      expect(await dataGrid.getCurrentPageNumber()).to.be('1');
    });

    it('overrides cmd+f if grid element was in focus', async () => {
      const cell = await dataGrid.getCellElementByColumnName(0, '@timestamp');
      await cell.click();

      await browser.getActions().keyDown(Key.COMMAND).sendKeys('f').perform();
      await retry.waitFor('in-table search input is visible', async () => {
        return await testSubjects.exists(INPUT_TEST_SUBJ);
      });
    });
  });
}
