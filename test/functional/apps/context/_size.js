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

const TEST_INDEX_PATTERN = 'logstash-*';
const TEST_ANCHOR_TYPE = '_doc';
const TEST_ANCHOR_ID = 'AU_x3_BrGFA8no6QjjaI';
const TEST_DEFAULT_CONTEXT_SIZE = 7;
const TEST_STEP_SIZE = 3;

export default function ({ getService, getPageObjects }) {
  const kibanaServer = getService('kibanaServer');
  const retry = getService('retry');
  const docTable = getService('docTable');
  const PageObjects = getPageObjects(['context']);

  describe('context size', function contextSize() {
    before(async function () {
      await kibanaServer.uiSettings.update({
        'context:defaultSize': `${TEST_DEFAULT_CONTEXT_SIZE}`,
        'context:step': `${TEST_STEP_SIZE}`,
      });
    });

    it('should default to the `context:defaultSize` setting', async function () {
      await PageObjects.context.navigateTo(TEST_INDEX_PATTERN, TEST_ANCHOR_TYPE, TEST_ANCHOR_ID);

      const table = await docTable.getTable();
      await retry.try(async function () {
        expect(await docTable.getBodyRows(table)).to.have.length(2 * TEST_DEFAULT_CONTEXT_SIZE + 1);
      });
      await retry.try(async function () {
        const predecessorCountPicker = await PageObjects.context.getPredecessorCountPicker();
        expect(await predecessorCountPicker.getProperty('value')).to.equal(`${TEST_DEFAULT_CONTEXT_SIZE}`);
      });
      await retry.try(async function () {
        const successorCountPicker = await PageObjects.context.getSuccessorCountPicker();
        expect(await successorCountPicker.getProperty('value')).to.equal(`${TEST_DEFAULT_CONTEXT_SIZE}`);
      });
    });

    it('should increase according to the `context:step` setting when clicking the `load newer` button', async function () {
      await PageObjects.context.navigateTo(TEST_INDEX_PATTERN, TEST_ANCHOR_TYPE, TEST_ANCHOR_ID);

      const table = await docTable.getTable();
      await PageObjects.context.clickPredecessorLoadMoreButton();

      await retry.try(async function () {
        expect(await docTable.getBodyRows(table)).to.have.length(
          2 * TEST_DEFAULT_CONTEXT_SIZE + TEST_STEP_SIZE + 1
        );
      });
    });

    it('should increase according to the `context:step` setting when clicking the `load older` button', async function () {
      await PageObjects.context.navigateTo(TEST_INDEX_PATTERN, TEST_ANCHOR_TYPE, TEST_ANCHOR_ID);

      const table = await docTable.getTable();
      await PageObjects.context.clickSuccessorLoadMoreButton();

      await retry.try(async function () {
        expect(await docTable.getBodyRows(table)).to.have.length(
          2 * TEST_DEFAULT_CONTEXT_SIZE + TEST_STEP_SIZE + 1
        );
      });
    });
  });

}
