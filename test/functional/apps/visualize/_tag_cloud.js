import expect from 'expect.js';

import { bdd } from '../../../support';

import PageObjects from '../../../support/page_objects';

bdd.describe('visualize app', function describeIndexTests() {
  const fromTime = '2015-09-19 06:31:44.000';
  const toTime = '2015-09-23 18:31:44.000';

  bdd.before(function () {

    PageObjects.common.debug('navigateToApp visualize');
    return PageObjects.common.navigateToUrl('visualize', 'new')
       .then(function () {
         PageObjects.common.debug('clickTagCloud');
         return PageObjects.visualize.clickTagCloud();
       })
      .then(function () {
        return PageObjects.visualize.clickNewSearch();
      })
      .then(function () {
        PageObjects.common.debug('Set absolute time range from \"' + fromTime + '\" to \"' + toTime + '\"');
        return PageObjects.header.setAbsoluteRange(fromTime, toTime);
      })
      .then(function () {
        PageObjects.common.debug('select Tags');
        return PageObjects.visualize.clickBucket('Tags');
      })
      .then(function () {
        PageObjects.common.debug('Click aggregation Terms');
        return PageObjects.visualize.selectAggregation('Terms');
      })
      .then(function () {
        PageObjects.common.debug('Click field machine.ram');
        return PageObjects.common.try(function tryingForTime() {
          return PageObjects.visualize.selectField('machine.ram');
        });
      })
      .then(function () {
        return PageObjects.visualize.selectOrderBy('_term');
      })
      .then(function () {
        return PageObjects.visualize.clickGo();
      })
      .then(function () {
        return PageObjects.header.waitUntilLoadingHasFinished();
      });
  });
  bdd.describe('tile map chart', function indexPatternCreation() {

    bdd.it('should show correct tag cloud data', function () {
      expect('foo').to.equal('bar');
    });
  });


});
