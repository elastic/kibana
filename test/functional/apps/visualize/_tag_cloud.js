import expect from 'expect.js';

export default function ({ getService, getPageObjects }) {
  const log = getService('log');
  const retry = getService('retry');
  const PageObjects = getPageObjects(['common', 'visualize', 'header', 'settings']);

  describe('visualize app', function describeIndexTests() {
    const fromTime = '2015-09-19 06:31:44.000';
    const toTime = '2015-09-23 18:31:44.000';

    before(function () {

      log.debug('navigateToApp visualize');
      return PageObjects.common.navigateToUrl('visualize', 'new')
         .then(function () {
           log.debug('clickTagCloud');
           return PageObjects.visualize.clickTagCloud();
         })
        .then(function () {
          return PageObjects.visualize.clickNewSearch();
        })
        .then(function () {
          log.debug('Set absolute time range from \"' + fromTime + '\" to \"' + toTime + '\"');
          return PageObjects.header.setAbsoluteRange(fromTime, toTime);
        })
        .then(function () {
          log.debug('select Tags');
          return PageObjects.visualize.clickBucket('Tags');
        })
        .then(function () {
          log.debug('Click aggregation Terms');
          return PageObjects.visualize.selectAggregation('Terms');
        })
        .then(function () {
          log.debug('Click field machine.ram');
          return retry.try(function tryingForTime() {
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
    describe('tile map chart', function indexPatternCreation() {

      it('should show correct tag cloud data', function () {
        return PageObjects.common.sleep(2000)
          .then(function () {
            return PageObjects.visualize.getTextTag().then(function (results) {
              log.debug(results);
              expect(results).to.eql([ '32212254720', '21474836480','20401094656','19327352832','18253611008' ]);
            });
          });
      });
    });
  });

}
