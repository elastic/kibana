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
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const PageObjects = getPageObjects([
    'common',
    'discover',
    'timePicker',
    'header',
    'unifiedFieldList',
  ]);
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const retry = getService('retry');
  const dataGrid = getService('dataGrid');
  const monacoEditor = getService('monacoEditor');
  const browser = getService('browser');

  describe('discover doc viewer', function describeIndexTests() {
    before(async function () {
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
      await browser.setWindowSize(1600, 1200);
    });

    beforeEach(async () => {
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/discover');
      await kibanaServer.uiSettings.replace({
        defaultIndex: 'logstash-*',
        hideAnnouncements: true,
      });
      await PageObjects.timePicker.setDefaultAbsoluteRangeViaUiSettings();
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.discover.waitUntilSearchingHasFinished();
    });

    afterEach(async () => {
      await kibanaServer.importExport.unload('test/functional/fixtures/kbn_archiver/discover');
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.uiSettings.replace({});
    });

    describe('search', function () {
      beforeEach(async () => {
        await dataGrid.clickRowToggle();
        await PageObjects.discover.isShowingDocViewer();
        await retry.waitFor('rendered items', async () => {
          return (await find.allByCssSelector('.kbnDocViewer__fieldName')).length > 0;
        });
      });

      afterEach(async () => {
        const fieldSearch = await testSubjects.find('clearSearchButton');
        await fieldSearch.click();
      });

      it('should be able to search by string', async function () {
        await PageObjects.discover.findFieldByNameInDocViewer('geo');

        await retry.waitFor('first updates', async () => {
          return (await find.allByCssSelector('.kbnDocViewer__fieldName')).length === 4;
        });

        await PageObjects.discover.findFieldByNameInDocViewer('.sr');

        await retry.waitFor('second updates', async () => {
          return (await find.allByCssSelector('.kbnDocViewer__fieldName')).length === 2;
        });
      });

      it('should be able to search by wildcard', async function () {
        await PageObjects.discover.findFieldByNameInDocViewer('relatedContent*image');
        await retry.waitFor('updates', async () => {
          return (await find.allByCssSelector('.kbnDocViewer__fieldName')).length === 2;
        });
      });

      it('should be able to search with spaces as wildcard', async function () {
        await PageObjects.discover.findFieldByNameInDocViewer('relatedContent image');
        await retry.waitFor('updates', async () => {
          return (await find.allByCssSelector('.kbnDocViewer__fieldName')).length === 4;
        });
      });

      it('should be able to search with fuzzy search (1 typo)', async function () {
        await PageObjects.discover.findFieldByNameInDocViewer('rel4tedContent.art');

        await retry.waitFor('updates', async () => {
          return (await find.allByCssSelector('.kbnDocViewer__fieldName')).length === 3;
        });
      });

      it('should ignore empty search', async function () {
        await PageObjects.discover.findFieldByNameInDocViewer('   '); // only spaces

        await retry.waitFor('the clear button', async () => {
          return await testSubjects.exists('clearSearchButton');
        });

        // expect no changes in the list
        await retry.waitFor('all items', async () => {
          return (await find.allByCssSelector('.kbnDocViewer__fieldName')).length > 0;
        });
      });
    });

    describe('filter by field type', function () {
      beforeEach(async () => {
        await dataGrid.clickRowToggle();
        await PageObjects.discover.isShowingDocViewer();
        await retry.waitFor('rendered items', async () => {
          return (await find.allByCssSelector('.kbnDocViewer__fieldName')).length > 0;
        });
      });

      it('should reveal and hide the filter form when the toggle is clicked', async function () {
        await PageObjects.discover.openFilterByFieldTypeInDocViewer();
        expect(await find.allByCssSelector('[data-test-subj*="typeFilter"]')).to.have.length(6);
        await PageObjects.discover.closeFilterByFieldTypeInDocViewer();
      });

      it('should filter by field type', async function () {
        const initialFieldsCount = (await find.allByCssSelector('.kbnDocViewer__fieldName')).length;

        await PageObjects.discover.openFilterByFieldTypeInDocViewer();

        await testSubjects.click('typeFilter-date');

        await retry.waitFor('first updates', async () => {
          return (await find.allByCssSelector('.kbnDocViewer__fieldName')).length === 4;
        });

        await testSubjects.click('typeFilter-number');

        await retry.waitFor('second updates', async () => {
          return (await find.allByCssSelector('.kbnDocViewer__fieldName')).length === 7;
        });

        await testSubjects.click('unifiedDocViewerFieldsTableFieldTypeFilterClearAll');

        await retry.waitFor('reset', async () => {
          return (
            (await find.allByCssSelector('.kbnDocViewer__fieldName')).length === initialFieldsCount
          );
        });
      });

      it('should show filters by type in ES|QL view', async function () {
        await PageObjects.discover.selectTextBaseLang();

        const testQuery = `from logstash-* | limit 10000`;
        await monacoEditor.setCodeEditorValue(testQuery);
        await testSubjects.click('querySubmitButton');
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.discover.waitUntilSearchingHasFinished();

        await dataGrid.clickRowToggle();
        await PageObjects.discover.isShowingDocViewer();
        await retry.waitFor('rendered items', async () => {
          return (await find.allByCssSelector('.kbnDocViewer__fieldName')).length > 0;
        });

        const initialFieldsCount = (await find.allByCssSelector('.kbnDocViewer__fieldName')).length;
        const numberFieldsCount = 6;

        expect(initialFieldsCount).to.above(numberFieldsCount);

        const pinnedFieldsCount = 1;
        await dataGrid.togglePinActionInFlyout('agent');

        await PageObjects.discover.openFilterByFieldTypeInDocViewer();
        expect(await find.allByCssSelector('[data-test-subj*="typeFilter"]')).to.have.length(6);

        await testSubjects.click('typeFilter-number');

        await retry.waitFor('updates', async () => {
          return (
            (await find.allByCssSelector('.kbnDocViewer__fieldName')).length ===
            numberFieldsCount + pinnedFieldsCount
          );
        });
      });
    });

    describe('hide null values switch - ES|QL mode', function () {
      beforeEach(async () => {
        await PageObjects.discover.selectTextBaseLang();
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.discover.waitUntilSearchingHasFinished();
        await PageObjects.unifiedFieldList.waitUntilSidebarHasLoaded();

        const testQuery = 'from logstash-* | sort @timestamp | limit 10000';
        await monacoEditor.setCodeEditorValue(testQuery);
        await testSubjects.click('querySubmitButton');
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.discover.waitUntilSearchingHasFinished();
        await PageObjects.unifiedFieldList.waitUntilSidebarHasLoaded();
        await dataGrid.clickRowToggle();
        await PageObjects.discover.isShowingDocViewer();
      });

      afterEach(async () => {
        const fieldSearch = await testSubjects.find('clearSearchButton');
        await fieldSearch.click(); // clear search
        const hideNullValuesSwitch = await testSubjects.find(
          'unifiedDocViewerHideNullValuesSwitch'
        );
        await hideNullValuesSwitch.click(); // make sure the switch is off
      });

      it('should hide fields with null values ', async function () {
        await PageObjects.discover.findFieldByNameInDocViewer('machine');
        const results = (await find.allByCssSelector('.kbnDocViewer__fieldName')).length;
        const hideNullValuesSwitch = await testSubjects.find(
          'unifiedDocViewerHideNullValuesSwitch'
        );
        await hideNullValuesSwitch.click();

        await retry.waitFor('updates', async () => {
          return (await find.allByCssSelector('.kbnDocViewer__fieldName')).length < results;
        });
      });
    });

    describe('pinning fields', function () {
      it('should be able to pin and unpin fields', async function () {
        await dataGrid.clickRowToggle();
        await PageObjects.discover.isShowingDocViewer();
        await retry.waitFor('rendered items', async () => {
          return (await find.allByCssSelector('.kbnDocViewer__fieldName')).length > 0;
        });

        let fieldNameCells = await find.allByCssSelector('.kbnDocViewer__fieldName');
        let fieldNames = await Promise.all(fieldNameCells.map((cell) => cell.getVisibleText()));

        expect(fieldNames.join(',').startsWith('_id,_ignored,_index,_score,@message')).to.be(true);
        expect(await dataGrid.isFieldPinnedInFlyout('agent')).to.be(false);

        await dataGrid.togglePinActionInFlyout('agent');

        fieldNameCells = await find.allByCssSelector('.kbnDocViewer__fieldName');
        fieldNames = await Promise.all(fieldNameCells.map((cell) => cell.getVisibleText()));
        expect(fieldNames.join(',').startsWith('agent,_id,_ignored')).to.be(true);
        expect(await dataGrid.isFieldPinnedInFlyout('agent')).to.be(true);

        await dataGrid.togglePinActionInFlyout('@message');

        fieldNameCells = await find.allByCssSelector('.kbnDocViewer__fieldName');
        fieldNames = await Promise.all(fieldNameCells.map((cell) => cell.getVisibleText()));
        expect(fieldNames.join(',').startsWith('@message,agent,_id,_ignored')).to.be(true);
        expect(await dataGrid.isFieldPinnedInFlyout('@message')).to.be(true);

        await dataGrid.togglePinActionInFlyout('@message');

        fieldNameCells = await find.allByCssSelector('.kbnDocViewer__fieldName');
        fieldNames = await Promise.all(fieldNameCells.map((cell) => cell.getVisibleText()));
        expect(fieldNames.join(',').startsWith('agent,_id,_ignored')).to.be(true);
        expect(await dataGrid.isFieldPinnedInFlyout('agent')).to.be(true);
        expect(await dataGrid.isFieldPinnedInFlyout('@message')).to.be(false);
      });
    });
  });
}
