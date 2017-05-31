import expect from 'expect.js';


export default function ({ getService, getPageObjects }) {


  describe('visualize app', function describeIndexTests() {

    const fromTime = '2015-09-19 06:31:44.000';
    const toTime = '2015-09-23 18:31:44.000';

    const log = getService('log');
    const PageObjects = getPageObjects(['common', 'visualize', 'header', 'settings']);

    before(function () {

      log.debug('navigateToApp visualize');
      return PageObjects.common.navigateToUrl('visualize', 'new')
        .then(function () {
          log.debug('clickRegionMap');
          return PageObjects.visualize.clickRegionMap();
        })
        .then(function () {
          return PageObjects.visualize.clickNewSearch();
        })
        .then(function () {
          log.debug('Set absolute time range from \"' + fromTime + '\" to \"' + toTime + '\"');
          return PageObjects.header.setAbsoluteRange(fromTime, toTime);
        })
        .then(function clickBucket() {
          log.debug('Bucket = shape field');
          return PageObjects.visualize.clickBucket('shape field');
        })
        .then(function selectAggregation() {
          log.debug('Aggregation = Terms');
          return PageObjects.visualize.selectAggregation('Terms');
        })
        .then(function selectField() {
          log.debug('Field = geo.src');
          return PageObjects.visualize.selectField('geo.src');
        })
        .then(function () {
          return PageObjects.visualize.clickGo();
        })
        .then(function () {
          return PageObjects.header.waitUntilLoadingHasFinished();
        });
    });

    describe('vector map', function indexPatternCreation() {

      it('should show results after clicking play (join on states)', function () {

        const expectedColors = [{ color: 'rgb(253,209,109)' }, { color: 'rgb(164,0,37)' }];


        return PageObjects.visualize.getVectorMapData()
          .then(function (data) {

            log.debug('Actual data-----------------------');
            log.debug(data);
            log.debug('---------------------------------');

            expect(data).to.eql(expectedColors);
          });
      });

      it('should change color ramp', function () {
        return PageObjects.visualize.clickOptions()
          .then(function () {
            return PageObjects.visualize.selectFieldById('Blues', 'colorSchema');
          })
          .then(function () {
            return PageObjects.visualize.clickGo();
          })
          .then(function () {
            //this should visualize right away, without re-requesting data
            return PageObjects.visualize.getVectorMapData();
          })
          .then(function (data) {

            log.debug('Actual data-----------------------');
            log.debug(data);
            log.debug('---------------------------------');

            const expectedColors = [{ color: 'rgb(190,215,236)' }, { color: 'rgb(7,67,136)' }];

            expect(data).to.eql(expectedColors);
          });
      });

    });
  });

}
