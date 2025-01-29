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
  const { common, discover, timePicker, header, unifiedFieldList } = getPageObjects([
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
      await timePicker.setDefaultAbsoluteRangeViaUiSettings();
      await common.navigateToApp('discover');
      await header.waitUntilLoadingHasFinished();
      await discover.waitUntilSearchingHasFinished();
    });

    afterEach(async () => {
      await kibanaServer.importExport.unload('test/functional/fixtures/kbn_archiver/discover');
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.uiSettings.replace({});
    });

    describe('search', function () {
      beforeEach(async () => {
        await dataGrid.clickRowToggle();
        await discover.isShowingDocViewer();
        await retry.waitFor('rendered items', async () => {
          return (await find.allByCssSelector('.kbnDocViewer__fieldName')).length > 0;
        });
      });

      afterEach(async () => {
        const fieldSearch = await testSubjects.find('clearSearchButton');
        await fieldSearch.click();
      });

      it('should be able to search by string', async function () {
        await discover.findFieldByNameOrValueInDocViewer('geo');

        await retry.waitFor('first updates', async () => {
          return (await find.allByCssSelector('.kbnDocViewer__fieldName')).length === 4;
        });

        await discover.findFieldByNameOrValueInDocViewer('.sr');

        await retry.waitFor('second updates', async () => {
          return (await find.allByCssSelector('.kbnDocViewer__fieldName')).length === 2;
        });
      });

      it('should be able to search by wildcard', async function () {
        await discover.findFieldByNameOrValueInDocViewer('relatedContent*image');
        await retry.waitFor('updates', async () => {
          return (await find.allByCssSelector('.kbnDocViewer__fieldName')).length === 2;
        });
      });

      it('should be able to search with spaces as wildcard', async function () {
        await discover.findFieldByNameOrValueInDocViewer('relatedContent image');
        await retry.waitFor('updates', async () => {
          return (await find.allByCssSelector('.kbnDocViewer__fieldName')).length === 4;
        });
      });

      it('should be able to search with fuzzy search (1 typo)', async function () {
        await discover.findFieldByNameOrValueInDocViewer('rel4tedContent.art');

        await retry.waitFor('updates', async () => {
          return (await find.allByCssSelector('.kbnDocViewer__fieldName')).length === 3;
        });
      });

      it('should ignore empty search', async function () {
        await discover.findFieldByNameOrValueInDocViewer('   '); // only spaces

        await retry.waitFor('the clear button', async () => {
          return await testSubjects.exists('clearSearchButton');
        });

        // expect no changes in the list
        await retry.waitFor('all items', async () => {
          return (await find.allByCssSelector('.kbnDocViewer__fieldName')).length > 0;
        });
      });

      it('should be able to search by field value', async function () {
        await discover.findFieldByNameOrValueInDocViewer('time');

        await retry.waitFor('updates', async () => {
          return (await find.allByCssSelector('.kbnDocViewer__fieldName')).length === 5;
        });
      });

      it('should be able to search by field raw value', async function () {
        await discover.findFieldByNameOrValueInDocViewer('2015-09-22T23:50:13.253Z');

        await retry.waitFor('updates', async () => {
          return (await find.allByCssSelector('.kbnDocViewer__fieldName')).length === 3;
        });
      });
    });

    describe('filter by field type', function () {
      beforeEach(async () => {
        await dataGrid.clickRowToggle();
        await discover.isShowingDocViewer();
        await retry.waitFor('rendered items', async () => {
          return (await find.allByCssSelector('.kbnDocViewer__fieldName')).length > 0;
        });
      });

      it('should reveal and hide the filter form when the toggle is clicked', async function () {
        await discover.openFilterByFieldTypeInDocViewer();
        expect(await find.allByCssSelector('[data-test-subj*="typeFilter"]')).to.have.length(6);
        await discover.closeFilterByFieldTypeInDocViewer();
      });

      it('should filter by field type', async function () {
        const initialFieldsCount = (await find.allByCssSelector('.kbnDocViewer__fieldName')).length;

        await discover.openFilterByFieldTypeInDocViewer();

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
        await discover.selectTextBaseLang();

        const testQuery = `from logstash-* | limit 10000`;
        await monacoEditor.setCodeEditorValue(testQuery);
        await testSubjects.click('querySubmitButton');
        await header.waitUntilLoadingHasFinished();
        await discover.waitUntilSearchingHasFinished();

        await dataGrid.clickRowToggle();
        await discover.isShowingDocViewer();
        await retry.waitFor('rendered items', async () => {
          return (await find.allByCssSelector('.kbnDocViewer__fieldName')).length > 0;
        });

        const initialFieldsCount = (await find.allByCssSelector('.kbnDocViewer__fieldName')).length;
        const numberFieldsCount = 6;

        expect(initialFieldsCount).to.above(numberFieldsCount);

        const pinnedFieldsCount = 1;
        await dataGrid.togglePinActionInFlyout('agent');

        await discover.openFilterByFieldTypeInDocViewer();
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
        await discover.selectTextBaseLang();
        await header.waitUntilLoadingHasFinished();
        await discover.waitUntilSearchingHasFinished();
        await unifiedFieldList.waitUntilSidebarHasLoaded();

        const testQuery = 'from logstash-* | sort @timestamp | limit 10000';
        await monacoEditor.setCodeEditorValue(testQuery);
        await testSubjects.click('querySubmitButton');
        await header.waitUntilLoadingHasFinished();
        await discover.waitUntilSearchingHasFinished();
        await unifiedFieldList.waitUntilSidebarHasLoaded();
        await dataGrid.clickRowToggle();
        await discover.isShowingDocViewer();
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
        await discover.findFieldByNameOrValueInDocViewer('machine');
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

    describe('show only selected fields in ES|QL mode', function () {
      beforeEach(async () => {
        await discover.selectTextBaseLang();
        await header.waitUntilLoadingHasFinished();
        await discover.waitUntilSearchingHasFinished();
      });

      it('should disable the switch when no fields are selected', async function () {
        const testQuery = 'from logstash-* | sort @timestamp | limit 10';
        await monacoEditor.setCodeEditorValue(testQuery);
        await testSubjects.click('querySubmitButton');
        await header.waitUntilLoadingHasFinished();
        await discover.waitUntilSearchingHasFinished();
        await dataGrid.clickRowToggle();
        await discover.isShowingDocViewer();

        const showOnlySelectedFieldsSwitch = await testSubjects.find(
          'unifiedDocViewerShowOnlySelectedFieldsSwitch'
        );
        expect(await showOnlySelectedFieldsSwitch.getAttribute('disabled')).to.be('true');

        const fieldNameCells = await find.allByCssSelector('.kbnDocViewer__fieldName');
        const fieldNames = await Promise.all(fieldNameCells.map((cell) => cell.getVisibleText()));

        expect(
          fieldNames.join(',').startsWith('@message,@tags,@timestamp,agent,bytes,clientip')
        ).to.be(true);
      });

      it('should allow toggling the switch', async function () {
        const testQuery = 'from logstash-* | sort @timestamp | limit 10';
        await monacoEditor.setCodeEditorValue(testQuery);
        await testSubjects.click('querySubmitButton');
        await header.waitUntilLoadingHasFinished();
        await discover.waitUntilSearchingHasFinished();

        await unifiedFieldList.clickFieldListItemAdd('agent.raw');
        await header.waitUntilLoadingHasFinished();
        await unifiedFieldList.clickFieldListItemAdd('agent');
        await header.waitUntilLoadingHasFinished();
        await discover.waitUntilSearchingHasFinished();

        await dataGrid.clickRowToggle();
        await discover.isShowingDocViewer();

        const showOnlySelectedFieldsSwitch = await testSubjects.find(
          'unifiedDocViewerShowOnlySelectedFieldsSwitch'
        );
        expect(await showOnlySelectedFieldsSwitch.getAttribute('disabled')).to.be(null);

        let fieldNameCells = await find.allByCssSelector('.kbnDocViewer__fieldName');
        let fieldNames = await Promise.all(fieldNameCells.map((cell) => cell.getVisibleText()));

        expect(
          fieldNames.join(',').startsWith('@message,@tags,@timestamp,agent,bytes,clientip')
        ).to.be(true);

        await showOnlySelectedFieldsSwitch.click();

        await retry.waitFor('updates after switching to show only selected', async () => {
          fieldNameCells = await find.allByCssSelector('.kbnDocViewer__fieldName');
          fieldNames = await Promise.all(fieldNameCells.map((cell) => cell.getVisibleText()));
          return fieldNames.join(',') === 'agent.raw,agent';
        });

        await dataGrid.togglePinActionInFlyout('agent');

        await retry.waitFor('updates after pinning the last field', async () => {
          fieldNameCells = await find.allByCssSelector('.kbnDocViewer__fieldName');
          fieldNames = await Promise.all(fieldNameCells.map((cell) => cell.getVisibleText()));
          return fieldNames.join(',') === 'agent,agent.raw';
        });

        await showOnlySelectedFieldsSwitch.click();

        await retry.waitFor('updates after switching from showing only selected', async () => {
          fieldNameCells = await find.allByCssSelector('.kbnDocViewer__fieldName');
          fieldNames = await Promise.all(fieldNameCells.map((cell) => cell.getVisibleText()));
          return fieldNames.join(',').startsWith('agent,@message,@tags');
        });
      });
    });

    describe('show only selected fields in data view mode', function () {
      it('should disable the switch when no fields are selected', async function () {
        await dataGrid.clickRowToggle();
        await discover.isShowingDocViewer();

        const showOnlySelectedFieldsSwitch = await testSubjects.find(
          'unifiedDocViewerShowOnlySelectedFieldsSwitch'
        );
        expect(await showOnlySelectedFieldsSwitch.getAttribute('disabled')).to.be('true');

        const fieldNameCells = await find.allByCssSelector('.kbnDocViewer__fieldName');
        const fieldNames = await Promise.all(fieldNameCells.map((cell) => cell.getVisibleText()));

        expect(fieldNames.join(',').startsWith('_id,_ignored,_index,_score,@message')).to.be(true);
      });

      it('should allow toggling the switch', async function () {
        await unifiedFieldList.clickFieldListItemAdd('bytes');
        await header.waitUntilLoadingHasFinished();
        await unifiedFieldList.clickFieldListItemAdd('@tags');
        await header.waitUntilLoadingHasFinished();
        await discover.waitUntilSearchingHasFinished();

        await dataGrid.clickRowToggle();
        await discover.isShowingDocViewer();

        const showOnlySelectedFieldsSwitch = await testSubjects.find(
          'unifiedDocViewerShowOnlySelectedFieldsSwitch'
        );
        expect(await showOnlySelectedFieldsSwitch.getAttribute('disabled')).to.be(null);

        let fieldNameCells = await find.allByCssSelector('.kbnDocViewer__fieldName');
        let fieldNames = await Promise.all(fieldNameCells.map((cell) => cell.getVisibleText()));

        expect(fieldNames.join(',').startsWith('_id,_ignored,_index,_score,@message')).to.be(true);

        await showOnlySelectedFieldsSwitch.click();

        await retry.waitFor('updates after switching to show only selected', async () => {
          fieldNameCells = await find.allByCssSelector('.kbnDocViewer__fieldName');
          fieldNames = await Promise.all(fieldNameCells.map((cell) => cell.getVisibleText()));
          return fieldNames.join(',') === '@timestamp,bytes,@tags';
        });

        await dataGrid.togglePinActionInFlyout('bytes');

        await retry.waitFor('updates after pinning the last field', async () => {
          fieldNameCells = await find.allByCssSelector('.kbnDocViewer__fieldName');
          fieldNames = await Promise.all(fieldNameCells.map((cell) => cell.getVisibleText()));
          return fieldNames.join(',') === 'bytes,@timestamp,@tags';
        });

        await showOnlySelectedFieldsSwitch.click();

        await retry.waitFor('updates after switching from showing only selected', async () => {
          fieldNameCells = await find.allByCssSelector('.kbnDocViewer__fieldName');
          fieldNames = await Promise.all(fieldNameCells.map((cell) => cell.getVisibleText()));
          return fieldNames.join(',').startsWith('bytes,_id,_ignored,_index,_score,@message');
        });
      });
    });

    describe('pinning fields', function () {
      it('should be able to pin and unpin fields', async function () {
        await dataGrid.clickRowToggle();
        await discover.isShowingDocViewer();
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

    describe('flyout', () => {
      let originalScreenSize = { width: 0, height: 0 };

      const reduceScreenWidth = async () => {
        await browser.setWindowSize(800, originalScreenSize.height);
      };

      const restoreScreenWidth = async () => {
        await browser.setWindowSize(originalScreenSize.width, originalScreenSize.height);
      };

      before(async () => {
        originalScreenSize = await browser.getWindowSize();
      });

      beforeEach(async () => {
        // open the flyout once initially to ensure table is the default tab
        await dataGrid.clickRowToggle();
        await discover.isShowingDocViewer();
        await dataGrid.closeFlyout();
      });

      afterEach(async () => {
        await restoreScreenWidth();
      });

      describe('keyboard navigation', () => {
        it('should navigate between documents with arrow keys', async () => {
          await dataGrid.clickRowToggle({ defaultTabId: false });
          await discover.isShowingDocViewer();
          await testSubjects.existOrFail(`docViewerFlyoutNavigationPage-0`);
          await browser.pressKeys(browser.keys.ARROW_RIGHT);
          await testSubjects.existOrFail(`docViewerFlyoutNavigationPage-1`);
          await browser.pressKeys(browser.keys.ARROW_RIGHT);
          await testSubjects.existOrFail(`docViewerFlyoutNavigationPage-2`);
          await browser.pressKeys(browser.keys.ARROW_LEFT);
          await testSubjects.existOrFail(`docViewerFlyoutNavigationPage-1`);
          await browser.pressKeys(browser.keys.ARROW_LEFT);
          await testSubjects.existOrFail(`docViewerFlyoutNavigationPage-0`);
        });

        it('should not navigate between documents with arrow keys when the search input is focused', async () => {
          await dataGrid.clickRowToggle({ defaultTabId: false });
          await discover.isShowingDocViewer();
          await testSubjects.existOrFail(`docViewerFlyoutNavigationPage-0`);
          await browser.pressKeys(browser.keys.ARROW_RIGHT);
          await testSubjects.existOrFail(`docViewerFlyoutNavigationPage-1`);
          await testSubjects.click('unifiedDocViewerFieldsSearchInput');
          await browser.pressKeys(browser.keys.ARROW_RIGHT);
          await testSubjects.existOrFail(`docViewerFlyoutNavigationPage-1`);
          await browser.pressKeys(browser.keys.TAB);
          await browser.pressKeys(browser.keys.ARROW_RIGHT);
          await testSubjects.existOrFail(`docViewerFlyoutNavigationPage-2`);
        });

        it('should not navigate between documents with arrow keys when the data grid is focused', async () => {
          await dataGrid.clickRowToggle({ defaultTabId: false });
          await discover.isShowingDocViewer();
          await testSubjects.existOrFail(`docViewerFlyoutNavigationPage-0`);
          await browser.pressKeys(browser.keys.ARROW_RIGHT);
          await testSubjects.existOrFail(`docViewerFlyoutNavigationPage-1`);
          await testSubjects.click('dataGridHeaderCell-name');
          await browser.pressKeys(browser.keys.ARROW_RIGHT);
          await testSubjects.existOrFail(`docViewerFlyoutNavigationPage-1`);
          await browser.pressKeys(browser.keys.TAB);
          await browser.pressKeys(browser.keys.ARROW_RIGHT);
          await testSubjects.existOrFail(`docViewerFlyoutNavigationPage-2`);
        });

        it('should close the flyout with the escape key', async () => {
          await dataGrid.clickRowToggle({ defaultTabId: false });
          expect(await discover.isShowingDocViewer()).to.be(true);
          await browser.pressKeys(browser.keys.ESCAPE);
          expect(await discover.isShowingDocViewer()).to.be(false);
        });

        it('should close the flyout with the escape key when the search input is focused', async () => {
          await dataGrid.clickRowToggle({ defaultTabId: false });
          expect(await discover.isShowingDocViewer()).to.be(true);
          await testSubjects.click('unifiedDocViewerFieldsSearchInput');
          await browser.pressKeys(browser.keys.ESCAPE);
          expect(await discover.isShowingDocViewer()).to.be(false);
        });

        it('should not close the flyout with the escape key when the data grid is focused', async () => {
          await dataGrid.clickRowToggle({ defaultTabId: false });
          expect(await discover.isShowingDocViewer()).to.be(true);
          await testSubjects.click('dataGridHeaderCell-name');
          await browser.pressKeys(browser.keys.ESCAPE);
          expect(await discover.isShowingDocViewer()).to.be(true);
          await browser.pressKeys(browser.keys.TAB);
          await browser.pressKeys(browser.keys.ESCAPE);
          expect(await discover.isShowingDocViewer()).to.be(false);
        });
      });

      describe('accessibility', () => {
        it('should focus the flyout on open, and retain focus when resizing between push and overlay flyouts', async () => {
          // push -> overlay -> push
          await dataGrid.clickRowToggle({ defaultTabId: false });
          await discover.isShowingDocViewer();
          let activeElement = await find.activeElement();
          expect(await activeElement.getAttribute('data-test-subj')).to.be('docViewerFlyout');
          await reduceScreenWidth();
          activeElement = await find.activeElement();
          expect(await activeElement.getAttribute('data-test-subj')).to.be('docViewerFlyout');
          await restoreScreenWidth();
          activeElement = await find.activeElement();
          expect(await activeElement.getAttribute('data-test-subj')).to.be('docViewerFlyout');
          // overlay -> push -> overlay
          await browser.pressKeys(browser.keys.ESCAPE);
          await reduceScreenWidth();
          await dataGrid.clickRowToggle({ defaultTabId: false });
          await discover.isShowingDocViewer();
          activeElement = await find.activeElement();
          expect(await activeElement.getAttribute('data-test-subj')).to.be('docViewerFlyout');
          await restoreScreenWidth();
          activeElement = await find.activeElement();
          expect(await activeElement.getAttribute('data-test-subj')).to.be('docViewerFlyout');
          await reduceScreenWidth();
          activeElement = await find.activeElement();
          expect(await activeElement.getAttribute('data-test-subj')).to.be('docViewerFlyout');
        });

        it('should return focus to the trigger element when the flyout is closed', async () => {
          // push
          await dataGrid.clickRowToggle({ defaultTabId: false });
          await discover.isShowingDocViewer();
          await browser.pressKeys(browser.keys.ESCAPE);
          let activeElement = await find.activeElement();
          expect(await activeElement.getAttribute('data-test-subj')).to.be(
            'docTableExpandToggleColumn'
          );
          // push -> overlay
          await dataGrid.clickRowToggle({ defaultTabId: false });
          await discover.isShowingDocViewer();
          await reduceScreenWidth();
          await browser.pressKeys(browser.keys.ESCAPE);
          activeElement = await find.activeElement();
          expect(await activeElement.getAttribute('data-test-subj')).to.be(
            'docTableExpandToggleColumn'
          );
          // overlay
          await dataGrid.clickRowToggle({ defaultTabId: false });
          await discover.isShowingDocViewer();
          await browser.pressKeys(browser.keys.ESCAPE);
          activeElement = await find.activeElement();
          expect(await activeElement.getAttribute('data-test-subj')).to.be(
            'docTableExpandToggleColumn'
          );
          // overlay -> push
          await dataGrid.clickRowToggle({ defaultTabId: false });
          await discover.isShowingDocViewer();
          await restoreScreenWidth();
          await browser.pressKeys(browser.keys.ESCAPE);
          activeElement = await find.activeElement();
          expect(await activeElement.getAttribute('data-test-subj')).to.be(
            'docTableExpandToggleColumn'
          );
        });

        it('should show custom screen reader description push flyout is active', async () => {
          await dataGrid.clickRowToggle({ defaultTabId: false });
          await discover.isShowingDocViewer();
          await testSubjects.existOrFail('unifiedDocViewerScreenReaderDescription', {
            allowHidden: true,
          });
        });

        it('should not show custom screen reader description when overlay flyout active', async () => {
          await dataGrid.clickRowToggle({ defaultTabId: false });
          await discover.isShowingDocViewer();
          await reduceScreenWidth();
          expect(
            await testSubjects.exists('unifiedDocViewerScreenReaderDescription', {
              allowHidden: true,
            })
          ).to.be(false);
        });

        it('should use expected a11y attributes', async () => {
          // push flyout
          await dataGrid.clickRowToggle({ defaultTabId: false });
          await discover.isShowingDocViewer();
          let role = await testSubjects.getAttribute('docViewerFlyout', 'role');
          let tabindex = await testSubjects.getAttribute('docViewerFlyout', 'tabindex');
          let describedBy = await testSubjects.getAttribute('docViewerFlyout', 'aria-describedby');
          let noFocusLock = await testSubjects.getAttribute(
            'docViewerFlyout',
            'data-no-focus-lock'
          );
          expect(role).to.be('dialog');
          expect(tabindex).to.be('0');
          expect(await find.existsByCssSelector(`[id="${describedBy}"]`)).to.be(true);
          expect(noFocusLock).to.be('true');
          // overlay flyout
          await reduceScreenWidth();
          role = await testSubjects.getAttribute('docViewerFlyout', 'role');
          tabindex = await testSubjects.getAttribute('docViewerFlyout', 'tabindex');
          describedBy = await testSubjects.getAttribute('docViewerFlyout', 'aria-describedby');
          noFocusLock = await testSubjects.getAttribute('docViewerFlyout', 'data-no-focus-lock');
          expect(role).to.be('dialog');
          expect(tabindex).to.be('0');
          expect(await find.existsByCssSelector(`[id="${describedBy}"]`)).to.be(true);
          expect(noFocusLock).to.be(null);
        });
      });
    });
  });
}
