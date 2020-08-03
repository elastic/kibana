/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const log = getService('log');
  const retry = getService('retry');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const docTable = getService('docTable');
  const PageObjects = getPageObjects(['common', 'discover', 'header', 'timePicker']);
  const defaultSettings = {
    defaultIndex: 'logstash-*',
  };

  describe('discover doc table', function describeIndexTests() {
    const defaultRowsLimit = 50;
    const rowsHardLimit = 500;

    before(async function () {
      log.debug('load kibana index with default index pattern');
      await esArchiver.load('discover');

      // and load a set of makelogs data
      await esArchiver.loadIfNeeded('logstash_functional');
      await kibanaServer.uiSettings.replace(defaultSettings);
      log.debug('discover doc table');
      await PageObjects.common.navigateToApp('discover');
    });

    beforeEach(async function () {
      await PageObjects.timePicker.setDefaultAbsoluteRange();
    });

    it('should show the first 50 rows by default', async function () {
      // with the default range the number of hits is ~14000
      const rows = await PageObjects.discover.getDocTableRows();
      expect(rows.length).to.be(defaultRowsLimit);
    });

    it('should refresh the table content when changing time window', async function () {
      const initialRows = await PageObjects.discover.getDocTableRows();

      const fromTime = 'Sep 20, 2015 @ 23:00:00.000';
      const toTime = 'Sep 20, 2015 @ 23:14:00.000';

      await PageObjects.timePicker.setAbsoluteRange(fromTime, toTime);
      await PageObjects.discover.waitUntilSearchingHasFinished();

      const finalRows = await PageObjects.discover.getDocTableRows();
      expect(finalRows.length).to.be.below(initialRows.length);
    });

    it(`should load up to ${rowsHardLimit} rows when scrolling at the end of the table`, async function () {
      const initialRows = await PageObjects.discover.getDocTableRows();
      // click the Skip to the end of the table
      await PageObjects.discover.skipToEndOfDocTable();
      // now count the rows
      const finalRows = await PageObjects.discover.getDocTableRows();
      expect(finalRows.length).to.be.above(initialRows.length);
      expect(finalRows.length).to.be(rowsHardLimit);
    });

    it('should go the end of the table when using the accessible Skip button', async function () {
      // click the Skip to the end of the table
      await PageObjects.discover.skipToEndOfDocTable();
      // now check the footer text content
      const footer = await PageObjects.discover.getDocTableFooter();
      log.debug(await footer.getVisibleText());
      expect(await footer.getVisibleText()).to.have.string(rowsHardLimit);
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
          const defaultMessageEl = await detailsEl[0].findByTestSubject('docTableRowDetailsTitle');
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
        const [column] = extraColumns;
        await PageObjects.discover.findFieldByName(column);
        log.debug(`add a ${column} column`);
        await PageObjects.discover.clickFieldListItemAdd(column);
        await PageObjects.header.waitUntilLoadingHasFinished();
        // test the header now
        expect(await PageObjects.discover.getDocHeader()).to.have.string(column);
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
        await PageObjects.discover.clickFieldListItemAdd(extraColumns[1]);
        await PageObjects.header.waitUntilLoadingHasFinished();
        // test that the second column is no longer there
        expect(await PageObjects.discover.getDocHeader()).to.not.have.string(extraColumns[1]);
      });
    });
  });
}
