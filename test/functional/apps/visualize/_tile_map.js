import expect from 'expect.js';

export default function ({ getService, getPageObjects }) {
  const log = getService('log');
  const retry = getService('retry');
  const screenshots = getService('screenshots');
  const PageObjects = getPageObjects(['common', 'visualize', 'header', 'settings']);

  describe('tile map visualize app', function describeIndexTests() {
    before(async function () {
      const fromTime = '2015-09-19 06:31:44.000';
      const toTime = '2015-09-23 18:31:44.000';

      log.debug('navigateToApp visualize');
      await PageObjects.common.navigateToUrl('visualize', 'new');
      log.debug('clickTileMap');
      await PageObjects.visualize.clickTileMap();
      await PageObjects.visualize.clickNewSearch();
      log.debug('Set absolute time range from \"' + fromTime + '\" to \"' + toTime + '\"');
      await PageObjects.header.setAbsoluteRange(fromTime, toTime);
      log.debug('select bucket Geo Coordinates');
      await PageObjects.visualize.clickBucket('Geo Coordinates');
      log.debug('Click aggregation Geohash');
      await PageObjects.visualize.selectAggregation('Geohash');
      log.debug('Click field geo.coordinates');
      await retry.try(async function tryingForTime() {
        await PageObjects.visualize.selectField('geo.coordinates');
      });
      await PageObjects.visualize.clickGo();
      await PageObjects.header.waitUntilLoadingHasFinished();
    });

    /**
     * manually compare data due to possible small difference in numbers. This is browser dependent.
     */
    function compareTableData(expected, actual) {
      log.debug('comparing expected: ', expected);
      log.debug('with actual: ', actual);

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

    describe('Only request data around extent of map option', async () => {
      before(async () => await PageObjects.visualize.openSpyPanel());

      it('when checked adds filters to aggregation', async () => {
        const tableHeaders = await PageObjects.visualize.getDataTableHeaders();
        expect(tableHeaders.trim()).to.equal('filter geohash_grid Count Geo Centroid');
      });

      it('when not checked does not add filters to aggregation', async () => {
        await PageObjects.visualize.toggleIsFilteredByCollarCheckbox();
        await PageObjects.visualize.clickGo();
        await PageObjects.header.waitUntilLoadingHasFinished();
        const tableHeaders = await PageObjects.visualize.getDataTableHeaders();
        expect(tableHeaders.trim()).to.equal('geohash_grid Count Geo Centroid');
      });

      after(async () => {
        await PageObjects.visualize.closeSpyPanel();
        await PageObjects.visualize.toggleIsFilteredByCollarCheckbox();
        await PageObjects.visualize.clickGo();
        await PageObjects.header.waitUntilLoadingHasFinished();
      });
    });

    describe('tile map chart', function indexPatternCreation() {
      it('should show correct tile map data on default zoom level', async function () {
        const expectedTableData = ['9 5,787 { "lat": 37.22448418632405, "lon": -103.01935195013255 }',
          'd 5,600 { "lat": 37.44271478370398, "lon": -81.72692197253595 }',
          'c 1,319 { "lat": 47.72720855392425, "lon": -109.84745063951028 }',
          'b 999 { "lat": 62.04130042948433, "lon": -155.28087269195967 }',
          'f 187 { "lat": 45.656166475784175, "lon": -82.45831044201545 }',
          '8 108 { "lat": 18.85260305600241, "lon": -156.5148810390383 }'];
        //level 1
        await PageObjects.visualize.clickMapZoomOut();
        //level 0
        await PageObjects.visualize.clickMapZoomOut();

        await PageObjects.visualize.openSpyPanel();
        await PageObjects.settings.setPageSize('All');
        await PageObjects.visualize.selectTableInSpyPaneSelect();
        const actualTableData = await PageObjects.visualize.getDataTableData();
        compareTableData(expectedTableData, actualTableData.trim().split('\n'));
        await PageObjects.visualize.closeSpyPanel();
      });

      it('should not be able to zoom out beyond 0', async function () {
        await PageObjects.visualize.zoomAllTheWayOut();
        const enabled = await PageObjects.visualize.getMapZoomOutEnabled();
        expect(enabled).to.be(false);
        screenshots.take('map-at-zoom-0');
      });

      // See https://github.com/elastic/kibana/issues/13137 if this test starts failing intermittently
      it('Fit data bounds should zoom to level 3', async function () {
        const expectedPrecision2DataTable = [
          '- dn 1,429 { "lat": 36.38058884214008, "lon": -84.78904345856186 }',
          '- dp 1,418 { "lat": 41.64735764514311, "lon": -84.89821054446622 }',
          '- 9y 1,215 { "lat": 36.45605112115542, "lon": -95.0664575824997 }',
          '- 9z 1,099 { "lat": 42.18533764798381, "lon": -95.16736779696697 }',
          '- dr 1,076 { "lat": 42.02351013780139, "lon": -73.98091798822212 }',
          '- dj 982 { "lat": 31.672735499211466, "lon": -84.50815450245526 }',
          '- 9v 938 { "lat": 31.380767446489873, "lon": -95.2705099188121 }',
          '- 9q 722 { "lat": 36.51360723008776, "lon": -119.18302692440686 }',
          '- 9w 475 { "lat": 36.39264289740669, "lon": -106.91102287667363 }',
          '- cb 457 { "lat": 46.70940601270996, "lon": -95.81077801137022 }'
        ];

        await PageObjects.visualize.clickMapFitDataBounds();
        await PageObjects.visualize.openSpyPanel();
        await PageObjects.visualize.selectTableInSpyPaneSelect();
        const data = await PageObjects.visualize.getDataTableData();
        await compareTableData(expectedPrecision2DataTable, data.trim().split('\n'));
        screenshots.take('map-at-zoom-3');
        await PageObjects.visualize.closeSpyPanel();
      });

      it('Newly saved visualization retains map bounds', async () => {
        const vizName1 = 'Visualization TileMap';

        await PageObjects.visualize.clickMapZoomIn();
        await PageObjects.visualize.clickMapZoomIn();

        const mapBounds = await PageObjects.visualize.getMapBounds();

        await PageObjects.visualize.closeSpyPanel();
        await PageObjects.visualize.saveVisualization(vizName1);
        await PageObjects.header.waitForToastMessageGone();

        const afterSaveMapBounds = await PageObjects.visualize.getMapBounds();

        // For some reason the values are slightly different, so we can't check that they are equal. But we did
        // have a bug where after the save, there were _no_ map bounds. So this checks for the later case, but
        // until we figure out how to make sure the map center is always the exact same, we can't comparison check.
        expect(mapBounds).to.not.be(undefined);
        expect(afterSaveMapBounds).to.not.be(undefined);
      });

      /*
       ** NOTE: Since we don't have a reliable way to know the zoom level, we can
       ** check some data after we save the viz, then zoom in and check that the data
       ** changed, then open the saved viz and check that it's back to the original data.
       */
      it('should save with zoom level and load, take screenshot', async function () {
        const expectedZoom5Data = [
          '- 9q5 91 { "lat": 34.2934322102855, "lon": -118.57068326651722 }',
          '- 9qc 89 { "lat": 38.64546895785822, "lon": -121.59105236401383 }',
          '- dp3 79 { "lat": 41.68207651723318, "lon": -87.98703769162958 }',
          '- dp8 77 { "lat": 43.00976789278256, "lon": -89.27605793496909 }',
          '- dp6 74 { "lat": 41.468768046942316, "lon": -86.55083711737313 }',
          '- 9qh 74 { "lat": 34.18319454366291, "lon": -117.426273193009 }',
          '- 9y7 73 { "lat": 35.87868071952197, "lon": -96.3330221912275 }',
          '- 9ys 71 { "lat": 37.31065319536228, "lon": -94.82038319412567 }',
          '- 9yn 71 { "lat": 34.57203017311617, "lon": -92.17198946946104 }',
          '- 9q9 70 { "lat": 37.327310177098425, "lon": -121.70855726221842 }'
        ];
        const expectedZoom6Data = [
          '- c20g 16 { "lat": 45.59211894578766, "lon": -122.47455075674225 }',
          '- c28c 13 { "lat": 48.0181491561234, "lon": -122.43847891688347 }',
          '- c2e5 11 { "lat": 48.46440218389034, "lon": -119.51805034652352 }',
          '- c262 10 { "lat": 46.56816971953958, "lon": -120.5440594162792 }',
          '- c23n 10 { "lat": 47.51524904742837, "lon": -122.26747375912964 }',
          '- 9rw6 10 { "lat": 42.59157135151327, "lon": -114.79671782813966 }',
          '- c2mq 9 { "lat": 47.547698873095214, "lon": -116.18850083090365 }',
          '- c27x 9 { "lat": 47.753206375055015, "lon": -118.7438936624676 }',
          '- c25p 9 { "lat": 46.30563497543335, "lon": -119.30418533273041 }',
          '- c209 9 { "lat": 45.29028058052063, "lon": -122.9347869195044 }'
        ];
        const vizName1 = 'Visualization TileMap';

        // For some reason the map bounds right after saving a tile map for the first time are slightly different
        // than when the map is opened from the landing page. This causes the data to be slightly different.
        // We should figure out why that is, but it doesn't actually affect the map the user views.
        // In order to get this test to pass we'll re-open the saved visualization from the landing page.
        await PageObjects.visualize.loadSavedVisualization(vizName1);

        const firstMapBounds = await PageObjects.visualize.getMapBounds();

        await PageObjects.visualize.openSpyPanel();
        await PageObjects.visualize.selectTableInSpyPaneSelect();
        const actualZoom5Data = await PageObjects.visualize.getDataTableData();
        compareTableData(expectedZoom5Data, actualZoom5Data.trim().split('\n'));

        await PageObjects.visualize.closeSpyPanel();
        await PageObjects.visualize.clickMapZoomIn();
        await PageObjects.visualize.openSpyPanel();

        const actualZoom6Data = await PageObjects.visualize.getDataTableData();
        compareTableData(expectedZoom6Data, actualZoom6Data.trim().split('\n'));

        await PageObjects.visualize.closeSpyPanel();

        await PageObjects.visualize.loadSavedVisualization(vizName1);
        await PageObjects.visualize.waitForVisualization();

        const secondMapBounds = await PageObjects.visualize.getMapBounds();

        expect(firstMapBounds.top_left.lat).to.equal(secondMapBounds.top_left.lat);
        expect(firstMapBounds.top_left.long).to.equal(secondMapBounds.top_left.long);
        expect(firstMapBounds.bottom_right.lat).to.equal(secondMapBounds.bottom_right.lat);
        expect(firstMapBounds.bottom_right.long).to.equal(secondMapBounds.bottom_right.long);

        await PageObjects.visualize.openSpyPanel();

        await PageObjects.visualize.selectTableInSpyPaneSelect();
        const actualReOpenedZoom5Data = await PageObjects.visualize.getDataTableData();
        compareTableData(expectedZoom5Data, actualReOpenedZoom5Data.trim().split('\n'));

        await PageObjects.visualize.closeSpyPanel();

        await screenshots.take('Visualize-site-map');
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

      it('wms switch should change allow to zoom in further', async function () {
        await PageObjects.visualize.openSpyPanel();
        await PageObjects.visualize.clickOptions();
        await PageObjects.visualize.selectWMS();
        await PageObjects.visualize.clickGo();
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.common.sleep(2000);
        let enabled = await PageObjects.visualize.getMapZoomInEnabled();
        expect(enabled).to.be(true);
        await PageObjects.visualize.clickMapZoomIn();
        enabled = await PageObjects.visualize.getMapZoomInEnabled();
        expect(enabled).to.be(true);
      });
    });
  });
}
