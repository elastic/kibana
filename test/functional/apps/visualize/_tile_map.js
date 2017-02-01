
import expect from 'expect.js';

import {
  bdd,
  scenarioManager,
} from '../../../support';

import PageObjects from '../../../support/page_objects';

bdd.describe('visualize app', function describeIndexTests() {
  let fromTime = '2015-09-19 06:31:44.000';
  let toTime = '2015-09-23 18:31:44.000';

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
      return PageObjects.header.isGlobalLoadingIndicatorHidden();
    });
  });

  bdd.describe('tile map chart', function indexPatternCreation() {

    bdd.it('should show correct tile map data on default zoom level', function () {
      let expectedTableData = [ 'dn 1,429', 'dp 1,418', '9y 1,215', '9z 1,099', 'dr 1,076',
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
          expect(data.trim().split('\n')).to.eql(expectedTableData);
          return PageObjects.visualize.collapseChart();
        });
      });
    });


    bdd.it('should zoom out to level 1 from default level 2', function () {
      let expectedPrecision2Circles =  [ { color: '#750000', radius: 48 },
        { color: '#750000', radius: 48 },
        { color: '#750000', radius: 44 },
        { color: '#a40000', radius: 42 },
        { color: '#a40000', radius: 42 },
        { color: '#a40000', radius: 40 },
        { color: '#a40000', radius: 39 },
        { color: '#b45100', radius: 34 },
        { color: '#b67501', radius: 28 },
        { color: '#b67501', radius: 27 },
        { color: '#b67501', radius: 27 },
        { color: '#b67501', radius: 26 },
        { color: '#b67501', radius: 25 },
        { color: '#b67501', radius: 25 },
        { color: '#b99939', radius: 21 },
        { color: '#b99939', radius: 21 },
        { color: '#b99939', radius: 19 },
        { color: '#b99939', radius: 18 },
        { color: '#b99939', radius: 18 },
        { color: '#b99939', radius: 16 },
        { color: '#b99939', radius: 15 },
        { color: '#b99939', radius: 14 },
        { color: '#b99939', radius: 14 },
        { color: '#b99939', radius: 12 },
        { color: '#b99939', radius: 11 },
        { color: '#b99939', radius: 11 },
        { color: '#b99939', radius: 11 },
        { color: '#b99939', radius: 10 },
        { color: '#b99939', radius: 9 },
        { color: '#b99939', radius: 9 },
        { color: '#b99939', radius: 9 },
        { color: '#b99939', radius: 9 },
        { color: '#b99939', radius: 8 },
        { color: '#b99939', radius: 8 },
        { color: '#b99939', radius: 7 },
        { color: '#b99939', radius: 7 },
        { color: '#b99939', radius: 6 },
        { color: '#b99939', radius: 5 },
        { color: '#b99939', radius: 5 },
        { color: '#b99939', radius: 5 },
        { color: '#b99939', radius: 4 },
        { color: '#b99939', radius: 4 },
        { color: '#b99939', radius: 4 },
        { color: '#b99939', radius: 3 },
        { color: '#b99939', radius: 2 },
        { color: '#b99939', radius: 2 }
      ];

      return PageObjects.visualize.clickMapZoomOut()
      .then(function () {
        return PageObjects.visualize.getMapZoomOutEnabled();
      })
      // we can tell we're at level 1 because zoom out is disabled
      .then(function () {
        return PageObjects.common.try(function tryingForTime() {
          return PageObjects.visualize.getMapZoomOutEnabled()
            .then(function (enabled) {
              //should be able to zoom more as current config has 0 as min level.
              expect(enabled).to.be(true);
            });
        });
      })
      .then(function () {
        return PageObjects.common.try(function tryingForTime() {
          return PageObjects.visualize.getTileMapData()
          .then(function (data) {
            expect(data).to.eql(expectedPrecision2Circles);
          });
        });
      })
      .then(function takeScreenshot() {
        PageObjects.common.debug('Take screenshot (success)');
        PageObjects.common.saveScreenshot('map-after-zoom-from-1-to-2');
      });
    });

    bdd.it('Fit data bounds should zoom to level 3', function () {
      let expectedPrecision2ZoomCircles =   [ { color: '#750000', radius: 192 },
        { color: '#750000', radius: 191 },
        { color: '#750000', radius: 177 },
        { color: '#a40000', radius: 168 },
        { color: '#a40000', radius: 167 },
        { color: '#a40000', radius: 159 },
        { color: '#a40000', radius: 156 },
        { color: '#b45100', radius: 136 },
        { color: '#b67501', radius: 111 },
        { color: '#b67501', radius: 109 },
        { color: '#b67501', radius: 108 },
        { color: '#b67501', radius: 104 },
        { color: '#b67501', radius: 101 },
        { color: '#b67501', radius: 101 },
        { color: '#b99939', radius: 84 },
        { color: '#b99939', radius: 84 },
        { color: '#b99939', radius: 74 },
        { color: '#b99939', radius: 73 },
        { color: '#b99939', radius: 73 },
        { color: '#b99939', radius: 66 },
        { color: '#b99939', radius: 60 },
        { color: '#b99939', radius: 57 },
        { color: '#b99939', radius: 57 },
        { color: '#b99939', radius: 47 },
        { color: '#b99939', radius: 43 },
        { color: '#b99939', radius: 43 },
        { color: '#b99939', radius: 43 },
        { color: '#b99939', radius: 38 },
        { color: '#b99939', radius: 36 },
        { color: '#b99939', radius: 35 },
        { color: '#b99939', radius: 34 },
        { color: '#b99939', radius: 34 },
        { color: '#b99939', radius: 31 },
        { color: '#b99939', radius: 30 },
        { color: '#b99939', radius: 28 },
        { color: '#b99939', radius: 27 },
        { color: '#b99939', radius: 24 },
        { color: '#b99939', radius: 22 },
        { color: '#b99939', radius: 19 },
        { color: '#b99939', radius: 19 },
        { color: '#b99939', radius: 15 },
        { color: '#b99939', radius: 15 },
        { color: '#b99939', radius: 15 },
        { color: '#b99939', radius: 12 },
        { color: '#b99939', radius: 9 },
        { color: '#b99939', radius: 9 }
      ];

      return PageObjects.visualize.clickMapFitDataBounds()
      .then(function () {
        return PageObjects.visualize.getTileMapData();
      })
      .then(function (data) {
        expect(data).to.eql(expectedPrecision2ZoomCircles);
      });
    });

    /*
    ** NOTE: Since we don't have a reliable way to know the zoom level, we can
    ** check some data after we save the viz, then zoom in and check that the data
    ** changed, then open the saved viz and check that it's back to the original data.
    */
    bdd.it('should save with zoom level and load, take screenshot', function () {
      let vizName1 = 'Visualization TileMap';
      let expectedTableData =  [ 'dr4 127', 'dr7 92', '9q5 91', '9qc 89', 'drk 87',
        'dps 82', 'dph 82', 'dp3 79', 'dpe 78', 'dp8 77'
      ];

      let expectedTableDataZoomed = [ 'dr5r 21', 'dps8 20', '9q5b 19', 'b6uc 17',
        '9y63 17', 'c20g 16', 'dqfz 15', 'dr8h 14', 'dp8p 14', 'dp3k 14'
      ];

      return PageObjects.visualize.clickMapZoomIn()
      .then(function () {
        return PageObjects.visualize.clickMapZoomIn();
      })
      .then(function (message) {
        return PageObjects.visualize.saveVisualization(vizName1);
      })
      .then(function (message) {
        PageObjects.common.debug('Saved viz message = ' + message);
        expect(message).to.be('Visualization Editor: Saved Visualization \"' + vizName1 + '\"');
      })
      .then(function testVisualizeWaitForToastMessageGone() {
        return PageObjects.visualize.waitForToastMessageGone();
      })
      .then(function () {
        return PageObjects.visualize.collapseChart();
      })
      // we're not selecting page size all, so we only have to verify the first page of data
      .then(function getDataTableData() {
        PageObjects.common.debug('first get the zoom level 5 page data and verify it');
        return PageObjects.visualize.getDataTableData();
      })
      .then(function showData(data) {
        expect(data.trim().split('\n')).to.eql(expectedTableData);
        return PageObjects.visualize.collapseChart();
      })
      .then(function () {
        // zoom to level 6, and make sure we go back to the saved level 5
        return PageObjects.visualize.clickMapZoomIn();
      })
      .then(function () {
        return PageObjects.visualize.collapseChart();
      })
      .then(function getDataTableData() {
        PageObjects.common.debug('second get the zoom level 6 page data and verify it');
        return PageObjects.visualize.getDataTableData();
      })
      .then(function showData(data) {
        expect(data.trim().split('\n')).to.eql(expectedTableDataZoomed);
        return PageObjects.visualize.collapseChart();
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
      .then(function () {
        return PageObjects.visualize.collapseChart();
      })
      .then(function getDataTableData() {
        PageObjects.common.debug('third get the zoom level 5 page data and verify it');
        return PageObjects.visualize.getDataTableData();
      })
      .then(function showData(data) {
        expect(data.trim().split('\n')).to.eql(expectedTableData);
        return PageObjects.visualize.collapseChart();
      })
      .then(function takeScreenshot() {
        PageObjects.common.debug('Take screenshot');
        PageObjects.common.saveScreenshot('Visualize-site-map');
      });
    });


    bdd.it('should zoom in to level 10', function () {
      // 6
      return PageObjects.visualize.clickMapZoomIn()
      .then(function () {
        // 7
        return PageObjects.visualize.clickMapZoomIn();
      })
      .then(function () {
        // 8
        return PageObjects.visualize.clickMapZoomIn();
      })
      .then(function () {
        // 9
        return PageObjects.visualize.clickMapZoomIn();
      })
      .then(function () {
        return PageObjects.common.try(function tryingForTime() {
          return PageObjects.visualize.getMapZoomInEnabled()
            .then(function (enabled) {
              expect(enabled).to.be(true);
            });
        });
      })
      .then(function () {
        return PageObjects.visualize.clickMapZoomIn();
      })
      .then(function () {
        return PageObjects.visualize.getMapZoomInEnabled();
      })
      // now we're at level 10 and zoom out should be disabled
      .then(function (enabled) {
        expect(enabled).to.be(false);
      });
    });


  });
});
