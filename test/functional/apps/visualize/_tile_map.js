import expect from 'expect.js';

export default function ({ getService, getPageObjects }) {
  const log = getService('log');
  const retry = getService('retry');
  const remote = getService('remote');
  const PageObjects = getPageObjects(['common', 'visualize', 'header', 'settings']);


  describe('tile map visualize app', function () {


    describe('incomplete config', function () {


      before(async function () {
        // Make sure the window is height enough to show the spy panel without hiding the map
        remote.setWindowSize(1280, 1000);

        const fromTime = '2015-09-19 06:31:44.000';
        const toTime = '2015-09-23 18:31:44.000';

        log.debug('navigateToApp visualize');
        await PageObjects.common.navigateToUrl('visualize', 'new');
        log.debug('clickTileMap');
        await PageObjects.visualize.clickTileMap();
        await PageObjects.visualize.clickNewSearch();
        log.debug('Set absolute time range from \"' + fromTime + '\" to \"' + toTime + '\"');
        await PageObjects.header.setAbsoluteRange(fromTime, toTime);

        //do not configure aggs
      });


      it('should be able to zoom in twice', async () => {
        //should not throw
        await PageObjects.visualize.clickMapZoomIn();
        await PageObjects.visualize.clickMapZoomIn();
      });


    });



    describe('complete config', function describeIndexTests() {
      before(async function () {
        // Make sure the window is height enough to show the spy panel without hiding the map
        remote.setWindowSize(1280, 1000);

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
        it('should display spy panel toggle button', async function () {
          const spyToggleExists = await PageObjects.visualize.getSpyToggleExists();
          expect(spyToggleExists).to.be(true);
        });

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
          await PageObjects.visualize.setSpyPanelPageSize('All');
          await PageObjects.visualize.selectTableInSpyPaneSelect();
          const actualTableData = await PageObjects.visualize.getDataTableData();
          compareTableData(expectedTableData, actualTableData.trim().split('\n'));
          await PageObjects.visualize.closeSpyPanel();
        });

        it('should not be able to zoom out beyond 0', async function () {
          await PageObjects.visualize.zoomAllTheWayOut();
          const enabled = await PageObjects.visualize.getMapZoomOutEnabled();
          expect(enabled).to.be(false);
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
          await PageObjects.visualize.closeSpyPanel();
        });

        it('Newly saved visualization retains map bounds', async () => {
          const vizName1 = 'Visualization TileMap';

          await PageObjects.visualize.clickMapZoomIn();
          await PageObjects.visualize.clickMapZoomIn();

          const mapBounds = await PageObjects.visualize.getMapBounds();

          await PageObjects.visualize.closeSpyPanel();
          await PageObjects.visualize.saveVisualization(vizName1);

          const afterSaveMapBounds = await PageObjects.visualize.getMapBounds();

          // For some reason the values are slightly different, so we can't check that they are equal. But we did
          // have a bug where after the save, there were _no_ map bounds. So this checks for the later case, but
          // until we figure out how to make sure the map center is always the exact same, we can't comparison check.
          expect(mapBounds).to.not.be(undefined);
          expect(afterSaveMapBounds).to.not.be(undefined);
        });

      });
    });
  });
}
