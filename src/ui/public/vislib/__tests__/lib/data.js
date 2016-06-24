import angular from 'angular';
import _ from 'lodash';
import ngMock from 'ng_mock';
import expect from 'expect.js';

import dataSeries from 'fixtures/vislib/mock_data/date_histogram/_series';
import dualAxisDataSeries from 'fixtures/vislib/mock_data/date_histogram/_dual_axis_series';
import dataSeriesNeg from 'fixtures/vislib/mock_data/date_histogram/_series_neg';
import dualAxisDataSeriesNeg from 'fixtures/vislib/mock_data/date_histogram/_dual_axis_series_neg';
import dataStacked from 'fixtures/vislib/mock_data/stacked/_stacked';
import VislibLibDataProvider from 'ui/vislib/lib/data';
import VislibLibDualYAxisStrategy from 'ui/vislib/lib/dual_y_axis_strategy';
import PersistedStatePersistedStateProvider from 'ui/persisted_state/persisted_state';

let seriesData = {
  'label': '',
  'series': [
    {
      'label': '100',
      'values': [{x: 0, y: 1}, {x: 1, y: 2}, {x: 2, y: 3}]
    }
  ]
};

let seriesDataWithDualAxis = {
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

let rowsData = {
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

let colsData = {
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

describe('Vislib Data Class Test Suite', function () {
  let Data;
  let persistedState;
  let DualYAxisStrategy;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    // single axis strategy is used by Data by default
    DualYAxisStrategy = Private(VislibLibDualYAxisStrategy);
    Data = Private(VislibLibDataProvider);
    persistedState = new (Private(PersistedStatePersistedStateProvider))();
  }));

  describe('Data Class (main)', function () {
    it('should be a function', function () {
      expect(_.isFunction(Data)).to.be(true);
    });

    it('should return an object', function () {
      let rowIn = new Data(rowsData, {}, persistedState);
      expect(_.isObject(rowIn)).to.be(true);
    });

    it('should decorate the values with false if there is no secondary Axis', function () {
      let seriesDataWithoutLabelInSeries = {
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
      let modifiedData = new Data(seriesDataWithoutLabelInSeries, {}, persistedState);
      _.map(modifiedData.data.series[0].values, function (value) {
        expect(value.belongsToSecondaryYAxis).to.be(false);
      });
      _.map(modifiedData.data.series[1].values, function (value) {
        expect(value.belongsToSecondaryYAxis).to.be(false);
      });
    });

    it('should decorate the values if it belongs to secondary Axis', function () {
      let modifiedData = new Data(seriesDataWithDualAxis, {}, persistedState, new DualYAxisStrategy());
      _.map(modifiedData.data.series[0].values, function (value) {
        expect(value.belongsToSecondaryYAxis).to.be(false);
      });
      _.map(modifiedData.data.series[1].values, function (value) {
        expect(value.belongsToSecondaryYAxis).to.be(true);
      });
    });

    it('should update label in series data', function () {
      let seriesDataWithoutLabelInSeries = {
        'label': '',
        'series': [
          {
            'label': '',
            'values': [{x: 0, y: 1}, {x: 1, y: 2}, {x: 2, y: 3}]
          }
        ],
        'yAxisLabel': 'customLabel'
      };
      let modifiedData = new Data(seriesDataWithoutLabelInSeries, {}, persistedState);
      expect(modifiedData.data.series[0].label).to.be('customLabel');
    });

    it('should update label in row data', function () {
      let seriesDataWithoutLabelInRow = {
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

      let modifiedData = new Data(seriesDataWithoutLabelInRow, {}, persistedState);
      expect(modifiedData.data.rows[0].series[0].label).to.be('customLabel');
      expect(modifiedData.data.rows[1].series[0].label).to.be('customLabel');
    });

    it('should update label in column data', function () {
      let seriesDataWithoutLabelInRow = {
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

      let modifiedData = new Data(seriesDataWithoutLabelInRow, {}, persistedState);
      expect(modifiedData.data.columns[0].series[0].label).to.be('customLabel');
      expect(modifiedData.data.columns[1].series[0].label).to.be('customLabel');
    });
  });


  describe('_removeZeroSlices', function () {
    let data;
    let pieData = {
      slices: {
        children: [
          {size: 30},
          {size: 20},
          {size: 0}
        ]
      }
    };

    beforeEach(function () {
      data = new Data(pieData, {}, persistedState);
    });

    it('should remove zero values', function () {
      let slices = data._removeZeroSlices(data.data.slices);
      expect(slices.children.length).to.be(2);
    });
  });

  describe('Data.flatten for single y axis', function () {
    let serIn;
    let rowIn;
    let colIn;
    let serOut;
    let rowOut;
    let colOut;

    beforeEach(function () {
      serIn = new Data(seriesData, {}, persistedState);
      rowIn = new Data(rowsData, {}, persistedState);
      colIn = new Data(colsData, {}, persistedState);
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
        let data = new Data(inputData, {}, persistedState);
        let len = _.reduce(data.chartData(), function (sum, chart) {
          return sum + chart.series.reduce(function (sum, series) {
            return sum + series.values.length;
          }, 0);
        }, 0);

        expect(data._flatten()).to.have.length(len);
      };
    }
  });

  describe('Data.flatten for dual y axis', function () {
    let serIn;
    let rowIn;
    let colIn;
    let serOutPrimary;
    let serOutSecondary;
    let rowOutPrimary;
    let rowOutSecondary;
    let colOutPrimary;
    let colOutSecondary;

    beforeEach(function () {
      serIn = new Data(seriesData, {}, persistedState, new DualYAxisStrategy());
      rowIn = new Data(rowsData, {}, persistedState, new DualYAxisStrategy());
      colIn = new Data(colsData, {}, persistedState, new DualYAxisStrategy());
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
      let data = new Data(seriesDataWithDualAxis, {}, persistedState, new DualYAxisStrategy());
      let primaryChartLength = data.chartData()[0].series[0].values.length;
      let secondaryChartLength = data.chartData()[0].series[1].values.length;

      expect(data._flatten(true)).to.have.length(primaryChartLength);
      expect(data._flatten(false)).to.have.length(secondaryChartLength);
    });
  });

  describe('getYMin method', function () {
    let visData;
    let visDataNeg;
    let visDataStacked;
    let minValue = 4;
    let minValueNeg = -41;
    let minValueStacked = 15;

    beforeEach(function () {
      visData = new Data(dataSeries, {}, persistedState);
      visDataNeg = new Data(dataSeriesNeg, {}, persistedState);
      visDataStacked = new Data(dataStacked, { type: 'histogram' }, persistedState);
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
      let series = _.pluck(visData.chartData(), 'series');
      let stackedSeries = _.pluck(visDataStacked.chartData(), 'series');
      expect(_.min(series.values, function (d) { return d.x; })).to.be.greaterThan(minValue);
      expect(_.min(stackedSeries.values, function (d) { return d.x; })).to.be.greaterThan(minValueStacked);
    });

    it('allows passing a value getter for manipulating the values considered', function () {
      let realMin = visData.getYMin();
      let multiplier = 13.2;
      expect(visData.getYMin(function (d) { return d.y * multiplier; })).to.be(realMin * multiplier);
    });
  });

  describe('getSecondYMin method', function () {
    let visData;
    let visDataNeg;
    let visDataStacked;
    let minValue = 4;
    let secondMinValue = 400;
    let minValueNeg = -41;
    let secondMinValueNeg = -4100;

    beforeEach(function () {
      visData = new Data(dualAxisDataSeries, {}, persistedState, new DualYAxisStrategy());
      visDataNeg = new Data(dualAxisDataSeriesNeg, {}, persistedState, new DualYAxisStrategy());
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
    let visData;
    let visDataNeg;
    let visDataStacked;
    let maxValue = 41;
    let maxValueNeg = -4;
    let maxValueStacked = 115;

    beforeEach(function () {
      visData = new Data(dataSeries, {}, persistedState);
      visDataNeg = new Data(dataSeriesNeg, {}, persistedState);
      visDataStacked = new Data(dataStacked, { type: 'histogram' }, persistedState);
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
      let series = _.pluck(visData.chartData(), 'series');
      let stackedSeries = _.pluck(visDataStacked.chartData(), 'series');
      expect(_.min(series, function (d) { return d.x; })).to.be.greaterThan(maxValue);
      expect(_.min(stackedSeries, function (d) { return d.x; })).to.be.greaterThan(maxValueStacked);
    });

    it('allows passing a value getter for manipulating the values considered', function () {
      let realMax = visData.getYMax();
      let multiplier = 13.2;
      expect(visData.getYMax(function (d) { return d.y * multiplier; })).to.be(realMax * multiplier);
    });
  });

  describe('getSecondYMax method', function () {
    let visData;
    let visDataNeg;
    let visDataStacked;
    let maxValue = 41;
    let secondMaxValue = 4100;
    let maxValueNeg = -4;
    let secondMaxValueNeg = -400;
    let maxValueStacked = 115;

    beforeEach(function () {
      visData = new Data(dualAxisDataSeries, {}, persistedState, new DualYAxisStrategy());
      visDataNeg = new Data(dualAxisDataSeriesNeg, {}, persistedState, new DualYAxisStrategy());
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

  describe('geohashGrid methods', function () {
    let data;
    let geohashGridData = {
      hits: 3954,
      rows: [{
        title: 'Top 5 _type: apache',
        label: 'Top 5 _type: apache',
        geoJson: {
          type: 'FeatureCollection',
          features: [],
          properties: {
            min: 2,
            max: 331,
            zoom: 3,
            center: [
              47.517200697839414,
              -112.06054687499999
            ]
          }
        },
      }, {
        title: 'Top 5 _type: nginx',
        label: 'Top 5 _type: nginx',
        geoJson: {
          type: 'FeatureCollection',
          features: [],
          properties: {
            min: 1,
            max: 88,
            zoom: 3,
            center: [
              47.517200697839414,
              -112.06054687499999
            ]
          }
        },
      }]
    };

    beforeEach(function () {
      data = new Data(geohashGridData, {}, persistedState);
    });

    describe('getVisData', function () {
      it('should return the rows property', function () {
        let visData = data.getVisData();
        expect(visData).to.eql(geohashGridData.rows);
      });
    });

    describe('getGeoExtents', function () {
      it('should return the min and max geoJson properties', function () {
        let minMax = data.getGeoExtents();
        expect(minMax.min).to.be(1);
        expect(minMax.max).to.be(331);
      });
    });
  });

  describe('null value check', function () {
    it('should return false', function () {
      let data = new Data(rowsData, {}, persistedState);
      expect(data.hasNullValues()).to.be(false);
    });

    it('should return true', function () {
      let nullRowData = { rows: rowsData.rows.slice(0) };
      nullRowData.rows.push({
        'label': 'e',
        'series': [
          {
            'label': '200',
            'values': [{x: 0, y: 1}, {x: 1, y: null}, {x: 2, y: 3}]
          }
        ]
      });

      let data = new Data(nullRowData, {}, persistedState);
      expect(data.hasNullValues()).to.be(true);
    });
  });
});
