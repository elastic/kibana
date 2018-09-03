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

import expect from 'expect.js';

export default function ({ getService, getPageObjects }) {
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const PageObjects = getPageObjects(['common', 'header', 'visualize']);

  async function selectVis(id) {
    await testSubjects.click('visSelect');
    await find.clickByCssSelector(`option[value="${id}"]`);
  }

  async function selectParams(id) {
    await testSubjects.click('embeddingParamsSelect');
    await find.clickByCssSelector(`option[value="${id}"]`);
    await testSubjects.waitForDeleted('visLoadingIndicator');
  }

  async function getTableData() {
    const data = await PageObjects.visualize.getTableVisData();
    return data.trim().split('\n');
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
          'jpg', '9,109',
          'css', '2,159',
          'png', '1,373',
          'gif', '918',
          'php', '445',
        ]);
      });

      it('should correctly embed specifying a timeRange', async () => {
        await selectParams('timerange');
        const data = await getTableData();
        expect(data).to.be.eql([
          'jpg', '3,005',
          'css', '720',
          'png', '455',
          'gif', '300',
          'php', '142',
        ]);
      });

      it('should correctly embed specifying a query', async () => {
        await selectParams('query');
        const data = await getTableData();
        expect(data).to.be.eql([
          'jpg', '9,109',
        ]);
      });

      it('should correctly embed specifying filters', async () => {
        await selectParams('filters');
        const data = await getTableData();
        expect(data).to.be.eql([
          'css', '2,159',
          'gif', '918',
          'php', '445',
        ]);
      });

      it('should correctly embed specifying filters and query and timeRange', async () => {
        await selectParams('filters_query_timerange');
        const data = await getTableData();
        expect(data).to.be.eql([
          'css', '720',
        ]);
      });
    });
  });

}
