define(function (require) {
  var angular = require('angular');
  var _ = require('lodash');

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

  var seriesData2 = {
    'label': '',
    'series': [
      {
        'label': '100',
        'values': [{x: 0, y: 1}, {x: 1, y: 2}, {x: 2, y: 3}]
      },
      {
        'label': '200',
        'values': [{x: 0, y: 1}, {x: 1, y: 2}, {x: 2, y: 3}]
      }
    ]
  };

  var rowsData2 = {
    'rows': [
      {
        'label': 'a',
        'series': [
          {
            'label': '100',
            'values': [{x: 0, y: 1}, {x: 1, y: 2}, {x: 2, y: 3}]
          },
          {
            'label': '200',
            'values': [{x: 0, y: 1}, {x: 1, y: 2}, {x: 2, y: 3}]
          }
        ]
      },
      {
        'label': 'b',
        'series': [
          {
            'label': '100',
            'values': [{x: 0, y: 1}, {x: 1, y: 2}, {x: 2, y: 3}]
          },
          {
            'label': '200',
            'values': [{x: 0, y: 1}, {x: 1, y: 2}, {x: 2, y: 3}]
          }
        ]
      }
    ]
  };

  var colsData2 = {
    'columns': [
      {
        'label': 'a',
        'series': [
          {
            'label': '100',
            'values': [{x: 0, y: 1}, {x: 1, y: 2}, {x: 2, y: 3}]
          },
          {
            'label': '200',
            'values': [{x: 0, y: 1}, {x: 1, y: 2}, {x: 2, y: 3}]
          }
        ]
      },
      {
        'label': 'b',
        'series': [
          {
            'label': '100',
            'values': [{x: 0, y: 1}, {x: 1, y: 2}, {x: 2, y: 3}]
          },
          {
            'label': '200',
            'values': [{x: 0, y: 1}, {x: 1, y: 2}, {x: 2, y: 3}]
          }
        ]
      }
    ]
  };

  var flattenedData = [
    [{x: 0, y: 0}, {x: 1, y: 2}, {x: 2, y: 4}, {x: 3, y: 6}, {x: 4, y: 8}],
    [{x: 0, y: 0}, {x: 1, y: 2}, {x: 2, y: 4}, {x: 3, y: 6}, {x: 4, y: 8}],
    [{x: 0, y: 0}, {x: 1, y: 2}, {x: 2, y: 4}, {x: 3, y: 6}, {x: 4, y: 8}]
  ];

  angular.module('DataFactory', ['kibana']);

  describe('Vislib Data Class Test Suite', function () {

    describe('Data Class (main)', function () {
      var DataFactory;
      var rowIn;

      beforeEach(function () {
        module('DataFactory');
      });

      beforeEach(function () {
        inject(function (d3, Private) {
          DataFactory = Private(require('components/vislib/lib/data'));
        });
        rowIn = new DataFactory(rowsData, {});
      });

      it('should be a function', function () {
        expect(_.isFunction(DataFactory)).to.be(true);
      });

      it('should return an object', function () {
        expect(_.isObject(rowIn)).to.be(true);
      });

    });

    describe('_removeZeroSlices', function () {
      var pieData = {
        slices: {
          children: [
            {size: 30},
            {size: 20},
            {size: 0}
          ]
        }
      };
      var DataFactory;
      var data;
      var slices;

      beforeEach(function () {
        module('DataFactory');
      });

      beforeEach(function () {
        inject(function (Private) {
          DataFactory = Private(require('components/vislib/lib/data'));
          data = new DataFactory(pieData, {});
          slices = data._removeZeroSlices(pieData.slices);
        });
      });

      it('should remove zero values', function () {
        expect(slices.children.length).to.be(2);
      });
    });

    describe('Data.flatten', function () {
      var DataFactory;
      var serIn;
      var rowIn;
      var colIn;
      var serOut;
      var rowOut;
      var colOut;

      beforeEach(function () {
        module('DataFactory');
      });

      beforeEach(function () {
        inject(function (d3, Private) {
          DataFactory = Private(require('components/vislib/lib/data'));
        });
        serIn = new DataFactory(seriesData, {});
        rowIn = new DataFactory(rowsData, {});
        colIn = new DataFactory(colsData, {});
        serOut = serIn.flatten();
        rowOut = rowIn.flatten();
        colOut = colIn.flatten();
      });

      it('should return an array of value objects from every series', function () {
        expect(serOut.every(_.isObject)).to.be(true);
      });

      function testLength(inputData) {
        return function () {
          var data = new DataFactory(inputData, {});
          var len = _.reduce(data.chartData(), function (sum, chart) {
            return sum + chart.series.reduce(function (sum, series) {
              return sum + series.values.length;
            }, 0);
          }, 0);

          expect(data.flatten()).to.have.length(len);
        };
      }

      it('should return all points from every series', testLength(seriesData));
      it('should return all points from every series', testLength(rowsData));
      it('should return all points from every series', testLength(colsData));
    });

    describe('getYMin method', function () {
      var Data;
      var dataSeries;
      var stackedDataSeries;
      var visData;
      var stackedVisData;
      var series;
      var stackedSeries;
      var minValue;
      var stackedMinValue;

      beforeEach(function () {
        module('DataFactory');
      });

      beforeEach(function () {
        inject(function (d3, Private) {
          Data = Private(require('components/vislib/lib/data'));
          dataSeries = require('vislib_fixtures/mock_data/date_histogram/_series');
          stackedDataSeries = require('vislib_fixtures/mock_data/stacked/_stacked');
          visData = new Data(dataSeries, {});
          stackedVisData = new Data(stackedDataSeries, { type: 'histogram' });
          series = _.pluck(visData.chartData(), 'series');
          stackedSeries = _.pluck(stackedVisData.chartData(), 'series');
          minValue = 4;
          stackedMinValue = 15;
        });
      });

      // The first value in the time series is less than the min date in the
      // date range. It also has the largest y value. This value should be excluded
      // when calculating the Y max value since it falls outside of the range.
      it('should return the Y domain min value', function () {
        expect(visData.getYMin()).to.be(minValue);
        expect(stackedVisData.getYMin()).to.be(stackedMinValue);
      });

      it('should have a minimum date value that is greater than the max value within the date range', function () {
        expect(_.min(series.values, function (d) { return d.x; })).to.be.greaterThan(minValue);
        expect(_.min(stackedSeries.values, function (d) { return d.x; })).to.be.greaterThan(stackedMinValue);
      });

      it('allows passing a value getter for manipulating the values considered', function () {
        var realMin = visData.getYMin();
        var multiplier = 13.2;
        expect(visData.getYMin(function (d) { return d.y * multiplier; })).to.be(realMin * multiplier);
      });
    });

    describe('getYMax method', function () {
      var Data;
      var dataSeries;
      var stackedDataSeries;
      var visData;
      var stackedVisData;
      var series;
      var stackedSeries;
      var maxValue;
      var stackedMaxValue;

      beforeEach(function () {
        module('DataFactory');
      });

      beforeEach(function () {
        inject(function (d3, Private) {
          Data = Private(require('components/vislib/lib/data'));
          dataSeries = require('vislib_fixtures/mock_data/date_histogram/_series');
          stackedDataSeries = require('vislib_fixtures/mock_data/stacked/_stacked');
          visData = new Data(dataSeries, {});
          stackedVisData = new Data(stackedDataSeries, { type: 'histogram' });
          series = _.pluck(visData.chartData(), 'series');
          stackedSeries = _.pluck(stackedVisData.chartData(), 'series');
          maxValue = 41;
          stackedMaxValue = 115;
        });
      });

      // The first value in the time series is less than the min date in the
      // date range. It also has the largest y value. This value should be excluded
      // when calculating the Y max value since it falls outside of the range.
      it('should return the Y domain min value', function () {
        expect(visData.getYMax()).to.be(maxValue);
        expect(stackedVisData.getYMax()).to.be(stackedMaxValue);
      });

      it('should have a minimum date value that is greater than the max value within the date range', function () {
        expect(_.min(series, function (d) { return d.x; })).to.be.greaterThan(maxValue);
        expect(_.min(stackedSeries, function (d) { return d.x; })).to.be.greaterThan(stackedMaxValue);
      });

      it('allows passing a value getter for manipulating the values considered', function () {
        var realMax = visData.getYMax();
        var multiplier = 13.2;
        expect(visData.getYMax(function (d) { return d.y * multiplier; })).to.be(realMax * multiplier);
      });
    });

  });
});
