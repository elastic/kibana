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
  const PageObjects = getPageObjects(['common', 'visualize', 'header', 'pointSeries']);
  const pointSeriesVis = PageObjects.pointSeries;

  describe('point series', function describeIndexTests() {
    before(function () {
      const fromTime = '2015-09-19 06:31:44.000';
      const toTime = '2015-09-23 18:31:44.000';

      log.debug('navigateToApp visualize');
      return PageObjects.common.navigateToUrl('visualize', 'new')
        .then(function () {
          log.debug('clickLineChart');
          return PageObjects.visualize.clickLineChart();
        })
        .then(function clickNewSearch() {
          return PageObjects.visualize.clickNewSearch();
        })
        .then(function setAbsoluteRange() {
          log.debug('Set absolute time range from \"' + fromTime + '\" to \"' + toTime + '\"');
          return PageObjects.header.setAbsoluteRange(fromTime, toTime);
        })
        .then(function clickBucket() {
          log.debug('Bucket = X-Axis');
          return PageObjects.visualize.clickBucket('X-Axis');
        })
        .then(function selectAggregation() {
          log.debug('Aggregation = Date Histogram');
          return PageObjects.visualize.selectAggregation('Date Histogram');
        })
        .then(function selectField() {
          log.debug('Field = @timestamp');
          return PageObjects.visualize.selectField('@timestamp');
        })
      // add another metrics
        .then(function clickAddMetrics() {
          log.debug('Add Metric');
          return PageObjects.visualize.clickAddMetric();
        })
        .then(function () {
          log.debug('Metric = Value Axis');
          return PageObjects.visualize.clickBucket('Y-Axis');
        })
        .then(function selectAggregation() {
          log.debug('Aggregation = Average');
          return PageObjects.visualize.selectAggregation('Average', 'metrics');
        })
        .then(function selectField() {
          log.debug('Field = memory');
          return PageObjects.visualize.selectField('machine.ram', 'metrics');
        })
      // go to options page
        .then(function gotoAxisOptions() {
          log.debug('Going to axis options');
          return pointSeriesVis.clickAxisOptions();
        })
      // add another value axis
        .then(function addAxis() {
          log.debug('adding axis');
          return pointSeriesVis.clickAddAxis();
        })
      // set average count to use second value axis
        .then(function setAxis() {
          return pointSeriesVis.toggleCollapsibleTitle('Average machine.ram')
            .then(function () {
              log.debug('Average memory value axis - ValueAxis-2');
              return pointSeriesVis.setSeriesAxis(1, 'ValueAxis-2');
            });
        })
        .then(function clickGo() {
          return PageObjects.visualize.clickGo();
        })
        .then(function () {
          return PageObjects.header.awaitGlobalLoadingIndicatorHidden();
        });
    });

    describe('secondary value axis', function () {

      it('should show correct chart, take screenshot', async function () {
        const expectedChartValues = [
          [ 37, 202, 740, 1437, 1371, 751, 188, 31, 42, 202, 683,
            1361, 1415, 707, 177, 27, 32, 175, 707, 1408, 1355, 726, 201, 29 ],
          [ 14018300000, 13284800000, 13198800000, 13093400000, 13067800000,
            12976600000, 13561800000, 14339600000, 14011000000, 12775300000,
            13304500000, 12988900000, 13143500000, 13244400000, 12154800000,
            15907300000, 13757300000, 13022200000, 12807300000, 13375700000,
            13190800000, 12627500000, 12731500000, 13153300000 ],
        ];

        await retry.try(async () => {
          const data = await PageObjects.visualize.getLineChartData('Count');
          log.debug('count data=' + data);
          log.debug('data.length=' + data.length);
          expect(data).to.eql(expectedChartValues[0]);

          const avgMemoryData = await PageObjects.visualize.getLineChartData('Average machine.ram', 'ValueAxis-2');
          log.debug('average memory data=' + avgMemoryData);
          log.debug('data.length=' + avgMemoryData.length);
          expect(avgMemoryData).to.eql(expectedChartValues[1]);
        });
      });

      it('should put secondary axis on the right', function () {
        pointSeriesVis.getRightValueAxes().then(length => {
          expect(length).to.be(1);
        });
      });
    });

    describe('multiple chart types', function () {
      it('should change average series type to histogram', function () {
        return pointSeriesVis.toggleCollapsibleTitle('RightAxis-1')
          .then(function () {
            return pointSeriesVis.setSeriesType(1, 'bar');
          })
          .then(function () {
            return PageObjects.visualize.clickGo();
          })
          .then(function checkSeriesTypes() {
            pointSeriesVis.getHistogramSeries().then(length => {
              expect(length).to.be(1);
            });
          });
      });
    });

    describe('grid lines', function () {
      before(function () {
        return pointSeriesVis.clickOptions();
      });

      it('should show category grid lines', function () {
        return pointSeriesVis.toggleGridCategoryLines()
          .then(function () {
            return PageObjects.visualize.clickGo();
          })
          .then(function () {
            return pointSeriesVis.getGridLines();
          })
          .then(function checkGridLines(gridLines) {
            expect(gridLines.length).to.be(9);
            gridLines.forEach(gridLine => {
              expect(gridLine.y).to.be(0);
            });

          });
      });

      it('should show value axis grid lines', function () {
        return pointSeriesVis.setGridValueAxis('ValueAxis-2')
          .then(function () {
            return pointSeriesVis.toggleGridCategoryLines();
          })
          .then(function () {
            return PageObjects.visualize.clickGo();
          })
          .then(function () {
            return pointSeriesVis.getGridLines();
          })
          .then(function checkGridLines(gridLines) {
            expect(gridLines.length).to.be(9);
            gridLines.forEach(gridLine => {
              expect(gridLine.x).to.be(0);
            });
          });
      });
    });

  });
}
