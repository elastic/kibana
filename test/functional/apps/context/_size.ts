/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

const TEST_INDEX_PATTERN = 'logstash-*';
const TEST_ANCHOR_ID = 'AU_x3_BrGFA8no6QjjaI';
const TEST_DEFAULT_CONTEXT_SIZE = 2;
const TEST_STEP_SIZE = 2;

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const kibanaServer = getService('kibanaServer');
  const security = getService('security');
  const retry = getService('retry');
  const docTable = getService('docTable');
  const browser = getService('browser');
  const PageObjects = getPageObjects(['context']);
  let expectedRowLength = 2 * TEST_DEFAULT_CONTEXT_SIZE + 1;

  describe('context size', function contextSize() {
    before(async function () {
      await security.testUser.setRoles(['kibana_admin', 'test_logstash_reader']);
      await kibanaServer.uiSettings.update({
        'context:defaultSize': `${TEST_DEFAULT_CONTEXT_SIZE}`,
        'context:step': `${TEST_STEP_SIZE}`,
        'doc_table:legacy': true,
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

    it('should show 101 records when 50 newer and 50 older records are requests', async function () {
      const predecessorCountPicker = await PageObjects.context.getPredecessorCountPicker();
      await predecessorCountPicker.clearValueWithKeyboard();
      await predecessorCountPicker.pressKeys('50');
      await predecessorCountPicker.pressKeys(browser.keys.ENTER);

      const successorCountPicker = await PageObjects.context.getSuccessorCountPicker();
      await successorCountPicker.clearValueWithKeyboard();
      await successorCountPicker.pressKeys('50');
      await successorCountPicker.pressKeys(browser.keys.ENTER);

      await retry.waitFor(
        `number of rows displayed after clicking load more successors is ${expectedRowLength}`,
        async function () {
          const rows = await docTable.getRowsText();
          return rows.length === 101;
        }
      );
    });
  });
}
