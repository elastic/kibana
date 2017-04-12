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
        PageObjects.common.debug('clickTileMap');
        return PageObjects.visualize.clickVectorMap();
      })
      .then(function () {
        return PageObjects.visualize.clickNewSearch();
      })
      .then(function () {
        PageObjects.common.debug('Set absolute time range from \"' + fromTime + '\" to \"' + toTime + '\"');
        return PageObjects.header.setAbsoluteRange(fromTime, toTime);
      })
      .then(function clickBucket() {
        PageObjects.common.debug('Bucket = shape field');
        return PageObjects.visualize.clickBucket('shape field');
      })
      .then(function selectAggregation() {
        PageObjects.common.debug('Aggregation = Terms');
        return PageObjects.visualize.selectAggregation('Terms');
      })
      .then(function selectField() {
        PageObjects.common.debug('Field = geo.src');
        return PageObjects.visualize.selectField('geo.src');
      })
      .then(function () {
        return PageObjects.visualize.clickGo();
      })
      .then(function () {
        return PageObjects.header.waitUntilLoadingHasFinished();
      });
  });

  bdd.describe('vector map', function indexPatternCreation() {

    bdd.it('should show results after clicking play', function () {

      const expectedColors = [{ color: 'rgb(253,216,117)' },
        { color: 'rgb(128,0,37)' },
        { color: 'rgb(128,0,37)' },
        { color: 'rgb(253,209,109)' },
        { color: 'rgb(253,209,109)' },
        { color: 'rgb(253,209,109)' },
        { color: 'rgb(253,209,109)' },
        { color: 'rgb(253,209,109)' },
        { color: 'rgb(253,209,109)' },
        { color: 'rgb(253,209,109)' },
        { color: 'rgb(253,209,109)' },
        { color: 'rgb(253,209,109)' },
        { color: 'rgb(253,209,109)' },
        { color: 'rgb(253,209,109)' },
        { color: 'rgb(253,209,109)' },
        { color: 'rgb(253,209,109)' },
        { color: 'rgb(164,0,37)' },
        { color: 'rgb(252,132,57)' },
        { color: 'rgb(252,132,57)' },
        { color: 'rgb(252,132,57)' },
        { color: 'rgb(252,132,57)' },
        { color: 'rgb(252,132,57)' },
        { color: 'rgb(252,132,57)' },
        { color: 'rgb(252,132,57)' },
        { color: 'rgb(252,132,57)' },
        { color: 'rgb(252,132,57)' },
        { color: 'rgb(252,132,57)' }];


      return PageObjects.visualize.getVectorMapData()
        .then(function (data) {
          expect(data).to.eql(expectedColors);
        })
        .then(function takeScreenshot() {
          PageObjects.common.debug('Take screenshot (success)');
          PageObjects.common.saveScreenshot('world-vector-map');
        });
    });

    bdd.it('should change color ramp', function () {
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
          console.log(data);
          const expectedColors = [{ color: 'rgb(197,218,238)' },
            { color: 'rgb(7,47,107)' },
            { color: 'rgb(7,47,107)' },
            { color: 'rgb(190,215,236)' },
            { color: 'rgb(190,215,236)' },
            { color: 'rgb(190,215,236)' },
            { color: 'rgb(190,215,236)' },
            { color: 'rgb(190,215,236)' },
            { color: 'rgb(190,215,236)' },
            { color: 'rgb(190,215,236)' },
            { color: 'rgb(190,215,236)' },
            { color: 'rgb(190,215,236)' },
            { color: 'rgb(190,215,236)' },
            { color: 'rgb(190,215,236)' },
            { color: 'rgb(190,215,236)' },
            { color: 'rgb(190,215,236)' },
            { color: 'rgb(7,67,136)' },
            { color: 'rgb(101,170,211)' },
            { color: 'rgb(101,170,211)' },
            { color: 'rgb(101,170,211)' },
            { color: 'rgb(101,170,211)' },
            { color: 'rgb(101,170,211)' },
            { color: 'rgb(101,170,211)' },
            { color: 'rgb(101,170,211)' },
            { color: 'rgb(101,170,211)' },
            { color: 'rgb(101,170,211)' },
            { color: 'rgb(101,170,211)' }];

          expect(data).to.eql(expectedColors);
        });
    });

  });
});
