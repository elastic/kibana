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
const TEST_INDEX_PATTERN = 'logstash-*';
const TEST_ANCHOR_ID = 'AU_x3_BrGFA8no6QjjaI';
const TEST_DEFAULT_CONTEXT_SIZE = 2;
const TEST_STEP_SIZE = 2;

export default function ({ getService, getPageObjects }) {
  const kibanaServer = getService('kibanaServer');
  const retry = getService('retry');
  const docTable = getService('docTable');
  const PageObjects = getPageObjects(['context']);
  let expectedRowLength = 2 * TEST_DEFAULT_CONTEXT_SIZE + 1;

  describe('context size', function contextSize() {
    before(async function () {
      await kibanaServer.uiSettings.update({
        'context:defaultSize': `${TEST_DEFAULT_CONTEXT_SIZE}`,
        'context:step': `${TEST_STEP_SIZE}`,
      });
      await PageObjects.context.navigateTo(TEST_INDEX_PATTERN, TEST_ANCHOR_ID);
    });

    it('should default to the `context:defaultSize` setting', async function () {
      await retry.waitFor(
        `number of rows displayed initially is ${expectedRowLength}`,
        async function () {
          const rows = await docTable.getRowsText();
          return rows.length === expectedRowLength;
        }
      );
      await retry.waitFor(
        `predecessor count picker is set to ${TEST_DEFAULT_CONTEXT_SIZE}`,
        async function () {
          const predecessorCountPicker = await PageObjects.context.getPredecessorCountPicker();
          const value = await predecessorCountPicker.getAttribute('value');
          return value === String(TEST_DEFAULT_CONTEXT_SIZE);
        }
      );
    });

    it('should increase according to the `context:step` setting when clicking the `load newer` button', async function () {
      await PageObjects.context.clickPredecessorLoadMoreButton();
      expectedRowLength += TEST_STEP_SIZE;

      await retry.waitFor(
        `number of rows displayed after clicking load more predecessors is ${expectedRowLength}`,
        async function () {
          const rows = await docTable.getRowsText();
          return rows.length === expectedRowLength;
        }
      );
    });

    it('should increase according to the `context:step` setting when clicking the `load older` button', async function () {
      await PageObjects.context.clickSuccessorLoadMoreButton();
      expectedRowLength += TEST_STEP_SIZE;

      await retry.waitFor(
        `number of rows displayed after clicking load more successors is ${expectedRowLength}`,
        async function () {
          const rows = await docTable.getRowsText();
          return rows.length === expectedRowLength;
        }
      );
    });
  });
}
