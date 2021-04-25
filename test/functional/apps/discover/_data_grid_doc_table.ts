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
  const find = getService('find');
  const dataGrid = getService('dataGrid');
  const log = getService('log');
  const retry = getService('retry');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const monacoEditor = getService('monacoEditor');
  const PageObjects = getPageObjects(['common', 'discover', 'header', 'timePicker']);
  const defaultSettings = {
    defaultIndex: 'logstash-*',
    'doc_table:legacy': false,
  };
  const testSubjects = getService('testSubjects');

  describe('discover data grid doc table', function describeIndexTests() {
    before(async function () {
      log.debug('load kibana index with default index pattern');
      await kibanaServer.savedObjects.clean({ types: ['search', 'index-pattern'] });
      await kibanaServer.importExport.load('discover');
      await esArchiver.loadIfNeeded('logstash_functional');
      await kibanaServer.uiSettings.replace(defaultSettings);
      await PageObjects.timePicker.setDefaultAbsoluteRangeViaUiSettings();
      await PageObjects.common.navigateToApp('discover');
    });

    after(async function () {
      log.debug('reset uiSettings');
      await kibanaServer.uiSettings.replace({});
    });

    it('should show the first 11 rows by default', async function () {
      // with the default range the number of hits is ~14000
      const rows = await dataGrid.getDocTableRows();
      expect(rows.length).to.be(11);
    });

    it('should refresh the table content when changing time window', async function () {
      const initialRows = await dataGrid.getDocTableRows();

      const fromTime = 'Sep 20, 2015 @ 23:00:00.000';
      const toTime = 'Sep 20, 2015 @ 23:14:00.000';

      await PageObjects.timePicker.setAbsoluteRange(fromTime, toTime);
      await PageObjects.discover.waitUntilSearchingHasFinished();

      const finalRows = await PageObjects.discover.getDocTableRows();
      expect(finalRows.length).to.be.below(initialRows.length);
      await PageObjects.timePicker.setDefaultAbsoluteRange();
    });

    // flaky https://github.com/elastic/kibana/issues/94889
    it.skip('should show popover with expanded cell content by click on expand button', async () => {
      log.debug('open popover with expanded cell content to get json from the editor');
      const documentCell = await dataGrid.getCellElement(1, 3);
      await documentCell.click();
      const expandCellContentButton = await documentCell.findByClassName(
        'euiDataGridRowCell__expandButtonIcon'
      );
      await expandCellContentButton.click();
      const popoverJson = await monacoEditor.getCodeEditorValue();

      log.debug('open expanded document flyout to get json');
      await dataGrid.clickRowToggle();
      await find.clickByCssSelectorWhenNotDisabled('#kbn_doc_viewer_tab_1');
      const flyoutJson = await monacoEditor.getCodeEditorValue();

      expect(popoverJson).to.be(flyoutJson);
    });

    describe('expand a document row', function () {
      const rowToInspect = 1;

      it('should expand the detail row when the toggle arrow is clicked', async function () {
        await retry.try(async function () {
          await dataGrid.clickRowToggle({ isAnchorRow: false, rowIndex: rowToInspect - 1 });
          const detailsEl = await dataGrid.getDetailsRows();
          const defaultMessageEl = await detailsEl[0].findByTestSubject('docTableRowDetailsTitle');
          expect(defaultMessageEl).to.be.ok();
          await dataGrid.closeFlyout();
        });
      });

      it('should show the detail panel actions', async function () {
        await retry.try(async function () {
          await dataGrid.clickRowToggle({ isAnchorRow: false, rowIndex: rowToInspect - 1 });
          const [surroundingActionEl, singleActionEl] = await dataGrid.getRowActions({
            isAnchorRow: false,
            rowIndex: rowToInspect - 1,
          });
          expect(surroundingActionEl).to.be.ok();
          expect(singleActionEl).to.be.ok();
          await dataGrid.closeFlyout();
        });
      });

      it('should show allow adding columns from the detail panel', async function () {
        await retry.try(async function () {
          await dataGrid.clickRowToggle({ isAnchorRow: false, rowIndex: rowToInspect - 1 });

          // add columns
          const fields = ['_id', '_index', 'agent'];
          for (const field of fields) {
            await testSubjects.click(`toggleColumnButton_${field}`);
          }

          const headerWithFields = await dataGrid.getHeaderFields();
          expect(headerWithFields.join(' ')).to.contain(fields.join(' '));

          // remove columns
          for (const field of fields) {
            await testSubjects.click(`toggleColumnButton_${field}`);
          }

          const headerWithoutFields = await dataGrid.getHeaderFields();
          expect(headerWithoutFields.join(' ')).not.to.contain(fields.join(' '));

          await dataGrid.closeFlyout();
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
          const header = await dataGrid.getHeaderFields();
          expect(header.join(' ')).to.have.string(column);
        }
      });

      it('should remove columns from the table', async function () {
        for (const column of extraColumns) {
          await PageObjects.discover.clearFieldSearchInput();
          await PageObjects.discover.findFieldByName(column);
          await PageObjects.discover.clickFieldListItemAdd(column);
          await PageObjects.header.waitUntilLoadingHasFinished();
        }
        // remove the second column
        await PageObjects.discover.clickFieldListItemAdd(extraColumns[1]);
        await PageObjects.header.waitUntilLoadingHasFinished();
        // test that the second column is no longer there
        const header = await dataGrid.getHeaderFields();
        expect(header.join(' ')).to.not.have.string(extraColumns[1]);
      });
    });
  });
}
