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

  describe('vector map', function () {
    const fromTime = '2015-09-19 06:31:44.000';
    const toTime = '2015-09-23 18:31:44.000';

    const log = getService('log');
    const PageObjects = getPageObjects(['common', 'visualize', 'header', 'settings']);

    before(async function () {

      log.debug('navigateToApp visualize');
      await PageObjects.visualize.navigateToNewVisualization();
      log.debug('clickRegionMap');
      await PageObjects.visualize.clickRegionMap();
      await PageObjects.visualize.clickNewSearch();
      log.debug('Set absolute time range from \"' + fromTime + '\" to \"' + toTime + '\"');
      await PageObjects.header.setAbsoluteRange(fromTime, toTime);
      log.debug('Bucket = shape field');
      await PageObjects.visualize.clickBucket('shape field');
      log.debug('Aggregation = Terms');
      await PageObjects.visualize.selectAggregation('Terms');
      log.debug('Field = geo.src');
      await PageObjects.visualize.selectField('geo.src');
      await PageObjects.visualize.clickGo();
    });

    describe('vector map', function indexPatternCreation() {

      it('should have inspector enabled', async function () {
        const spyToggleExists = await PageObjects.visualize.isInspectorButtonEnabled();
        expect(spyToggleExists).to.be(true);
      });

      it('should show results after clicking play (join on states)', async function () {
        const expectedData = [['CN', '2,592'], ['IN', '2,373'], ['US', '1,194'], ['ID', '489'], ['BR', '415']];
        await PageObjects.visualize.openInspector();
        const data = await PageObjects.visualize.getInspectorTableData();
        expect(data).to.eql(expectedData);
      });

      it('should change results after changing layer to world', async function () {

        await PageObjects.visualize.clickOptions();
        await  PageObjects.visualize.selectFieldById('World Countries', 'regionMap');

        await PageObjects.common.sleep(1000);//give angular time to go update UI state

        //ensure all fields are there
        await  PageObjects.visualize.selectFieldById('Two letter abbreviation', 'joinField');
        await  PageObjects.visualize.selectFieldById('Three letter abbreviation', 'joinField');
        await  PageObjects.visualize.selectFieldById('Country name', 'joinField');
        await  PageObjects.visualize.selectFieldById('Two letter abbreviation', 'joinField');

        await PageObjects.common.sleep(2000);//need some time for the data to load

        await PageObjects.visualize.openInspector();
        const actualData = await PageObjects.visualize.getInspectorTableData();
        const expectedData = [['CN', '2,592'], ['IN', '2,373'], ['US', '1,194'], ['ID', '489'], ['BR', '415']];
        expect(actualData).to.eql(expectedData);


      });

    });
  });

}
