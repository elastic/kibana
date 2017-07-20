import expect from 'expect.js';

export default function ({ getService, getPageObjects }) {
  const log = getService('log');
  const retry = getService('retry');
  const screenshots = getService('screenshots');
  const PageObjects = getPageObjects(['common', 'visualize', 'header', 'settings']);

  describe('visualize app', function describeIndexTests() {
    before(function () {
      const fromTime = '2015-09-19 06:31:44.000';
      const toTime = '2015-09-23 18:31:44.000';

      log.debug('navigateToApp visualize');
      return PageObjects.common.navigateToUrl('visualize', 'new')
        .then(function () {
          log.debug('clickTileMap');
          return PageObjects.visualize.clickTileMap();
        })
        .then(function () {
          return PageObjects.visualize.clickNewSearch();
        })
        .then(function () {
          log.debug('Set absolute time range from \"' + fromTime + '\" to \"' + toTime + '\"');
          return PageObjects.header.setAbsoluteRange(fromTime, toTime);
        })
        .then(function () {
          log.debug('select bucket Geo Coordinates');
          return PageObjects.visualize.clickBucket('Geo Coordinates');
        })
        .then(function () {
          log.debug('Click aggregation Geohash');
          return PageObjects.visualize.selectAggregation('Geohash');
        })
        .then(function () {
          log.debug('Click field geo.coordinates');
          return retry.try(function tryingForTime() {
            return PageObjects.visualize.selectField('geo.coordinates');
          });
        })
        .then(function () {
          return PageObjects.visualize.clickGo();
        })
        .then(function () {
          return PageObjects.header.waitUntilLoadingHasFinished();
        });
    });


    /**
     * manually compare data due to possible small difference in numbers. This is browser dependent.
     */
    function compareTableData(expected, actual) {

      expect(actual.length).to.eql(expected.length);

      function tokenize(row) {
        const tokens = row.split(' ');
        return {
          geohash: tokens[0],
          count: tokens[1],
          lat: Math.floor(parseFloat(tokens[4])),
          lon: Math.floor(parseFloat(tokens[6]))
        };
      }

      expect(actual.map(tokenize)).to.eql(expected.map(tokenize));
    }


    describe('tile map chart', function indexPatternCreation() {

      it('should show correct tile map data on default zoom level', function () {
        const expectedTableData = ['9 5,787 { "lat": 37.22448418632405, "lon": -103.01935195013255 }',
          'd 5,600 { "lat": 37.44271478370398, "lon": -81.72692197253595 }',
          'c 1,319 { "lat": 47.72720855392425, "lon": -109.84745063951028 }',
          'b 999 { "lat": 62.04130042948433, "lon": -155.28087269195967 }',
          'f 187 { "lat": 45.656166475784175, "lon": -82.45831044201545 }',
          '8 108 { "lat": 18.85260305600241, "lon": -156.5148810390383 }'];

        return PageObjects.visualize.collapseChart()
          .then(function () {
            //level 1
            return PageObjects.visualize.clickMapZoomOut();
          })
          .then(function () {
            //level 0
            return PageObjects.visualize.clickMapZoomOut();
          })
          .then(function () {
            return PageObjects.settings.setPageSize('All');
          })
          .then(function getDataTableData() {
            return PageObjects.visualize.getDataTableData()
            .then(function showData(actualTableData) {
              compareTableData(expectedTableData, actualTableData.trim().split('\n'));
              return PageObjects.visualize.collapseChart();
            });
          });

        it('should not be able to zoom out beyond 0', function () {
          return PageObjects.visualize.getMapZoomOutEnabled()
        // we can tell we're at level 1 because zoom out is disabled
          .then(function () {
            return retry.try(function tryingForTime() {
              return PageObjects.visualize.getMapZoomOutEnabled()
                .then(function (enabled) {
                  //should be able to zoom more as current config has 0 as min level.
                  expect(enabled).to.be(false);
                });
            });
          })
          .then(function takeScreenshot() {
            log.debug('Take screenshot (success)');
            screenshots.take('map-at-zoom-0');
          });
        });

        it('Fit data bounds should zoom to level 3', function () {
          const expectedPrecision2ZoomCircles = [
          { color: '#750000', radius: 192 },
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
        it('should save with zoom level and load, take screenshot', function () {
          const expectedTableData = [ 'dr4 127 { "lat": 40.142432276496855, "lon": -75.17097956302949 }',
            'dr7 92 { "lat": 41.48015560278588, "lon": -73.90037568609999 }',
            '9q5 91 { "lat": 34.293431888365156, "lon": -118.57068410102319 }',
            '9qc 89 { "lat": 38.645468642830515, "lon": -121.59105310990904 }',
            'drk 87 { "lat": 41.38891646156794, "lon": -72.50977680472464 }',
            'dps 82 { "lat": 42.79333563657796, "lon": -83.55129436180904 }',
            'dph 82 { "lat": 40.03466797526926, "lon": -83.6603344113725 }',
            'dp3 79 { "lat": 41.68207621697006, "lon": -87.98703811709073 }',
            'dpe 78 { "lat": 42.83740988287788, "lon": -85.13176125187714 }',
            'dp8 77 { "lat": 43.00976751178697, "lon": -89.27605860007854 }' ];
          const expectedTableDataZoomed = [ 'dr5r 21 { "lat": 40.73313889359789, "lon": -74.00737997410553 }',
            'dps8 20 { "lat": 42.25258858362213, "lon": -83.4615091625601 }',
            '9q5b 19 { "lat": 33.8619567100939, "lon": -118.28354520723224 }',
            'b6uc 17 { "lat": 60.721656321274004, "lon": -161.86279475141097 }',
            '9y63 17 { "lat": 35.48034298178904, "lon": -97.90940423550852 }',
            'c20g 16 { "lat": 45.59211885672994, "lon": -122.47455088770948 }',
            'dqfz 15 { "lat": 39.24278838559985, "lon": -74.69487586989999 }',
            'dr8h 14 { "lat": 42.9455179042582, "lon": -78.65373932623437 }',
            'dp8p 14 { "lat": 43.52336289028504, "lon": -89.84673104515034 }',
            'dp3k 14 { "lat": 41.569707432229606, "lon": -88.12707824898618 }' ];
          const vizName1 = 'Visualization TileMap';

          return PageObjects.visualize.clickMapZoomIn()
          .then(function () {
            return PageObjects.visualize.clickMapZoomIn();
          })
          .then(function () {
            return PageObjects.visualize.saveVisualization(vizName1);
          })
          .then(function (message) {
            log.debug('Saved viz message = ' + message);
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
            log.debug('first get the zoom level 5 page data and verify it');
            return PageObjects.visualize.getDataTableData();
          })
          .then(function showData(data) {
            compareTableData(expectedTableData, data.trim().split('\n'));
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
            log.debug('second get the zoom level 6 page data and verify it');
            return PageObjects.visualize.getDataTableData();
          })
          .then(function showData(data) {
            compareTableData(expectedTableDataZoomed, data.trim().split('\n'));
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
            log.debug('third get the zoom level 5 page data and verify it');
            return PageObjects.visualize.getDataTableData();
          })
          .then(function showData(data) {
            compareTableData(expectedTableData, data.trim().split('\n'));
            return PageObjects.visualize.collapseChart();
          })
          .then(function takeScreenshot() {
            log.debug('Take screenshot');
            screenshots.take('Visualize-site-map');
          });
        });

        it('should zoom in to level 10', function () {
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
            return retry.try(function tryingForTime() {
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

      it('wms switch should change allow to zoom in further', function () {

        return PageObjects.visualize.collapseChart()
          .then(function () {
            return PageObjects.visualize.clickOptions();
          })
          .then(function () {
            return PageObjects.visualize.selectWMS();
          })
          .then(function () {
            return PageObjects.visualize.clickGo();
          })
          .then(function () {
            return PageObjects.header.waitUntilLoadingHasFinished();
          })
          .then(function () {
            return PageObjects.common.sleep(2000);
          })
          .then(function () {
            return PageObjects.visualize.getMapZoomInEnabled();
          })
          .then(function (enabled) {//should be able to zoom in again
            expect(enabled).to.be(true);
          })
          .then(function () {
            return PageObjects.visualize.clickMapZoomIn();
          })
          .then(function () {
            return PageObjects.visualize.getMapZoomInEnabled();
          })
          .then(function (enabled) {//should be able to zoom in again
            expect(enabled).to.be(true);
          });

      });
    });
  });
}
