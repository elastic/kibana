import expect from 'expect.js';

export default function ({ getService, getPageObjects }) {
  const log = getService('log');
  const retry = getService('retry');
  const screenshots = getService('screenshots');
  const PageObjects = getPageObjects(['common', 'visualize', 'header', 'settings']);

  describe('tile map visualize app', function describeIndexTests() {
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

        let geohashIndex;
        let countIndex;
        let latIndex;
        let lonIndex;
        if (tokens.length === 8) {
          // table row aggregations: geohash_grid -> count -> geocentroid
          geohashIndex = 0;
          countIndex = 1;
          latIndex = 4;
          lonIndex = 6;
        } else if (tokens.length === 9) {
          // table row aggregations: filter -> geohash_grid -> count -> geocentroid
          geohashIndex = 1;
          countIndex = 2;
          latIndex = 5;
          lonIndex = 7;
        } else {
          log.error(`Unexpected number of tokens contained in spy table row: ${row}`);
        }
        return {
          geohash: tokens[geohashIndex],
          count: tokens[countIndex],
          lat: Math.floor(parseFloat(tokens[latIndex])),
          lon: Math.floor(parseFloat(tokens[lonIndex]))
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

        return PageObjects.visualize.openSpyPanel()
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
            return PageObjects.visualize.closeSpyPanel();
          });
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
        const expectedTableData = [
          '- 9q5 91 { "lat": 34.2934322102855, "lon": -118.57068326651722 }',
          '- 9qc 89 { "lat": 38.64546895785822, "lon": -121.59105236401383 }',
          '- dp3 79 { "lat": 41.68207651723318, "lon": -87.98703769162958 }',
          '- dp8 77 { "lat": 43.00976789278256, "lon": -89.27605793496909 }',
          '- dp6 74 { "lat": 41.468768046942316, "lon": -86.55083711737313 }',
          '- 9qh 74 { "lat": 34.18319454366291, "lon": -117.426273193009 }',
          '- 9y7 73 { "lat": 35.87868071952197, "lon": -96.3330221912275 }',
          '- 9ys 71 { "lat": 37.31065319536228, "lon": -94.82038319412567 }',
          '- 9yn 71 { "lat": 34.57203017311617, "lon": -92.17198946946104 }',
          '- 9q9 70 { "lat": 37.327310177098425, "lon": -121.70855726221842 }' ];
        const expectedTableDataZoomed = [
          '- c20g 16 { "lat": 45.59211894578766, "lon": -122.47455075674225 }',
          '- c28c 13 { "lat": 48.0181491561234, "lon": -122.43847891688347 }',
          '- c2e5 11 { "lat": 48.46440218389034, "lon": -119.51805034652352 }',
          '- c262 10 { "lat": 46.56816971953958, "lon": -120.5440594162792 }',
          '- c23n 10 { "lat": 47.51524904742837, "lon": -122.26747375912964 }',
          '- 9rw6 10 { "lat": 42.59157135151327, "lon": -114.79671782813966 }',
          '- c2mq 9 { "lat": 47.547698873095214, "lon": -116.18850083090365 }',
          '- c27x 9 { "lat": 47.753206375055015, "lon": -118.7438936624676 }',
          '- c25p 9 { "lat": 46.30563497543335, "lon": -119.30418533273041 }',
          '- c209 9 { "lat": 45.29028058052063, "lon": -122.9347869195044 }' ];
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
          return PageObjects.visualize.openSpyPanel();
        })
        // we're not selecting page size all, so we only have to verify the first page of data
        .then(function getDataTableData() {
          log.debug('first get the zoom level 5 page data and verify it');
          return PageObjects.visualize.getDataTableData();
        })
        .then(function showData(data) {
          compareTableData(expectedTableData, data.trim().split('\n'));
          return PageObjects.visualize.closeSpyPanel();
        })
        .then(function () {
          // zoom to level 6, and make sure we go back to the saved level 5
          return PageObjects.visualize.clickMapZoomIn();
        })
        .then(function () {
          return PageObjects.visualize.openSpyPanel();
        })
        .then(function getDataTableData() {
          log.debug('second get the zoom level 6 page data and verify it');
          return PageObjects.visualize.getDataTableData();
        })
        .then(function showData(data) {
          compareTableData(expectedTableDataZoomed, data.trim().split('\n'));
          return PageObjects.visualize.closeSpyPanel();
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
          return PageObjects.visualize.openSpyPanel();
        })
        .then(function getDataTableData() {
          log.debug('third get the zoom level 5 page data and verify it');
          return PageObjects.visualize.getDataTableData();
        })
        .then(function showData(data) {
          compareTableData(expectedTableData, data.trim().split('\n'));
          return PageObjects.visualize.closeSpyPanel();
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

      it('wms switch should change allow to zoom in further', function () {

        return PageObjects.visualize.openSpyPanel()
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
