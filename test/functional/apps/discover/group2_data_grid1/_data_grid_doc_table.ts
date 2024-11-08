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
  const log = getService('log');
  const retry = getService('retry');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const monacoEditor = getService('monacoEditor');
  const dashboardAddPanel = getService('dashboardAddPanel');
  const { common, discover, header, timePicker, dashboard, unifiedFieldList } = getPageObjects([
    'common',
    'discover',
    'header',
    'timePicker',
    'dashboard',
    'unifiedFieldList',
  ]);
  const defaultSettings = {
    defaultIndex: 'logstash-*',
    'discover:rowHeightOption': 0, // single line
  };
  const testSubjects = getService('testSubjects');
  const security = getService('security');

  describe('discover data grid doc table', function describeIndexTests() {
    before(async function () {
      await security.testUser.setRoles(['kibana_admin', 'test_logstash_reader']);
      log.debug('load kibana index with default index pattern');
      await kibanaServer.savedObjects.clean({ types: ['search', 'index-pattern'] });
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/discover.json');
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
      await kibanaServer.uiSettings.replace(defaultSettings);
      await timePicker.setDefaultAbsoluteRangeViaUiSettings();
    });

    beforeEach(async () => {
      await common.navigateToApp('discover');
    });

    after(async function () {
      log.debug('reset uiSettings');
      await kibanaServer.uiSettings.replace({});
    });

    it('should show rows by default', async function () {
      // with the default range the number of hits is ~14000
      const rows = await dataGrid.getDocTableRows();
      expect(rows.length).to.be.above(0);
    });

    it('should refresh the table content when changing time window', async function () {
      const initialRows = await dataGrid.getDocTableRows();

      const fromTime = 'Sep 20, 2015 @ 23:00:00.000';
      const toTime = 'Sep 20, 2015 @ 23:14:00.000';

      await timePicker.setAbsoluteRange(fromTime, toTime);
      await discover.waitUntilSearchingHasFinished();

      const finalRows = await discover.getDocTableRows();
      expect(finalRows.length).to.be.below(initialRows.length);
    });

    it('should show popover with expanded cell content by click on expand button', async () => {
      log.debug('open popover with expanded cell content to get json from the editor');
      await timePicker.setDefaultAbsoluteRange();
      await discover.waitUntilSearchingHasFinished();

      await retry.waitForWithTimeout('timestamp matches expected doc', 5000, async () => {
        const cell = await dataGrid.getCellElementExcludingControlColumns(0, 0);
        const text = await cell.getVisibleText();
        log.debug(`row document timestamp: ${text}`);
        return text === 'Sep 22, 2015 @ 23:50:13.253';
      });

      await dataGrid.clickCellExpandButtonExcludingControlColumns(0, 1);

      let expandDocId = '';
      await retry.waitForWithTimeout('expandDocId to be valid', 5000, async () => {
        const text = await monacoEditor.getCodeEditorValue();
        const flyoutJson = JSON.parse(text);
        expandDocId = flyoutJson._id;
        return expandDocId === 'AU_x3_g4GFA8no6QjkYX';
      });
      log.debug(`expanded document id: ${expandDocId}`);

      await dataGrid.clickRowToggle({ defaultTabId: 'doc_view_source' });

      await retry.waitForWithTimeout(
        'document id in flyout matching the expanded document id',
        5000,
        async () => {
          const text = await monacoEditor.getCodeEditorValue();
          const flyoutJson = JSON.parse(text);
          log.debug(`flyout document id: ${flyoutJson._id}`);
          return flyoutJson._id === expandDocId;
        }
      );
    });

    it('should show popover with expanded cell content by click on expand button on embeddable', async () => {
      log.debug('open popover with expanded cell content to get json from the editor');
      await timePicker.setDefaultAbsoluteRange();
      await discover.waitUntilSearchingHasFinished();
      await discover.saveSearch('expand-cell-search');

      await dashboard.navigateToApp();
      await dashboard.gotoDashboardLandingPage();
      await dashboard.clickNewDashboard();
      await header.waitUntilLoadingHasFinished();
      await dashboardAddPanel.addSavedSearch('expand-cell-search');

      await retry.waitForWithTimeout('timestamp matches expected doc', 5000, async () => {
        const cell = await dataGrid.getCellElementExcludingControlColumns(0, 0);
        const text = await cell.getVisibleText();
        log.debug(`row document timestamp: ${text}`);
        return text === 'Sep 22, 2015 @ 23:50:13.253';
      });
      await dataGrid.clickCellExpandButtonExcludingControlColumns(0, 1);

      let expandDocId = '';
      await retry.waitForWithTimeout('expandDocId to be valid', 5000, async () => {
        const text = await monacoEditor.getCodeEditorValue();
        return (expandDocId = JSON.parse(text)._id) === 'AU_x3_g4GFA8no6QjkYX';
      });
      log.debug(`expanded document id: ${expandDocId}`);

      await dataGrid.clickRowToggle({ defaultTabId: 'doc_view_source' });

      await retry.waitForWithTimeout(
        'document id in flyout matching the expanded document id',
        5000,
        async () => {
          const text = await monacoEditor.getCodeEditorValue();
          const flyoutJson = JSON.parse(text);
          log.debug(`flyout document id: ${flyoutJson._id}`);
          return flyoutJson._id === expandDocId;
        }
      );
    });

    describe('expand a document row', function () {
      const rowToInspect = 1;

      it('should expand the detail row when the toggle arrow is clicked', async function () {
        await retry.try(async function () {
          await dataGrid.clickRowToggle({ isAnchorRow: false, rowIndex: rowToInspect - 1 });
          const detailsEl = await dataGrid.getDetailsRows();
          const defaultMessageEl = await detailsEl[0].findByTestSubject('docViewerRowDetailsTitle');
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

      it('should allow paginating docs in the flyout by clicking in the doc table', async function () {
        await retry.try(async function () {
          await dataGrid.clickRowToggle({ rowIndex: rowToInspect - 1 });
          await testSubjects.existOrFail('docViewerFlyoutNavigationPage-0');
          await dataGrid.clickRowToggle({ rowIndex: rowToInspect });
          await testSubjects.existOrFail('docViewerFlyoutNavigationPage-1');
          await dataGrid.closeFlyout();
        });
      });

      it('should show allow adding columns from the detail panel', async function () {
        await retry.try(async function () {
          await dataGrid.clickRowToggle({ isAnchorRow: false, rowIndex: rowToInspect - 1 });

          // add columns
          const fields = ['_id', '_index', 'agent'];
          for (const field of fields) {
            await dataGrid.clickFieldActionInFlyout(field, 'toggleColumnButton');
          }

          const headerWithFields = await dataGrid.getHeaderFields();
          expect(headerWithFields.join(' ')).to.contain(fields.join(' '));

          // remove columns
          for (const field of fields) {
            await dataGrid.clickFieldActionInFlyout(field, 'toggleColumnButton');
          }

          const headerWithoutFields = await dataGrid.getHeaderFields();
          expect(headerWithoutFields.join(' ')).not.to.contain(fields.join(' '));

          await dataGrid.closeFlyout();
        });
      });
    });

    describe('add and remove columns', function () {
      const extraColumns = ['phpmemory', 'ip'];
      const expectedFieldLength: Record<string, number> = {
        phpmemory: 1,
        ip: 4,
      };

      afterEach(async function () {
        for (const column of extraColumns) {
          await unifiedFieldList.clickFieldListItemRemove(column);
          await header.waitUntilLoadingHasFinished();
        }
      });

      it('should add more columns to the table', async function () {
        for (const column of extraColumns) {
          await unifiedFieldList.clearFieldSearchInput();
          await unifiedFieldList.findFieldByName(column);
          await unifiedFieldList.waitUntilFieldlistHasCountOfFields(expectedFieldLength[column]);
          await unifiedFieldList.clickFieldListItemAdd(column);
          await header.waitUntilLoadingHasFinished();
          // test the header now
          const headerFields = await dataGrid.getHeaderFields();
          expect(headerFields.join(' ')).to.have.string(column);
        }
      });

      it('should remove columns from the table', async function () {
        for (const column of extraColumns) {
          await unifiedFieldList.clearFieldSearchInput();
          await unifiedFieldList.findFieldByName(column);
          await unifiedFieldList.waitUntilFieldlistHasCountOfFields(expectedFieldLength[column]);
          await unifiedFieldList.clickFieldListItemAdd(column);
          await header.waitUntilLoadingHasFinished();
        }
        // remove the second column
        await unifiedFieldList.clickFieldListItemRemove(extraColumns[1]);
        await header.waitUntilLoadingHasFinished();
        // test that the second column is no longer there
        const headerFields = await dataGrid.getHeaderFields();
        expect(headerFields.join(' ')).to.not.have.string(extraColumns[1]);
      });
    });
  });
}
