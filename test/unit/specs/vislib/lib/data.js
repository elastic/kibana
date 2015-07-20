define(function (require) {
  var angular = require('angular');
  var _ = require('lodash');

  var Data;
  var SingleYAxisStrategy;
  var DualYAxisStrategy;
  var dataSeries = require('vislib_fixtures/mock_data/date_histogram/_series');
  var dualAxisDataSeries = require('vislib_fixtures/mock_data/date_histogram/_dual_axis_series');
  var dataSeriesNeg = require('vislib_fixtures/mock_data/date_histogram/_series_neg');
  var dualAxisDataSeriesNeg = require('vislib_fixtures/mock_data/date_histogram/_dual_axis_series_neg');
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

  var seriesDataWithDualAxis = {
    'label': '',
    'series': [
      {
        'label': '100',
        'values': [{x: 0, y: 1}, {x: 1, y: 2}, {x: 2, y: 3}],
        'onSecondaryYAxis': false
      },
      {
        'label': '1001',
        'values': [{x: 0, y: 1}, {x: 1, y: 2}, {x: 2, y: 3}],
        'onSecondaryYAxis': true
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
        SingleYAxisStrategy = Private(require('components/vislib/lib/_single_y_axis_strategy'));
        DualYAxisStrategy = Private(require('components/vislib/lib/_dual_y_axis_strategy'));
        Data = Private(require('components/vislib/lib/data'));
      });
    });

    describe('Data Class (main)', function () {
      it('should be a function', function () {
        expect(_.isFunction(Data)).to.be(true);
      });

      it('should return an object', function () {
        var rowIn = new Data(rowsData, {}, new SingleYAxisStrategy());
        expect(_.isObject(rowIn)).to.be(true);
      });

      it('should decorate the values with false if there is no secondary Axis', function () {
        var seriesDataWithoutLabelInSeries = {
          'label': '',
          'series': [
            {
              'label': '',
              'values': [{x: 0, y: 1}, {x: 1, y: 2}, {x: 2, y: 3}]
            },
            {
              'values': [{x:10, y:11}, {x:11, y:12}, {x:12, y:13}]
            }
          ],
          'yAxisLabel': 'customLabel'
        };
        var modifiedData = new Data(seriesDataWithoutLabelInSeries, {}, new SingleYAxisStrategy());
        _.map(modifiedData.data.series[0].values, function (value) {
          expect(value.belongsToSecondaryYAxis).to.be(false);
        });
        _.map(modifiedData.data.series[1].values, function (value) {
          expect(value.belongsToSecondaryYAxis).to.be(false);
        });
      });

      it('should decorate the values if it belongs to secondary Axis', function () {
        var seriesDataWithoutLabelInSeries = {
          'label': '',
          'series': [
            {
              'label': '',
              'onSecondaryYAxis': true,
              'values': [{x: 0, y: 1}, {x: 1, y: 2}, {x: 2, y: 3}]
            },
            {
              'onSecondaryYAxis': false,
              'values': [{x:10, y:11}, {x:11, y:12}, {x:12, y:13}]
            }
          ],
          'yAxisLabel': 'customLabel'
        };
        var modifiedData = new Data(seriesDataWithoutLabelInSeries, {}, new DualYAxisStrategy());
        _.map(modifiedData.data.series[0].values, function (value) {
          expect(value.belongsToSecondaryYAxis).to.be(true);
        });
        _.map(modifiedData.data.series[1].values, function (value) {
          expect(value.belongsToSecondaryYAxis).to.be(false);
        });
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
        data = new Data(pieData, {}, new SingleYAxisStrategy());
        data._removeZeroSlices(pieData.slices);
      });

      it('should remove zero values', function () {
        var slices = data.data.slices;
        expect(slices.children.length).to.be(2);
      });
    });

    describe('Data.flatten for single y axis', function () {
      var serIn;
      var rowIn;
      var colIn;
      var serOut;
      var rowOut;
      var colOut;

      beforeEach(function () {
        serIn = new Data(seriesData, {}, new SingleYAxisStrategy());
        rowIn = new Data(rowsData, {}, new SingleYAxisStrategy());
        colIn = new Data(colsData, {}, new SingleYAxisStrategy());
        serOut = serIn._flatten();
        rowOut = rowIn._flatten();
        colOut = colIn._flatten();
      });

      it('should return an array of value objects from every series', function () {
        expect(serOut.every(_.isObject)).to.be(true);
        expect(rowOut.every(_.isObject)).to.be(true);
        expect(colOut.every(_.isObject)).to.be(true);
      });

      it('should return all points from every series', testLength(seriesData));
      it('should return all points from every series', testLength(rowsData));
      it('should return all points from every series', testLength(colsData));

      function testLength(inputData) {
        return function () {
          var data = new Data(inputData, {}, new SingleYAxisStrategy());
          var len = _.reduce(data.chartData(), function (sum, chart) {
            return sum + chart.series.reduce(function (sum, series) {
              return sum + series.values.length;
            }, 0);
          }, 0);

          expect(data._flatten()).to.have.length(len);
        };
      }
    });

    describe('Data.flatten for dual y axis', function () {
      var serIn;
      var rowIn;
      var colIn;
      var serOutPrimary;
      var serOutSecondary;
      var rowOutPrimary;
      var rowOutSecondary;
      var colOutPrimary;
      var colOutSecondary;

      beforeEach(function () {
        serIn = new Data(seriesData, {}, new DualYAxisStrategy());
        rowIn = new Data(rowsData, {}, new DualYAxisStrategy());
        colIn = new Data(colsData, {}, new DualYAxisStrategy());
        serOutPrimary = serIn._flatten(true);
        serOutSecondary = serIn._flatten(false);
        rowOutPrimary = rowIn._flatten(true);
        rowOutSecondary = rowIn._flatten(false);
        colOutPrimary = colIn._flatten(true);
        colOutSecondary = colIn._flatten(false);
      });

      it('should return an array of value objects from every series', function () {
        expect(serOutPrimary.every(_.isObject)).to.be(true);
        expect(serOutSecondary.every(_.isObject)).to.be(true);
        expect(rowOutPrimary.every(_.isObject)).to.be(true);
        expect(rowOutSecondary.every(_.isObject)).to.be(true);
        expect(colOutPrimary.every(_.isObject)).to.be(true);
        expect(colOutSecondary.every(_.isObject)).to.be(true);
      });

      it('should return all points for specific graph in the series', function () {
        var data = new Data(seriesDataWithDualAxis, {}, new DualYAxisStrategy());
        var primaryChartLength = data.chartData()[0].series[0].values.length;
        var secondaryChartLength = data.chartData()[0].series[1].values.length;

        expect(data._flatten(true)).to.have.length(primaryChartLength);
        expect(data._flatten(false)).to.have.length(secondaryChartLength);
      });
    });

    describe('getYMin method', function () {
      var visData;
      var visDataNeg;
      var visDataStacked;
      var minValue = 4;
      var minValueNeg = -41;
      var minValueStacked = 15;

      beforeEach(function () {
        visData = new Data(dataSeries, {}, new SingleYAxisStrategy());
        visDataNeg = new Data(dataSeriesNeg, {}, new SingleYAxisStrategy());
        visDataStacked = new Data(dataStacked, { type: 'histogram' }, new SingleYAxisStrategy());
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

    describe('getSecondYMin method', function () {
      var visData;
      var visDataNeg;
      var visDataStacked;
      var minValue = 4;
      var secondMinValue = 400;
      var minValueNeg = -41;
      var secondMinValueNeg = -4100;

      beforeEach(function () {
        visData = new Data(dualAxisDataSeries, {}, new DualYAxisStrategy());
        visDataNeg = new Data(dualAxisDataSeriesNeg, {}, new DualYAxisStrategy());
      });

      // The first value in the time series is less than the min date in the
      // date range. It also has the largest y value. This value should be excluded
      // when calculating the Y max value since it falls outside of the range.
      it('should return the Y domain min values', function () {
        expect(visData.getYMin()).to.be(minValue);
        expect(visData.getSecondYMin()).to.be(secondMinValue);
        expect(visDataNeg.getYMin()).to.be(minValueNeg);
        expect(visDataNeg.getSecondYMin()).to.be(secondMinValueNeg);
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
        visData = new Data(dataSeries, {}, new SingleYAxisStrategy());
        visDataNeg = new Data(dataSeriesNeg, {}, new SingleYAxisStrategy());
        visDataStacked = new Data(dataStacked, { type: 'histogram' }, new SingleYAxisStrategy());
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

    describe('getSecondYMax method', function () {
      var visData;
      var visDataNeg;
      var visDataStacked;
      var maxValue = 41;
      var secondMaxValue = 4100;
      var maxValueNeg = -4;
      var secondMaxValueNeg = -400;
      var maxValueStacked = 115;

      beforeEach(function () {
        visData = new Data(dualAxisDataSeries, {}, new DualYAxisStrategy());
        visDataNeg = new Data(dualAxisDataSeriesNeg, {}, new DualYAxisStrategy());
      });

      // The first value in the time series is less than the min date in the
      // date range. It also has the largest y value. This value should be excluded
      // when calculating the Y max value since it falls outside of the range.
      it('should return the Y domain min values', function () {
        expect(visData.getYMax()).to.be(maxValue);
        expect(visData.getSecondYMax()).to.be(secondMaxValue);
        expect(visDataNeg.getYMax()).to.be(maxValueNeg);
        expect(visDataNeg.getSecondYMax()).to.be(secondMaxValueNeg);
      });

    });

  });
});
