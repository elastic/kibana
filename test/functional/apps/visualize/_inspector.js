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
  const filterBar = getService('filterBar');
  const PageObjects = getPageObjects(['common', 'visualize', 'header']);

  describe('visualize app', function describeIndexTests() {
    before(async function () {
      const fromTime = '2015-09-19 06:31:44.000';
      const toTime = '2015-09-23 18:31:44.000';

      await PageObjects.visualize.navigateToNewVisualization();
      await PageObjects.visualize.clickVerticalBarChart();
      await PageObjects.visualize.clickNewSearch();

      log.debug('Set absolute time range from \"' + fromTime + '\" to \"' + toTime + '\"');
      await PageObjects.header.setAbsoluteRange(fromTime, toTime);
      await PageObjects.visualize.clickGo();
      await PageObjects.header.waitUntilLoadingHasFinished();
    });

    describe('inspector table', function indexPatternCreation() {
      it('should update table header when columns change', async function () {
        await PageObjects.visualize.openInspector();
        let headers = await PageObjects.visualize.getInspectorTableHeaders();
        expect(headers).to.eql(['Count']);

        log.debug('Add Average Metric on machine.ram field');
        await PageObjects.visualize.clickAddMetric();
        await PageObjects.visualize.clickBucket('Y-Axis', 'metric');
        await PageObjects.visualize.selectAggregation('Average', 'metrics');
        await PageObjects.visualize.selectField('machine.ram', 'metrics');
        await PageObjects.visualize.clickGo();
        await PageObjects.visualize.openInspector();

        headers = await PageObjects.visualize.getInspectorTableHeaders();
        expect(headers).to.eql(['Count', 'Average machine.ram']);
      });

      describe('filtering on inspector table values', function () {
        before(async function () {
          log.debug('Add X-Axis terms agg on machine.os.raw');
          await PageObjects.visualize.clickBucket('X-Axis');
          await PageObjects.visualize.selectAggregation('Terms');
          await PageObjects.visualize.selectField('machine.os.raw');
          await PageObjects.visualize.setSize(2);
          await PageObjects.visualize.toggleOtherBucket();
          await PageObjects.visualize.clickGo();
        });

        beforeEach(async function () {
          await PageObjects.visualize.openInspector();
        });

        afterEach(async function () {
          await PageObjects.visualize.closeInspector();
          await filterBar.removeFilter('machine.os.raw');
        });

        it('should allow filtering for values', async function () {
          let data = await PageObjects.visualize.getInspectorTableData();
          expect(data).to.eql([
            ['win 8', '2,904', '13,031,579,645.108'],
            ['win xp', '2,858', '13,073,190,186.423'],
            ['Other', '6,920', '13,123,599,766.011'],
          ]);

          await PageObjects.visualize.filterForInspectorTableCell(1, 1);
          data = await PageObjects.visualize.getInspectorTableData();
          expect(data).to.eql([
            ['win 8', '2,904', '13,031,579,645.108'],
          ]);
        });

        it('should allow filtering out values', async function () {
          await PageObjects.visualize.filterOutInspectorTableCell(1, 1);
          const data = await PageObjects.visualize.getInspectorTableData();
          expect(data).to.eql([
            ['win xp', '2,858', '13,073,190,186.423'],
            ['win 7', '2,814', '13,186,695,551.251'],
            ['Other', '4,106', '13,080,420,659.354'],
          ]);
        });

        it('should allow filtering for other values', async function () {
          await PageObjects.visualize.filterForInspectorTableCell(1, 3);
          const data = await PageObjects.visualize.getInspectorTableData();
          expect(data).to.eql([
            ['win 7', '2,814', '13,186,695,551.251'],
            ['ios', '2,784', '13,009,497,206.823'],
            ['Other', '1,322', '13,228,964,670.613'],
          ]);
        });

        it('should allow filtering out other values', async function () {
          await PageObjects.visualize.filterOutInspectorTableCell(1, 3);
          const data = await PageObjects.visualize.getInspectorTableData();
          expect(data).to.eql([
            ['win 8', '2,904', '13,031,579,645.108'],
            ['win xp', '2,858', '13,073,190,186.423'],
          ]);
        });
      });
    });
  });
}
