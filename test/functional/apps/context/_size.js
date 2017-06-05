import expect from 'expect.js';

const TEST_INDEX_PATTERN = 'logstash-*';
const TEST_ANCHOR_TYPE = 'apache';
const TEST_ANCHOR_ID = 'AU_x3_BrGFA8no6QjjaI';
const TEST_DEFAULT_CONTEXT_SIZE = 7;
const TEST_STEP_SIZE = 3;

export default function ({ getService, getPageObjects }) {
  const remote = getService('remote');
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
      await (await PageObjects.context.getPredecessorLoadMoreButton()).click();
      await retry.try(async function () {
        expect(await docTable.getBodyRows(table)).to.have.length(
          2 * TEST_DEFAULT_CONTEXT_SIZE + TEST_STEP_SIZE + 1
        );
      });
    });

    it('should increase according to the `context:step` setting when clicking the `load older` button', async function () {
      await PageObjects.context.navigateTo(TEST_INDEX_PATTERN, TEST_ANCHOR_TYPE, TEST_ANCHOR_ID);

      const table = await docTable.getTable();
      const successorLoadMoreButton = await PageObjects.context.getSuccessorLoadMoreButton();
      await remote.moveMouseTo(successorLoadMoreButton);  // possibly scroll until the button is visible
      await successorLoadMoreButton.click();
      await retry.try(async function () {
        expect(await docTable.getBodyRows(table)).to.have.length(
          2 * TEST_DEFAULT_CONTEXT_SIZE + TEST_STEP_SIZE + 1
        );
      });
    });
  });

}
