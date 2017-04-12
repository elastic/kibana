import expect from 'expect.js';

export default function ({ getService, getPageObjects }) {
  const log = getService('log');
  const retry = getService('retry');
  const PageObjects = getPageObjects(['common', 'visualize']);

  describe('visualize app', function describeIndexTests() {

    before(function () {
      log.debug('navigateToApp visualize');
      return PageObjects.common.navigateToApp('visualize');
    });

    describe('data-shared-item', function indexPatternCreation() {

      it('should have the correct data-shared-item title and description', function () {
        const expected = {
          title: 'Shared-Item Visualization AreaChart',
          description: 'AreaChart'
        };

        return PageObjects.visualize.clickVisualizationByName('Shared-Item Visualization AreaChart')
        .then(() => retry.try(function () {
          return PageObjects.common.getSharedItemTitleAndDescription()
            .then(({ title, description }) => {
              expect(title).to.eql(expected.title);
              expect(description).to.eql(expected.description);
            });
        }));
      });
    });
  });
}
