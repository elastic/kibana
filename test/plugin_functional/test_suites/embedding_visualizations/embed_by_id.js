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
import { delay } from 'bluebird';

export default function({ getService }) {
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const table = getService('table');
  const retry = getService('retry');

  async function selectVis(id) {
    await testSubjects.click('visSelect');
    await find.clickByCssSelector(`option[value="${id}"]`);
  }

  async function selectParams(id) {
    await testSubjects.click('embeddingParamsSelect');
    await find.clickByCssSelector(`option[value="${id}"]`);
    await retry.try(async () => {
      await testSubjects.waitForDeleted('visLoadingIndicator');
    });
    await delay(1000);
  }

  async function getTableData() {
    const data = await table.getDataFromTestSubj('paginated-table-body');
    // Strip away empty rows (at the bottom)
    return data.filter(row => !row.every(cell => !cell.trim()));
  }

  describe('embed by id', function describeIndexTests() {
    describe('vis on timebased data without date histogram', () => {
      before(async () => {
        await selectVis('timebased_no-datehistogram');
      });

      it('should correctly embed', async () => {
        await selectParams('none');
        const data = await getTableData();
        expect(data).to.be.eql([
          ['jpg', '9,109'],
          ['css', '2,159'],
          ['png', '1,373'],
          ['gif', '918'],
          ['php', '445'],
        ]);
      });

      it('should correctly embed specifying a timeRange', async () => {
        await selectParams('timerange');
        const data = await getTableData();
        expect(data).to.be.eql([
          ['jpg', '3,005'],
          ['css', '720'],
          ['png', '455'],
          ['gif', '300'],
          ['php', '142'],
        ]);
      });

      it('should correctly embed specifying a query', async () => {
        await selectParams('query');
        const data = await getTableData();
        expect(data).to.be.eql([['jpg', '9,109']]);
      });

      it('should correctly embed specifying filters', async () => {
        await selectParams('filters');
        const data = await getTableData();
        expect(data).to.be.eql([['css', '2,159'], ['gif', '918'], ['php', '445']]);
      });

      it('should correctly embed specifying filters and query and timeRange', async () => {
        await selectParams('filters_query_timerange');
        const data = await getTableData();
        expect(data).to.be.eql([['css', '678'], ['php', '110']]);
      });
    });

    describe('vis on timebased data with date histogram with interval auto', () => {
      before(async () => {
        await selectVis('timebased');
      });

      it('should correctly embed specifying a timeRange', async () => {
        await selectParams('timerange');
        const data = await getTableData();
        expect(data).to.be.eql([
          ['2015-09-20 20:00', '45.159KB', '5.65KB'],
          ['2015-09-21 00:00', '42.428KB', '5.345KB'],
          ['2015-09-21 04:00', '43.717KB', '5.35KB'],
          ['2015-09-21 08:00', '43.228KB', '5.538KB'],
          ['2015-09-21 12:00', '42.83KB', '5.669KB'],
          ['2015-09-21 16:00', '44.908KB', '5.673KB'],
        ]);
      });

      it('should correctly embed specifying filters and query and timeRange', async () => {
        await selectParams('filters_query_timerange');
        const data = await getTableData();
        expect(data).to.be.eql([
          ['2015-09-20 20:00', '45.391KB', '5.692KB'],
          ['2015-09-21 00:00', '46.57KB', '5.953KB'],
          ['2015-09-21 04:00', '47.339KB', '6.636KB'],
          ['2015-09-21 08:00', '40.5KB', '6.133KB'],
          ['2015-09-21 12:00', '41.31KB', '5.84KB'],
          ['2015-09-21 16:00', '48.012KB', '6.003KB'],
        ]);
      });
    });

    describe('vis on timebased data with date histogram with interval auto and saved filters', () => {
      before(async () => {
        await selectVis('timebased_with-filters');
      });

      it('should correctly embed specifying a timeRange', async () => {
        await selectParams('timerange');
        const data = await getTableData();
        expect(data).to.be.eql([
          ['2015-09-20 20:00', '21.221KB', '2.66KB'],
          ['2015-09-21 00:00', '22.054KB', '2.63KB'],
          ['2015-09-21 04:00', '15.592KB', '2.547KB'],
          ['2015-09-21 08:00', '4.656KB', '2.328KB'],
          ['2015-09-21 12:00', '17.887KB', '2.694KB'],
          ['2015-09-21 16:00', '20.533KB', '2.529KB'],
        ]);
      });

      it('should correctly embed specifying filters and query and timeRange', async () => {
        await selectParams('filters_query_timerange');
        const data = await getTableData();
        expect(data).to.be.eql([
          ['2015-09-20 20:00', '24.567KB', '3.498KB'],
          ['2015-09-21 00:00', '25.984KB', '3.589KB'],
          ['2015-09-21 04:00', '2.543KB', '2.543KB'],
          ['2015-09-21 12:00', '5.783KB', '2.927KB'],
          ['2015-09-21 16:00', '21.107KB', '3.44KB'],
        ]);
      });
    });

    describe('vis visa saved object on timebased data with date histogram with interval auto and saved filters', () => {
      before(async () => {
        await selectVis('timebased_with-filters');
      });

      it('should correctly embed specifying filters and query and timeRange', async () => {
        await selectParams('savedobject_filter_query_timerange');
        const data = await getTableData();
        expect(data).to.be.eql([
          ['2015-09-20 20:00', '24.567KB', '3.498KB'],
          ['2015-09-21 00:00', '25.984KB', '3.589KB'],
          ['2015-09-21 04:00', '2.543KB', '2.543KB'],
          ['2015-09-21 12:00', '5.783KB', '2.927KB'],
          ['2015-09-21 16:00', '21.107KB', '3.44KB'],
        ]);
      });
    });
  });
}
