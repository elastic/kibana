define(function (require) {
  var angular = require('angular');
  var _ = require('lodash');

  var Data;
  var dataSeries = require('vislib_fixtures/mock_data/date_histogram/_series');
  var dataSeriesNeg = require('vislib_fixtures/mock_data/date_histogram/_series_neg');
  var dataStacked = require('vislib_fixtures/mock_data/stacked/_stacked');

  var seriesData = {
    'label': '',
    'series': [
      {
        'label': '100',
        'values': [{x: 0, y: 1}, {x: 1, y: 2}, {x: 2, y: 3}]
      }
    ]
  };

  var rowsData = {
    'rows': [
      {
        'label': 'a',
        'series': [
          {
            'label': '100',
            'values': [{x: 0, y: 1}, {x: 1, y: 2}, {x: 2, y: 3}]
          }
        ]
      },
      {
        'label': 'b',
        'series': [
          {
            'label': '300',
            'values': [{x: 0, y: 1}, {x: 1, y: 2}, {x: 2, y: 3}]
          }
        ]
      },
      {
        'label': 'c',
        'series': [
          {
            'label': '100',
            'values': [{x: 0, y: 1}, {x: 1, y: 2}, {x: 2, y: 3}]
          }
        ]
      },
      {
        'label': 'd',
        'series': [
          {
            'label': '200',
            'values': [{x: 0, y: 1}, {x: 1, y: 2}, {x: 2, y: 3}]
          }
        ]
      }
    ]
  };

  var colsData = {
    'columns': [
      {
        'label': 'a',
        'series': [
          {
            'label': '100',
            'values': [{x: 0, y: 1}, {x: 1, y: 2}, {x: 2, y: 3}]
          }
        ]
      },
      {
        'label': 'b',
        'series': [
          {
            'label': '300',
            'values': [{x: 0, y: 1}, {x: 1, y: 2}, {x: 2, y: 3}]
          }
        ]
      },
      {
        'label': 'c',
        'series': [
          {
            'label': '100',
            'values': [{x: 0, y: 1}, {x: 1, y: 2}, {x: 2, y: 3}]
          }
        ]
      },
      {
        'label': 'd',
        'series': [
          {
            'label': '200',
            'values': [{x: 0, y: 1}, {x: 1, y: 2}, {x: 2, y: 3}]
          }
        ]
      }
    ]
  };

  angular.module('DataFactory', ['kibana']);

  describe('Vislib Data Class Test Suite', function () {

    beforeEach(function () {
      module('DataFactory');

      inject(function (Private) {
        Data = Private(require('components/vislib/lib/data'));
      });
    });

    describe('Data Class (main)', function () {
      it('should be a function', function () {
        expect(_.isFunction(Data)).to.be(true);
      });

      it('should return an object', function () {
        var rowIn = new Data(rowsData, {});
        expect(_.isObject(rowIn)).to.be(true);
      });

      it('should update label in series data', function () {
        var seriesDataWithoutLabelInSeries = {
          'label': '',
          'series': [
            {
              'label': '',
              'values': [{x: 0, y: 1}, {x: 1, y: 2}, {x: 2, y: 3}]
            }
          ],
          'yAxisLabel': 'customLabel'
        };
        var modifiedData = new Data(seriesDataWithoutLabelInSeries, {});
        expect(modifiedData.data.series[0].label).to.be('customLabel');
      });

      it('should update label in row data', function () {
        var seriesDataWithoutLabelInRow = {
          'rows': [
            {
              'label': '',
              'series': [
                {
                  'label': '',
                  'values': [{x: 0, y: 1}, {x: 1, y: 2}, {x: 2, y: 3}]
                }
              ],
              'yAxisLabel': 'customLabel'
            },
            {
              'label': '',
              'series': [
                {
                  'label': '',
                  'values': [{x: 0, y: 1}, {x: 1, y: 2}, {x: 2, y: 3}]
                }
              ],
              'yAxisLabel': 'customLabel'
            }
          ],
        };

        var modifiedData = new Data(seriesDataWithoutLabelInRow, {});
        expect(modifiedData.data.rows[0].series[0].label).to.be('customLabel');
        expect(modifiedData.data.rows[1].series[0].label).to.be('customLabel');
      });

      it('should update label in column data', function () {
        var seriesDataWithoutLabelInRow = {
          'columns': [
            {
              'label': '',
              'series': [
                {
                  'label': '',
                  'values': [{x: 0, y: 1}, {x: 1, y: 2}, {x: 2, y: 3}]
                }
              ],
              'yAxisLabel': 'customLabel'
            },
            {
              'label': '',
              'series': [
                {
                  'label': '',
                  'values': [{x: 0, y: 1}, {x: 1, y: 2}, {x: 2, y: 3}]
                }
              ],
              'yAxisLabel': 'customLabel'
            }
          ],
          'yAxisLabel': 'customLabel'
        };

        var modifiedData = new Data(seriesDataWithoutLabelInRow, {});
        expect(modifiedData.data.columns[0].series[0].label).to.be('customLabel');
        expect(modifiedData.data.columns[1].series[0].label).to.be('customLabel');
      });
    });


    describe('_removeZeroSlices', function () {
      var data;
      var pieData = {
        slices: {
          children: [
            {size: 30},
            {size: 20},
            {size: 0}
          ]
        }
      };

      beforeEach(function () {
        data = new Data(pieData, {});
        data._removeZeroSlices(pieData.slices);
      });

      it('should remove zero values', function () {
        var slices = data.data.slices;
        expect(slices.children.length).to.be(2);
      });
    });

    describe('Data.flatten', function () {
      var serIn;
      var rowIn;
      var colIn;
      var serOut;
      var rowOut;
      var colOut;

      beforeEach(function () {
        serIn = new Data(seriesData, {});
        rowIn = new Data(rowsData, {});
        colIn = new Data(colsData, {});
        serOut = serIn.flatten();
        rowOut = rowIn.flatten();
        colOut = colIn.flatten();
      });

      it('should return an array of value objects from every series', function () {
        expect(serOut.every(_.isObject)).to.be(true);
      });

      it('should return all points from every series', testLength(seriesData));
      it('should return all points from every series', testLength(rowsData));
      it('should return all points from every series', testLength(colsData));

      function testLength(inputData) {
        return function () {
          var data = new Data(inputData, {});
          var len = _.reduce(data.chartData(), function (sum, chart) {
            return sum + chart.series.reduce(function (sum, series) {
              return sum + series.values.length;
            }, 0);
          }, 0);

          expect(data.flatten()).to.have.length(len);
        };
      }
    });

    describe('getYMin method', function () {
      var visData;
      var visDataNeg;
      var visDataStacked;
      var minValue = 4;
      var minValueNeg = -41;
      var minValueStacked = 15;

      beforeEach(function () {
        visData = new Data(dataSeries, {});
        visDataNeg = new Data(dataSeriesNeg, {});
        visDataStacked = new Data(dataStacked, { type: 'histogram' });
      });

      // The first value in the time series is less than the min date in the
      // date range. It also has the largest y value. This value should be excluded
      // when calculating the Y max value since it falls outside of the range.
      it('should return the Y domain min value', function () {
        expect(visData.getYMin()).to.be(minValue);
        expect(visDataNeg.getYMin()).to.be(minValueNeg);
        expect(visDataStacked.getYMin()).to.be(minValueStacked);
      });

      it('should have a minimum date value that is greater than the max value within the date range', function () {
        var series = _.pluck(visData.chartData(), 'series');
        var stackedSeries = _.pluck(visDataStacked.chartData(), 'series');
        expect(_.min(series.values, function (d) { return d.x; })).to.be.greaterThan(minValue);
        expect(_.min(stackedSeries.values, function (d) { return d.x; })).to.be.greaterThan(minValueStacked);
      });

      it('allows passing a value getter for manipulating the values considered', function () {
        var realMin = visData.getYMin();
        var multiplier = 13.2;
        expect(visData.getYMin(function (d) { return d.y * multiplier; })).to.be(realMin * multiplier);
      });
    });

    describe('getYMax method', function () {
      var visData;
      var visDataNeg;
      var visDataStacked;
      var maxValue = 41;
      var maxValueNeg = -4;
      var maxValueStacked = 115;

      beforeEach(function () {
        visData = new Data(dataSeries, {});
        visDataNeg = new Data(dataSeriesNeg, {});
        visDataStacked = new Data(dataStacked, { type: 'histogram' });
      });

      // The first value in the time series is less than the min date in the
      // date range. It also has the largest y value. This value should be excluded
      // when calculating the Y max value since it falls outside of the range.
      it('should return the Y domain min value', function () {
        expect(visData.getYMax()).to.be(maxValue);
        expect(visDataNeg.getYMax()).to.be(maxValueNeg);
        expect(visDataStacked.getYMax()).to.be(maxValueStacked);
      });

      it('should have a minimum date value that is greater than the max value within the date range', function () {
        var series = _.pluck(visData.chartData(), 'series');
        var stackedSeries = _.pluck(visDataStacked.chartData(), 'series');
        expect(_.min(series, function (d) { return d.x; })).to.be.greaterThan(maxValue);
        expect(_.min(stackedSeries, function (d) { return d.x; })).to.be.greaterThan(maxValueStacked);
      });

      it('allows passing a value getter for manipulating the values considered', function () {
        var realMax = visData.getYMax();
        var multiplier = 13.2;
        expect(visData.getYMax(function (d) { return d.y * multiplier; })).to.be(realMax * multiplier);
      });
    });

  });
});
