
import expect from 'expect.js';

import {
  bdd,
  scenarioManager,
} from '../../../support';

import PageObjects from '../../../support/page_objects';

bdd.describe('visualize app', function describeIndexTests() {
  var fromTime = '2015-09-19 06:31:44.000';
  var toTime = '2015-09-23 18:31:44.000';

  bdd.before(function () {

    PageObjects.common.debug('navigateToApp visualize');
    return PageObjects.common.navigateToApp('visualize')
    .then(function () {
      PageObjects.common.debug('clickTileMap');
      return PageObjects.visualize.clickTileMap();
    })
    .then(function () {
      return PageObjects.visualize.clickNewSearch();
    })
    .then(function () {
      PageObjects.common.debug('Set absolute time range from \"' + fromTime + '\" to \"' + toTime + '\"');
      return PageObjects.header.setAbsoluteRange(fromTime, toTime);
    })
    .then(function () {
      PageObjects.common.debug('select bucket Geo Coordinates');
      return PageObjects.visualize.clickBucket('Geo Coordinates');
    })
    .then(function () {
      PageObjects.common.debug('Click aggregation Geohash');
      return PageObjects.visualize.selectAggregation('Geohash');
    })
    .then(function () {
      PageObjects.common.debug('Click field geo.coordinates');
      return PageObjects.common.try(function tryingForTime() {
        return PageObjects.visualize.selectField('geo.coordinates');
      });
    })
    .then(function () {
      return PageObjects.visualize.clickGo();
    })
    .then(function () {
      return PageObjects.header.getSpinnerDone();
    });
  });

  bdd.describe('tile map chart', function indexPatternCreation() {

    bdd.it('should save and load, take screenshot', function pageHeader() {
      var vizName1 = 'Visualization TileMap';

      return PageObjects.visualize.saveVisualization(vizName1)
      .then(function (message) {
        PageObjects.common.debug('Saved viz message = ' + message);
        expect(message).to.be('Visualization Editor: Saved Visualization \"' + vizName1 + '\"');
      })
      .then(function testVisualizeWaitForToastMessageGone() {
        return PageObjects.visualize.waitForToastMessageGone();
      })
      .then(function () {
        return PageObjects.visualize.loadSavedVisualization(vizName1);
      })
      .then(function waitForVisualization() {
        return PageObjects.visualize.waitForVisualization();
      })
      // sleep a bit before taking the screenshot or it won't show data
      .then(function sleep() {
        return PageObjects.common.sleep(4000);
      })
      .then(function takeScreenshot() {
        PageObjects.common.debug('Take screenshot');
        PageObjects.common.saveScreenshot('Visualize-site-map');
      });
    });

    bdd.it('should show correct tile map data', function pageHeader() {
      var expectedTableData = [ 'dn 1,429', 'dp 1,418', '9y 1,215', '9z 1,099', 'dr 1,076',
        'dj 982', '9v 938', '9q 722', '9w 475', 'cb 457', 'c2 453', '9x 420', 'dq 399',
        '9r 396', '9t 274', 'c8 271', 'dh 214', 'b6 207', 'bd 206', 'b7 167', 'f0 141',
        'be 128', '9m 126', 'bf 85', 'de 73', 'bg 71', '9p 71', 'c1 57', 'c4 50', '9u 48',
        'f2 46', '8e 45', 'b3 38', 'bs 36', 'c0 31', '87 28', 'bk 23', '8f 18', 'b5 14',
        '84 14', 'dx 9', 'bu 9', 'b1 9', 'b4 6', '9n 3', '8g 3'
      ];

      return PageObjects.visualize.collapseChart()
      .then(function () {
        return PageObjects.settings.setPageSize('All');
      })
      .then(function getDataTableData() {
        return PageObjects.visualize.getDataTableData()
        .then(function showData(data) {
          PageObjects.common.debug(data.split('\n'));
          expect(data.trim().split('\n')).to.eql(expectedTableData);
        });
      });
    });
  });
});
