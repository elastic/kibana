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

export default function({ getService, getPageObjects }) {
  const log = getService('log');
  const inspector = getService('inspector');
  const filterBar = getService('filterBar');
  const PageObjects = getPageObjects(['common', 'visualize', 'timePicker']);

  describe('inspector', function describeIndexTests() {
    this.tags('smoke');
    before(async function() {
      await PageObjects.visualize.navigateToNewVisualization();
      await PageObjects.visualize.clickVerticalBarChart();
      await PageObjects.visualize.clickNewSearch();

      await PageObjects.timePicker.setDefaultAbsoluteRange();
    });

    describe('inspector table', function indexPatternCreation() {
      it('should update table header when columns change', async function() {
        await inspector.open();
        await inspector.expectTableHeaders(['Count']);

        log.debug('Add Average Metric on machine.ram field');
        await PageObjects.visualize.clickBucket('Y-axis', 'metrics');
        await PageObjects.visualize.selectAggregation('Average', 'metrics');
        await PageObjects.visualize.selectField('machine.ram', 'metrics');
        await PageObjects.visualize.clickGo();
        await inspector.open();
        await inspector.expectTableHeaders(['Count', 'Average machine.ram']);
      });

      describe('filtering on inspector table values', function() {
        before(async function() {
          log.debug('Add X-axis terms agg on machine.os.raw');
          await PageObjects.visualize.clickBucket('X-axis');
          await PageObjects.visualize.selectAggregation('Terms');
          await PageObjects.visualize.selectField('machine.os.raw');
          await PageObjects.visualize.setSize(2);
          await PageObjects.visualize.toggleOtherBucket(3);
          await PageObjects.visualize.clickGo();
        });

        beforeEach(async function() {
          await inspector.open();
          await PageObjects.visualize.waitForVisualizationRenderingStabilized();
        });

        afterEach(async function() {
          await inspector.close();
          await filterBar.removeFilter('machine.os.raw');
          await PageObjects.visualize.waitForVisualizationRenderingStabilized();
        });

        it('should allow filtering for values', async function() {
          await inspector.expectTableData([
            ['win 8', '2,904', '13,031,579,645.108'],
            ['win xp', '2,858', '13,073,190,186.423'],
            ['Other', '6,920', '13,123,599,766.011'],
          ]);

          await inspector.filterForTableCell(1, 1);
          await inspector.expectTableData([['win 8', '2,904', '13,031,579,645.108']]);
        });

        it('should allow filtering out values', async function() {
          await inspector.filterOutTableCell(1, 1);
          await inspector.expectTableData([
            ['win xp', '2,858', '13,073,190,186.423'],
            ['win 7', '2,814', '13,186,695,551.251'],
            ['Other', '4,106', '13,080,420,659.354'],
          ]);
        });

        it('should allow filtering for other values', async function() {
          await inspector.filterForTableCell(1, 3);
          await inspector.expectTableData([
            ['win 7', '2,814', '13,186,695,551.251'],
            ['ios', '2,784', '13,009,497,206.823'],
            ['Other', '1,322', '13,228,964,670.613'],
          ]);
        });

        it('should allow filtering out other values', async function() {
          await inspector.filterOutTableCell(1, 3);
          await inspector.expectTableData([
            ['win 8', '2,904', '13,031,579,645.108'],
            ['win xp', '2,858', '13,073,190,186.423'],
          ]);
        });
      });
    });
  });
}
