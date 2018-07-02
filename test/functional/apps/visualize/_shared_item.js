import expect from 'expect.js';

export default function ({ getService, getPageObjects }) {
  const log = getService('log');
  const retry = getService('retry');
  const PageObjects = getPageObjects(['common', 'visualize']);

  describe('data-shared-item', function () {
    before(async function () {
      log.debug('navigateToApp visualize');
      await PageObjects.common.navigateToApp('visualize');
    });

    it('should have the correct data-shared-item title and description', async function () {
      const expected = {
        title: 'Shared-Item Visualization AreaChart',
        description: 'AreaChart'
      };

      await PageObjects.visualize.clickVisualizationByName('Shared-Item Visualization AreaChart');
      await retry.try(async function () {
        const { title, description } = await PageObjects.common.getSharedItemTitleAndDescription();
        expect(title).to.eql(expected.title);
        expect(description).to.eql(expected.description);
      });
    });
  });
}
