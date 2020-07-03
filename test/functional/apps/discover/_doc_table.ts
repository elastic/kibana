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
  const browser = getService('browser');
  const log = getService('log');
  const retry = getService('retry');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const queryBar = getService('queryBar');
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

    it(`should load up to ${rowsHardLimit} rows whin scrolling at the end of the table`, async function () {
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
      // now check the footer text
      const footer = await PageObjects.discover.getDocTableFooter();
      log.debug(await footer.getVisibleText());
      expect(await footer.getVisibleText()).to.be(
        `These are the first ${rowsHardLimit} documents matching your search, refine your search to see others. Back to top.`
      );
    });

    describe('expand a document row', function () {
      beforeEach(async function () {
        await PageObjects.discover.expandToggleDocTableRow(1);
      });

      it('should expand the detail row when the toggle arrow is clicked', async function () {
        await retry.try(async function () {
          await PageObjects.discover.expandToggleDocTableRow(1);
          const detailsEl = await PageObjects.discover.getDocTableRowDetails(1);
          const defaultMessageEl = await detailsEl.findByCssSelector('h4');
          expect(await defaultMessageEl.getVisibleText()).to.have.string('Expanded document');
        });
      });

      it('should show the surrounding documents', async function () {
        await retry.try(async function () {
          await PageObjects.discover.expandToggleDocTableRow(1);
          const detailsEl = await PageObjects.discover.getDocTableRowDetails(1);
          const [surroundingActionEl] = await detailsEl.findAllByTestSubject('docTableRowAction');
          log.debug(
            await surroundingActionEl.getTagName(),
            await surroundingActionEl.getAttribute('class'),
            await surroundingActionEl.getVisibleText()
          );
          expect(await surroundingActionEl.getVisibleText()).to.have.string(
            'View surrounding documents'
          );
          // TODO: test something more meaninful here?
        });
      });

      it('should show the single document', async function () {
        await retry.try(async function () {
          await PageObjects.discover.expandToggleDocTableRow(1);
          const detailsEl = await PageObjects.discover.getDocTableRowDetails(1);
          const [_, singleActionEl] = await detailsEl.findAllByTestSubject('docTableRowAction');
          log.debug(
            await singleActionEl.getTagName(),
            await singleActionEl.getAttribute('class'),
            await singleActionEl.getVisibleText()
          );
          expect(await singleActionEl.getVisibleText()).to.have.string('View single document');
          // TODO: test something more meaninful here?
        });
      });
    });

    describe('add and remove columns', function () {
      const extraColumns = ['phpmemory', 'ip'];

      afterEach(async function () {
        for (const column of extraColumns) {
          await PageObjects.discover.clickFieldListItemRemove(column);
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
