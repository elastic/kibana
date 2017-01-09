import expect from 'expect.js';

import {
  bdd,
} from '../../../support';

import PageObjects from '../../../support/page_objects';

bdd.describe('visualize app', function describeIndexTests() {
  bdd.before(function () {
    const fromTime = '2015-09-19 06:31:44.000';
    const toTime = '2015-09-23 18:31:44.000';

    PageObjects.common.debug('navigateToApp visualize');
    return PageObjects.common.navigateToApp('visualize')
    .then(function () {
      PageObjects.common.debug('clickLineChart');
      return PageObjects.visualize.clickLineChart();
    })
    .then(function clickNewSearch() {
      return PageObjects.visualize.clickNewSearch();
    })
    .then(function setAbsoluteRange() {
      PageObjects.common.debug('Set absolute time range from \"' + fromTime + '\" to \"' + toTime + '\"');
      return PageObjects.header.setAbsoluteRange(fromTime, toTime);
    })
    .then(function clickBucket() {
      PageObjects.common.debug('Bucket = Split Chart');
      return PageObjects.visualize.clickBucket(PageObjects.visualize.xAxisBucket);
    })
    .then(function selectAggregation() {
      PageObjects.common.debug('Aggregation = Date Histogram');
      return PageObjects.visualize.selectAggregation('Date Histogram');
    })
    .then(function selectField() {
      PageObjects.common.debug('Field = @timestamp');
      return PageObjects.visualize.selectField('@timestamp');
    })
    // add another metrics
    .then(function clickAddMetrics() {
      PageObjects.common.debug('Add Metric');
      return PageObjects.visualize.clickAddMetric();
    })
    .then(function () {
      PageObjects.common.debug('Metric = Value Axis');
      return PageObjects.visualize.clickBucket(PageObjects.visualize.yAxisBucket);
    })
    .then(function selectAggregation() {
      PageObjects.common.debug('Aggregation = Average');
      return PageObjects.visualize.selectAggregation('Average');
    })
    .then(function selectField() {
      PageObjects.common.debug('Field = memory');
      return PageObjects.visualize.selectField('machine.ram', 'metrics');
    })
    // go to options page
    .then(function gotoOptions() {
      PageObjects.common.debug('Going to options');
      return PageObjects.visualizeOptions.clickOptions();
    })
    // add another value axis
    .then(function addAxis() {
      PageObjects.common.debug('adding axis');
      return PageObjects.visualizeOptions.clickAddAxis();
    })
    // set average count to use second value axis
    .then(function setAxis() {
      return PageObjects.visualizeOptions.toggleCollapsibleTitle('Average machine.ram')
        .then(function () {
          PageObjects.common.debug('Average memory value axis - ValueAxis-2');
          return PageObjects.visualizeOptions.setSeriesAxis(1, 'ValueAxis-2');
        });
    })
    .then(function clickGo() {
      return PageObjects.visualize.clickGo();
    })
    .then(function () {
      return PageObjects.header.isGlobalLoadingIndicatorHidden();
    });
  });

  bdd.describe('secondary value axis', function () {

    bdd.it('should show correct chart, take screenshot', function () {
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
          PageObjects.common.debug('count data=' + data);
          PageObjects.common.debug('data.length=' + data.length);
          PageObjects.common.saveScreenshot('Visualize-secondary-value-axis');
          expect(data).to.eql(expectedChartValues[0]);
        })
        .then(function () {
          return PageObjects.visualize.getLineChartData('fill="#57c17b"', 'ValueAxis-2');
        })
        .then(function showData(data) {
          PageObjects.common.debug('average memory data=' + data);
          PageObjects.common.debug('data.length=' + data.length);
          expect(data).to.eql(expectedChartValues[1]);
        });
    });

    bdd.it('should put secondary axis on the right', function () {
      return PageObjects.visualizeOptions.toggleCollapsibleTitle('ValueAxis-2')
        .then(function () {
          return PageObjects.visualizeOptions.setValueAxisPosition(1, 'right');
        })
        .then(function () {
          return PageObjects.visualize.clickGo();
        })
        .then(function () {
          return PageObjects.common.sleep(2000);
        })
        .then(function checkAxisPosition() {
          PageObjects.visualizeOptions.getRightValueAxes().then(length => {
            expect(length).to.be(1);
          });
        });
    });

  });

  bdd.describe('multiple chart types', function () {
    bdd.it('should change average series type to histogram', function () {
      return PageObjects.visualizeOptions.toggleCollapsibleTitle('ValueAxis-2')
        .then(function () {
          return PageObjects.visualizeOptions.setSeriesType(1, 'histogram');
        })
        .then(function () {
          return PageObjects.visualize.clickGo();
        })
        .then(function () {
          return PageObjects.common.sleep(2000);
        })
        .then(function checkSeriesTypes() {
          PageObjects.visualizeOptions.getHistogramSeries().then(length => {
            expect(length).to.be(1);
          });
        });
    });
  });

  bdd.describe('grid lines', function () {
    bdd.before(function () {
      return PageObjects.visualizeOptions.toggleCollapsibleTitle('Grid');
    });

    bdd.it('should show category grid lines', function () {
      return PageObjects.visualizeOptions.toggleGridCategoryLines()
        .then(function () {
          return PageObjects.visualize.clickGo();
        })
        .then(function () {
          return PageObjects.common.sleep(2000);
        })
        .then(function () {
          return PageObjects.visualizeOptions.getGridLines();
        })
        .then(function checkGridLines(gridLines) {
          expect(gridLines.length).to.be(9);
          gridLines.forEach(gridLine => {
            expect(gridLine.y).to.be(0);
          });

        });
    });

    bdd.it('should show value axis grid lines', function () {
      return PageObjects.visualizeOptions.setGridValueAxis('ValueAxis-2')
        .then(function () {
          return PageObjects.visualizeOptions.toggleGridCategoryLines();
        })
        .then(function () {
          return PageObjects.visualize.clickGo();
        })
        .then(function () {
          return PageObjects.common.sleep(5000);
        })
        .then(function () {
          return PageObjects.visualizeOptions.getGridLines();
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
