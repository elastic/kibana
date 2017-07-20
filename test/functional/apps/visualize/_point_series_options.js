import expect from 'expect.js';

export default function ({ getService, getPageObjects }) {
  const log = getService('log');
  const screenshots = getService('screenshots');
  const PageObjects = getPageObjects(['common', 'visualize', 'header', 'pointSeries']);
  const pointSeriesVis = PageObjects.pointSeries;


  describe('visualize app', function describeIndexTests() {
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
        return PageObjects.visualize.selectAggregation('Average');
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
        return PageObjects.header.isGlobalLoadingIndicatorHidden();
      });
    });

    describe('secondary value axis', function () {

      it('should show correct chart, take screenshot', function () {
        const expectedChartValues = [
          [ 37, 202, 740, 1437, 1371, 751, 188, 31, 42, 202, 683,
            1361, 1415, 707, 177, 27, 32, 175, 707, 1408, 1355, 726, 201, 29 ],
          [ 14018296036, 13284815935, 13198764883, 13093365683, 13067752146, 12976598848,
            13561826081, 14339648875, 14011021362, 12775336396, 13304506791, 12988890398,
            13143466970, 13244378772, 12154757448, 15907286281, 13757317120, 13022240959,
            12807319386, 13375732998, 13190755620, 12627508458, 12731510199, 13153337344  ],
        ];

        // Most recent failure on Jenkins usually indicates the bar chart is still being drawn?
        // return arguments[0].getAttribute(arguments[1]);","args":[{"ELEMENT":"592"},"fill"]}] arguments[0].getAttribute is not a function
        // try sleeping a bit before getting that data
        return PageObjects.common.sleep(2000)
          .then(function () {
            return PageObjects.visualize.getLineChartData('fill="#6eadc1"');
          })
          .then(function showData(data) {
            log.debug('count data=' + data);
            log.debug('data.length=' + data.length);
            screenshots.take('Visualize-secondary-value-axis');
            expect(data).to.eql(expectedChartValues[0]);
          })
          .then(function () {
            return PageObjects.visualize.getLineChartData('fill="#57c17b"', 'ValueAxis-2');
          })
          .then(function showData(data) {
            log.debug('average memory data=' + data);
            log.debug('data.length=' + data.length);
            expect(data).to.eql(expectedChartValues[1]);
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
          .then(function () {
            return PageObjects.common.sleep(2000);
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
            return PageObjects.common.sleep(2000);
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
            return PageObjects.common.sleep(5000);
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
