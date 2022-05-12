/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const browser = getService('browser');
  const log = getService('log');
  const retry = getService('retry');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const docTable = getService('docTable');
  const queryBar = getService('queryBar');
  const find = getService('find');
  const PageObjects = getPageObjects(['common', 'discover', 'header', 'timePicker']);
  const defaultSettings = {
    defaultIndex: 'logstash-*',
  };
  const testSubjects = getService('testSubjects');

  describe('discover doc table', function describeIndexTests() {
    const rowsHardLimit = 500;

    before(async function () {
      log.debug('load kibana index with default index pattern');
      await kibanaServer.savedObjects.clean({ types: ['search', 'index-pattern'] });
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/discover.json');

      // and load a set of makelogs data
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
      await kibanaServer.uiSettings.replace(defaultSettings);
      await PageObjects.timePicker.setDefaultAbsoluteRangeViaUiSettings();
      log.debug('discover doc table');
      await PageObjects.common.navigateToApp('discover');
    });

    it('should show records by default', async function () {
      // with the default range the number of hits is ~14000
      const rows = await PageObjects.discover.getDocTableRows();
      expect(rows.length).to.be.greaterThan(0);
    });

    it('should refresh the table content when changing time window', async function () {
      const initialRows = await PageObjects.discover.getDocTableRows();

      const fromTime = 'Sep 20, 2015 @ 23:00:00.000';
      const toTime = 'Sep 20, 2015 @ 23:14:00.000';

      await PageObjects.timePicker.setAbsoluteRange(fromTime, toTime);
      await PageObjects.discover.waitUntilSearchingHasFinished();

      const finalRows = await PageObjects.discover.getDocTableRows();
      expect(finalRows.length).to.be.below(initialRows.length);
      await PageObjects.timePicker.setDefaultAbsoluteRange();
    });

    describe('classic table in window 900x700', async function () {
      before(async () => {
        await kibanaServer.uiSettings.update({ 'doc_table:legacy': true });
        await browser.setWindowSize(900, 700);
        await PageObjects.common.navigateToApp('discover');
        await PageObjects.discover.waitUntilSearchingHasFinished();
      });

      it('should load more rows when scrolling down the document table', async function () {
        const initialRows = await testSubjects.findAll('docTableRow');
        await testSubjects.scrollIntoView('discoverBackToTop');
        // now count the rows
        await retry.waitFor('next batch of documents to be displayed', async () => {
          const actual = await testSubjects.findAll('docTableRow');
          log.debug(`initial doc nr: ${initialRows.length}, actual doc nr: ${actual.length}`);
          return actual.length > initialRows.length;
        });
      });
    });

    describe('classic table in window 600x700', async function () {
      before(async () => {
        await kibanaServer.uiSettings.update({ 'doc_table:legacy': true });
        await browser.setWindowSize(600, 700);
        await PageObjects.common.navigateToApp('discover');
        await PageObjects.discover.waitUntilSearchingHasFinished();
      });

      it('should load more rows when scrolling down the document table', async function () {
        const initialRows = await testSubjects.findAll('docTableRow');
        await testSubjects.scrollIntoView('discoverBackToTop');
        // now count the rows
        await retry.waitFor('next batch of documents to be displayed', async () => {
          const actual = await testSubjects.findAll('docTableRow');
          log.debug(`initial doc nr: ${initialRows.length}, actual doc nr: ${actual.length}`);
          return actual.length > initialRows.length;
        });
      });
    });

    describe('legacy', async function () {
      before(async () => {
        await kibanaServer.uiSettings.update({ 'doc_table:legacy': true });
        await PageObjects.common.navigateToApp('discover');
        await PageObjects.discover.waitUntilSearchingHasFinished();
      });
      after(async () => {
        await kibanaServer.uiSettings.replace({});
      });
      it(`should load up to ${rowsHardLimit} rows when scrolling at the end of the table`, async function () {
        const initialRows = await testSubjects.findAll('docTableRow');
        // click the Skip to the end of the table
        await PageObjects.discover.skipToEndOfDocTable();
        // now count the rows
        const finalRows = await testSubjects.findAll('docTableRow');
        expect(finalRows.length).to.be.above(initialRows.length);
        expect(finalRows.length).to.be(rowsHardLimit);
        await PageObjects.discover.backToTop();
      });

      it('should go the end and back to top of the classic table when using the accessible buttons', async function () {
        // click the Skip to the end of the table
        await PageObjects.discover.skipToEndOfDocTable();
        // now check the footer text content
        const footer = await PageObjects.discover.getDocTableFooter();
        expect(await footer.getVisibleText()).to.have.string(rowsHardLimit);
        await PageObjects.discover.backToTop();
        // check that the skip to end of the table button now has focus
        const skipButton = await testSubjects.find('discoverSkipTableButton');
        const activeElement = await find.activeElement();
        const activeElementText = await activeElement.getVisibleText();
        const skipButtonText = await skipButton.getVisibleText();
        expect(skipButtonText === activeElementText).to.be(true);
      });

      describe('expand a document row', function () {
        const rowToInspect = 1;
        beforeEach(async function () {
          // close the toggle if open
          const details = await docTable.getDetailsRows();
          if (details.length) {
            await docTable.clickRowToggle({ isAnchorRow: false, rowIndex: rowToInspect - 1 });
          }
        });

        it('should expand the detail row when the toggle arrow is clicked', async function () {
          await retry.try(async function () {
            await docTable.clickRowToggle({ isAnchorRow: false, rowIndex: rowToInspect - 1 });
            const detailsEl = await docTable.getDetailsRows();
            const defaultMessageEl = await detailsEl[0].findByTestSubject(
              'docTableRowDetailsTitle'
            );
            expect(defaultMessageEl).to.be.ok();
          });
        });

        it('should show the detail panel actions', async function () {
          await retry.try(async function () {
            await docTable.clickRowToggle({ isAnchorRow: false, rowIndex: rowToInspect - 1 });
            // const detailsEl = await PageObjects.discover.getDocTableRowDetails(rowToInspect);
            const [surroundingActionEl, singleActionEl] = await docTable.getRowActions({
              isAnchorRow: false,
              rowIndex: rowToInspect - 1,
            });
            expect(surroundingActionEl).to.be.ok();
            expect(singleActionEl).to.be.ok();
            // TODO: test something more meaninful here?
          });
        });

        it('should not close the detail panel actions when data is re-requested', async function () {
          await retry.try(async function () {
            const nrOfFetches = await PageObjects.discover.getNrOfFetches();
            await docTable.clickRowToggle({ isAnchorRow: false, rowIndex: rowToInspect - 1 });
            const detailsEl = await docTable.getDetailsRows();
            const defaultMessageEl = await detailsEl[0].findByTestSubject(
              'docTableRowDetailsTitle'
            );
            expect(defaultMessageEl).to.be.ok();
            await queryBar.submitQuery();
            const nrOfFetchesResubmit = await PageObjects.discover.getNrOfFetches();
            expect(nrOfFetchesResubmit).to.be.above(nrOfFetches);
            const defaultMessageElResubmit = await detailsEl[0].findByTestSubject(
              'docTableRowDetailsTitle'
            );

            expect(defaultMessageElResubmit).to.be.ok();
          });
        });
        it('should show allow toggling columns from the expanded document', async function () {
          await PageObjects.discover.clickNewSearchButton();
          await testSubjects.click('dscExplorerCalloutClose');
          await retry.try(async function () {
            await docTable.clickRowToggle({ isAnchorRow: false, rowIndex: rowToInspect - 1 });

            // add columns
            const fields = ['_id', '_index', 'agent'];
            for (const field of fields) {
              await testSubjects.click(`toggleColumnButton-${field}`);
            }

            const headerWithFields = await docTable.getHeaderFields();
            expect(headerWithFields.join(' ')).to.contain(fields.join(' '));

            // remove columns
            for (const field of fields) {
              await testSubjects.click(`toggleColumnButton-${field}`);
            }

            const headerWithoutFields = await docTable.getHeaderFields();
            expect(headerWithoutFields.join(' ')).not.to.contain(fields.join(' '));
          });
        });
      });

      describe('add and remove columns', function () {
        const extraColumns = ['phpmemory', 'ip'];

        afterEach(async function () {
          for (const column of extraColumns) {
            await PageObjects.discover.clickFieldListItemRemove(column);
            await PageObjects.header.waitUntilLoadingHasFinished();
          }
        });

        it('should add more columns to the table', async function () {
          for (const column of extraColumns) {
            await PageObjects.discover.clearFieldSearchInput();
            await PageObjects.discover.findFieldByName(column);
            await PageObjects.discover.clickFieldListItemAdd(column);
            await PageObjects.header.waitUntilLoadingHasFinished();
            // test the header now
            const docHeader = await find.byCssSelector('thead > tr:nth-child(1)');
            const docHeaderText = await docHeader.getVisibleText();
            expect(docHeaderText).to.have.string(column);
          }
        });

        it('should remove columns from the table', async function () {
          for (const column of extraColumns) {
            await PageObjects.discover.clearFieldSearchInput();
            await PageObjects.discover.findFieldByName(column);
            log.debug(`add a ${column} column`);
            await PageObjects.discover.clickFieldListItemAdd(column);
            await PageObjects.header.waitUntilLoadingHasFinished();
          }
          // remove the second column
          await PageObjects.discover.clickFieldListItemRemove(extraColumns[1]);
          await PageObjects.header.waitUntilLoadingHasFinished();
          // test that the second column is no longer there
          const docHeader = await find.byCssSelector('thead > tr:nth-child(1)');
          expect(await docHeader.getVisibleText()).to.not.have.string(extraColumns[1]);
        });
      });

      it('should make the document table scrollable', async function () {
        await PageObjects.discover.clearFieldSearchInput();
        const dscTableWrapper = await find.byCssSelector('.kbnDocTableWrapper');
        const fieldNames = await PageObjects.discover.getAllFieldNames();
        const clientHeight = await dscTableWrapper.getAttribute('clientHeight');
        let fieldCounter = 0;
        const checkScrollable = async () => {
          const scrollWidth = await dscTableWrapper.getAttribute('scrollWidth');
          const clientWidth = await dscTableWrapper.getAttribute('clientWidth');
          log.debug(`scrollWidth: ${scrollWidth}, clientWidth: ${clientWidth}`);
          return Number(scrollWidth) > Number(clientWidth);
        };
        const addColumn = async () => {
          await PageObjects.discover.clickFieldListItemAdd(fieldNames[fieldCounter++]);
        };

        await addColumn();
        const isScrollable = await checkScrollable();
        expect(isScrollable).to.be(false);

        await retry.waitForWithTimeout('container to be scrollable', 60 * 1000, async () => {
          await addColumn();
          return await checkScrollable();
        });
        // so now we need to check if the horizontal scrollbar is displayed
        const newClientHeight = await dscTableWrapper.getAttribute('clientHeight');
        expect(Number(clientHeight)).to.be.above(Number(newClientHeight));
      });
    });
  });
}
