import expect from 'expect.js';

import { bdd, esClient } from '../../../support';
import PageObjects from '../../../support/page_objects';


const TEST_INDEX_PATTERN = 'logstash-*';
const TEST_ANCHOR_TYPE = 'apache';
const TEST_ANCHOR_ID = 'AU_x3_BrGFA8no6QjjaI';
const TEST_DEFAULT_CONTEXT_SIZE = 7;
const TEST_STEP_SIZE = 3;

bdd.describe('context size', function contextSize() {
  bdd.before(async function() {
    await esClient.updateConfigDoc({
      'context:defaultSize': `${TEST_DEFAULT_CONTEXT_SIZE}`,
      'context:step': `${TEST_STEP_SIZE}`,
    });
  });

  bdd.it('should default to the `context:defaultSize` setting', async function () {
    await PageObjects.context.navigateTo(TEST_INDEX_PATTERN, TEST_ANCHOR_TYPE, TEST_ANCHOR_ID);

    const docTable = await PageObjects.docTable.getTable();
    await PageObjects.common.try(async function () {
      expect(await PageObjects.docTable.getBodyRows(docTable)).to.have.length(2 * TEST_DEFAULT_CONTEXT_SIZE + 1);
    });
    await PageObjects.common.try(async function() {
      const predecessorCountPicker = await PageObjects.context.getPredecessorCountPicker();
      expect(await predecessorCountPicker.getProperty('value')).to.equal(`${TEST_DEFAULT_CONTEXT_SIZE}`);
    });
    await PageObjects.common.try(async function() {
      const successorCountPicker = await PageObjects.context.getSuccessorCountPicker();
      expect(await successorCountPicker.getProperty('value')).to.equal(`${TEST_DEFAULT_CONTEXT_SIZE}`);
    });
  });

  bdd.it('should increase according to the `context:step` setting when clicking the `load newer` button', async function() {
    await PageObjects.context.navigateTo(TEST_INDEX_PATTERN, TEST_ANCHOR_TYPE, TEST_ANCHOR_ID);

    const docTable = await PageObjects.docTable.getTable();
    await (await PageObjects.context.getPredecessorLoadMoreButton()).click();
    await PageObjects.common.try(async function () {
      expect(await PageObjects.docTable.getBodyRows(docTable)).to.have.length(
        2 * TEST_DEFAULT_CONTEXT_SIZE + TEST_STEP_SIZE + 1
      );
    });
  });

  bdd.it('should increase according to the `context:step` setting when clicking the `load older` button', async function() {
    await PageObjects.context.navigateTo(TEST_INDEX_PATTERN, TEST_ANCHOR_TYPE, TEST_ANCHOR_ID);

    const docTable = await PageObjects.docTable.getTable();
    const successorLoadMoreButton = await PageObjects.context.getSuccessorLoadMoreButton();
    await this.remote.moveMouseTo(successorLoadMoreButton);  // possibly scroll until the button is visible
    await successorLoadMoreButton.click();
    await PageObjects.common.try(async function () {
      expect(await PageObjects.docTable.getBodyRows(docTable)).to.have.length(
        2 * TEST_DEFAULT_CONTEXT_SIZE + TEST_STEP_SIZE + 1
      );
    });
  });
});
