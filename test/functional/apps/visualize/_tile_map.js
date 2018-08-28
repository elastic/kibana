/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import expect from 'expect.js';

export default function ({ getService, getPageObjects }) {
  const log = getService('log');
  const retry = getService('retry');
  const remote = getService('remote');
  const PageObjects = getPageObjects(['common', 'visualize', 'header', 'settings']);


  describe('tile map visualize app', function () {


    describe('incomplete config', function describeIndexTests() {


      before(async function () {
        // Make sure the window is height enough to show the spy panel without hiding the map
        remote.setWindowSize(1280, 1000);

        const fromTime = '2015-09-19 06:31:44.000';
        const toTime = '2015-09-23 18:31:44.000';

        log.debug('navigateToApp visualize');
        await PageObjects.visualize.navigateToNewVisualization();
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
        await PageObjects.visualize.navigateToNewVisualization();
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
      function compareTableData(actual, expected) {
        log.debug('comparing expected: ', expected);
        log.debug('with actual: ', actual);

        const roundedValues = actual.map(row => {
          // Parse last element in each row as JSON and floor the lat/long value
          const coords = JSON.parse(row[row.length - 1]);
          row[row.length - 1] = {
            lat: Math.floor(parseFloat(coords.lat)),
            lon: Math.floor(parseFloat(coords.lon)),
          };
          return row;
        });

        expect(roundedValues).to.eql(expected);
      }

      describe('tile map chart', function indexPatternCreation() {
        it('should have inspector enabled', async function () {
          const spyToggleExists = await PageObjects.visualize.isInspectorButtonEnabled();
          expect(spyToggleExists).to.be(true);
        });

        it('should show correct tile map data on default zoom level', async function () {
          const expectedTableData = [
            ['-', '9', '5,787', { 'lat': 37, 'lon': -104 } ],
            ['-', 'd', '5,600', { 'lat': 37, 'lon': -82 } ],
            ['-', 'c', '1,319', { 'lat': 47, 'lon': -110 } ],
            ['-', 'b', '999', { 'lat': 62, 'lon': -156 } ],
            ['-', 'f', '187', { 'lat': 45, 'lon': -83 } ],
            ['-', '8', '108', { 'lat': 18, 'lon': -157 } ]
          ];
          //level 1
          await PageObjects.visualize.clickMapZoomOut();
          //level 0
          await PageObjects.visualize.clickMapZoomOut();

          await PageObjects.visualize.openInspector();
          await PageObjects.visualize.setInspectorTablePageSize(50);
          const actualTableData = await PageObjects.visualize.getInspectorTableData();
          await PageObjects.visualize.closeInspector();
          compareTableData(actualTableData, expectedTableData);
        });

        it('should not be able to zoom out beyond 0', async function () {
          await PageObjects.visualize.zoomAllTheWayOut();
          const enabled = await PageObjects.visualize.getMapZoomOutEnabled();
          expect(enabled).to.be(false);
        });

        // See https://github.com/elastic/kibana/issues/13137 if this test starts failing intermittently
        it('Fit data bounds should zoom to level 3', async function () {
          const expectedPrecision2DataTable = [
            ['-', 'dn', '1,429', { 'lat': 36, 'lon': -85 }],
            ['-', 'dp', '1,418', { 'lat': 41, 'lon': -85 }],
            ['-', '9y', '1,215', { 'lat': 36, 'lon': -96 }],
            ['-', '9z', '1,099', { 'lat': 42, 'lon': -96 }],
            ['-', 'dr', '1,076', { 'lat': 42, 'lon': -74 }],
            ['-', 'dj', '982', { 'lat': 31, 'lon': -85 }],
            ['-', '9v', '938', { 'lat': 31, 'lon': -96 }],
            ['-', '9q', '722', { 'lat': 36, 'lon': -120 }],
            ['-', '9w', '475', { 'lat': 36, 'lon': -107 }],
            ['-', 'cb', '457', { 'lat': 46, 'lon': -96 }],
            [ '-', 'c2', '453', { lat: 47, lon: -120 } ],
            [ '-', '9x', '420', { lat: 41, lon: -107 } ],
            [ '-', 'dq', '399', { lat: 37, lon: -78 } ],
            [ '-', '9r', '396', { lat: 41, lon: -120 } ],
            [ '-', '9t', '274', { lat: 32, lon: -107 } ],
            [ '-', 'c8', '271', { lat: 47, lon: -107 } ],
            [ '-', 'dh', '214', { lat: 26, lon: -82 } ],
            [ '-', 'b6', '207', { lat: 60, lon: -162 } ],
            [ '-', 'bd', '206', { lat: 59, lon: -153 } ],
            [ '-', 'b7', '167', { lat: 64, lon: -163 } ],
          ];

          await PageObjects.visualize.clickMapFitDataBounds();
          await PageObjects.visualize.openInspector();
          const data = await PageObjects.visualize.getInspectorTableData();
          await PageObjects.visualize.closeInspector();
          compareTableData(data, expectedPrecision2DataTable);
        });

        it('Newly saved visualization retains map bounds', async () => {
          const vizName1 = 'Visualization TileMap';

          await PageObjects.visualize.clickMapZoomIn();
          await PageObjects.visualize.clickMapZoomIn();

          const mapBounds = await PageObjects.visualize.getMapBounds();
          await PageObjects.visualize.closeInspector();

          await PageObjects.visualize.saveVisualization(vizName1);

          const afterSaveMapBounds = await PageObjects.visualize.getMapBounds();

          await PageObjects.visualize.closeInspector();
          // For some reason the values are slightly different, so we can't check that they are equal. But we did
          // have a bug where after the save, there were _no_ map bounds. So this checks for the later case, but
          // until we figure out how to make sure the map center is always the exact same, we can't comparison check.
          expect(mapBounds).to.not.be(undefined);
          expect(afterSaveMapBounds).to.not.be(undefined);
        });

      });

      describe('Only request data around extent of map option', async () => {

        it('when checked adds filters to aggregation', async () => {
          const vizName1 = 'Visualization TileMap';
          await PageObjects.visualize.loadSavedVisualization(vizName1);
          await PageObjects.visualize.openInspector();
          const tableHeaders = await PageObjects.visualize.getInspectorTableHeaders();
          await PageObjects.visualize.closeInspector();
          expect(tableHeaders).to.eql(['filter', 'geohash_grid', 'Count', 'Geo Centroid']);
        });

        it('when not checked does not add filters to aggregation', async () => {
          await PageObjects.visualize.toggleOpenEditor(2);
          await PageObjects.visualize.toggleIsFilteredByCollarCheckbox();
          await PageObjects.visualize.clickGo();
          await PageObjects.header.waitUntilLoadingHasFinished();
          await PageObjects.visualize.openInspector();
          const tableHeaders = await PageObjects.visualize.getInspectorTableHeaders();
          await PageObjects.visualize.closeInspector();
          expect(tableHeaders).to.eql(['geohash_grid', 'Count', 'Geo Centroid']);
        });

        after(async () => {
          await PageObjects.visualize.toggleIsFilteredByCollarCheckbox();
          await PageObjects.visualize.clickGo();
          await PageObjects.header.waitUntilLoadingHasFinished();
        });
      });
    });
  });
}
