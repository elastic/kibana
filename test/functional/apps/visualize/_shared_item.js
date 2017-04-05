import expect from 'expect.js';

import {
  bdd
} from '../../../support';

import PageObjects from '../../../support/page_objects';

bdd.describe('visualize app', function describeIndexTests() {

  bdd.before(function () {
    PageObjects.common.debug('navigateToApp visualize');
    return PageObjects.common.navigateToApp('visualize');
  });

  bdd.describe('data-shared-item', function indexPatternCreation() {

    bdd.it('should have the correct data-shared-item title and description', function () {
      const expected = {
        title: 'Shared-Item Visualization AreaChart',
        description: 'AreaChart'
      };

      return PageObjects.visualize.clickVisualizationByName('Shared-Item Visualization AreaChart')
        .then (() => PageObjects.common.try(function () {
          return PageObjects.common.getSharedItemTitleAndDescription()
            .then(({ title, description }) => {
              expect(title).to.eql(expected.title);
              expect(description).to.eql(expected.description);
            });
        }));
    });
  });
});
