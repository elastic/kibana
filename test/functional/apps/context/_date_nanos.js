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

const TEST_INDEX_PATTERN = 'date-nanos';
const TEST_ANCHOR_TYPE = '_doc';
const TEST_DEFAULT_CONTEXT_SIZE = 1;
const TEST_STEP_SIZE = 3;

export default function ({ getService, getPageObjects }) {
  const kibanaServer = getService('kibanaServer');
  const docTable = getService('docTable');
  const PageObjects = getPageObjects(['common', 'context', 'timePicker', 'discover']);
  const esArchiver = getService('esArchiver');

  describe('context view for date_nanos', () => {
    before(async function () {
      await esArchiver.loadIfNeeded('date_nanos');
      await kibanaServer.uiSettings.replace({ 'defaultIndex': TEST_INDEX_PATTERN });
      await kibanaServer.uiSettings.update({
        'context:defaultSize': `${TEST_DEFAULT_CONTEXT_SIZE}`,
        'context:step': `${TEST_STEP_SIZE}`,
      });
    });

    after(function unloadMakelogs() {
      return esArchiver.unload('date_nanos');
    });

    it('displays predessors - anchor - successors in right order ', async function () {
      await PageObjects.context.navigateTo(TEST_INDEX_PATTERN, TEST_ANCHOR_TYPE, 'AU_x3-TaGFA8no6Qj999Z');
      const table = await docTable.getTable();
      const rows = await docTable.getBodyRows(table);
      const actualRowsText = await Promise.all(rows.map(row => row.getVisibleText()));
      const expectedRowsText = [
        'Sep 18, 2019 @ 06:50:13.000000000\n-2',
        'Sep 18, 2019 @ 06:50:12.999999999\n-3',
        'Sep 19, 2015 @ 06:50:13.000100001\n1'
      ];
      expect(actualRowsText).to.eql(expectedRowsText);
    });

    it('displays correctly when predecessors and successors are loaded', async function () {
      await PageObjects.context.navigateTo(TEST_INDEX_PATTERN, TEST_ANCHOR_TYPE, 'AU_x3-TaGFA8no6Qjisd');
      await PageObjects.context.clickPredecessorLoadMoreButton();
      await PageObjects.context.clickSuccessorLoadMoreButton();
      const table = await docTable.getTable();
      const rows = await docTable.getBodyRows(table);
      const actualRowsText = await Promise.all(rows.map(row => row.getVisibleText()));
      const expectedRowsText = [
        'Sep 22, 2019 @ 23:50:13.253123345\n5',
        'Sep 18, 2019 @ 06:50:13.000000104\n4',
        'Sep 18, 2019 @ 06:50:13.000000103\n2',
        'Sep 18, 2019 @ 06:50:13.000000102\n1',
        'Sep 18, 2019 @ 06:50:13.000000101\n0',
        'Sep 18, 2019 @ 06:50:13.000000001\n-1',
        'Sep 18, 2019 @ 06:50:13.000000000\n-2',
        'Sep 18, 2019 @ 06:50:12.999999999\n-3',
        'Sep 19, 2015 @ 06:50:13.000100001\n1'
      ];
      expect(actualRowsText).to.eql(expectedRowsText);

    });
  });
}
