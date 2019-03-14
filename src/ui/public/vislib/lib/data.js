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

import d3 from 'd3';
import _ from 'lodash';
import { VislibComponentsZeroInjectionInjectZerosProvider } from '../components/zero_injection/inject_zeros';
import { VislibComponentsZeroInjectionOrderedXKeysProvider } from '../components/zero_injection/ordered_x_keys';
import { VislibComponentsLabelsLabelsProvider } from '../components/labels/labels';
import { VislibComponentsColorColorProvider } from '../../vis/components/color/color';

export function VislibLibDataProvider(Private) {

  const injectZeros = Private(VislibComponentsZeroInjectionInjectZerosProvider);
  const orderKeys = Private(VislibComponentsZeroInjectionOrderedXKeysProvider);
  const getLabels = Private(VislibComponentsLabelsLabelsProvider);
  const color = Private(VislibComponentsColorColorProvider);

  /**
   * Provides an API for pulling values off the data
   * and calculating values using the data
   *
   * @class Data
   * @constructor
   * @param data {Object} Elasticsearch query results
   * @param attr {Object|*} Visualization options
   */
  class Data {
    constructor(data, uiState) {
      this.uiState = uiState;
      this.data = this.copyDataObj(data);
      this.type = this.getDataType();
      this._cleanVisData();
      this.labels = this._getLabels(this.data);
      this.color = this.labels ? color(this.labels, uiState.get('vis.colors')) : undefined;
      this._normalizeOrdered();
    }

    copyDataObj(data) {
      const copyChart = data => {
        const newData = {};
        Object.keys(data).forEach(key => {
          if (key !== 'series') {
            newData[key] = data[key];
          } else {
            newData[key] = data[key].map(seri => {
              return {
                label: seri.label,
                aggLabel: seri.aggLabel,
                aggId: seri.aggId,
                values: seri.values.map(val => {
                  const newVal = _.clone(val);
                  newVal.aggConfig = val.aggConfig;
                  newVal.aggConfigResult = val.aggConfigResult;
                  newVal.extraMetrics = val.extraMetrics;
                  newVal.series = val.series || seri.label;
                  return newVal;
                })
              };
            });
          }
        });
        return newData;
      };

      if (!data.series) {
        const newData = {};
        Object.keys(data).forEach(key => {
          if (!['rows', 'columns'].includes(key)) {
            newData[key] = data[key];
          }
          else {
            newData[key] = data[key].map(chart => {
              return copyChart(chart);
            });
          }
        });
        return newData;
      }
      return copyChart(data);
    }

    _getLabels(data) {
      if (this.type === 'series') {
        return getLabels(data);
      }
      return [];
    }

    getDataType() {
      const data = this.getVisData();
      let type;

      data.forEach(function (obj) {
        if (obj.series) {
          type = 'series';
        } else if (obj.slices) {
          type = 'slices';
        } else if (obj.geoJson) {
          type = 'geoJson';
        }
      });

      return type;
    }

    /**
     * Returns an array of the actual x and y data value objects
     * from data with series keys
     *
     * @method chartData
     * @returns {*} Array of data objects
     */
    chartData() {
      if (!this.data.series) {
        const arr = this.data.rows ? this.data.rows : this.data.columns;
        return _.toArray(arr);
      }
      return [this.data];
    }

    shouldBeStacked(seriesConfig) {
      if (!seriesConfig) return false;
      return (seriesConfig.mode === 'stacked');
    }

    getStackedSeries(chartConfig, axis, series, first = false) {
      const matchingSeries = [];
      chartConfig.series.forEach((seriArgs, i) => {
        const matchingAxis = seriArgs.valueAxis === axis.axisConfig.get('id') || (!seriArgs.valueAxis && first);
        if (matchingAxis && (this.shouldBeStacked(seriArgs) || axis.axisConfig.get('scale.stacked'))) {
          matchingSeries.push(series[i]);
        }
      });
      return matchingSeries;
    }

    stackChartData(handler, data, chartConfig) {
      const stackedData = {};
      handler.valueAxes.forEach((axis, i) => {
        const id = axis.axisConfig.get('id');
        stackedData[id] = this.getStackedSeries(chartConfig, axis, data, i === 0);
        stackedData[id] = this.injectZeros(stackedData[id], handler.visConfig.get('orderBucketsBySum', false));
        axis.axisConfig.set('stackedSeries', stackedData[id].length);
        axis.stack(_.map(stackedData[id], 'values'));
      });
      return stackedData;
    }

    stackData(handler) {
      const data = this.data;
      if (data.rows || data.columns) {
        const charts = data.rows ? data.rows : data.columns;
        charts.forEach((chart, i) => {
          this.stackChartData(handler, chart.series, handler.visConfig.get(`charts[${i}]`));
        });
      } else {
        this.stackChartData(handler, data.series, handler.visConfig.get('charts[0]'));
      }
    }

    /**
     * Returns an array of chart data objects
     *
     * @method getVisData
     * @returns {*} Array of chart data objects
     */
    getVisData() {
      let visData;

      if (this.data.rows) {
        visData = this.data.rows;
      } else if (this.data.columns) {
        visData = this.data.columns;
      } else {
        visData = [this.data];
      }

      return visData;
    }

    /**
     * get min and max for all cols, rows of data
     *
     * @method getMaxMin
     * @return {Object}
     */
    getGeoExtents() {
      const visData = this.getVisData();

      return _.reduce(_.pluck(visData, 'geoJson.properties'), function (minMax, props) {
        return {
          min: Math.min(props.min, minMax.min),
          max: Math.max(props.max, minMax.max)
        };
      }, { min: Infinity, max: -Infinity });
    }

    /**
     * Returns array of chart data objects for pie data objects
     *
     * @method pieData
     * @returns {*} Array of chart data objects
     */
    pieData() {
      if (!this.data.slices) {
        return this.data.rows ? this.data.rows : this.data.columns;
      }
      return [this.data];
    }

    /**
     * Get attributes off the data, e.g. `tooltipFormatter` or `xAxisFormatter`
     * pulls the value off the first item in the array
     * these values are typically the same between data objects of the same chart
     * TODO: May need to verify this or refactor
     *
     * @method get
     * @param thing {String} Data object key
     * @returns {*} Data object value
     */
    get(thing, def) {
      const source = (this.data.rows || this.data.columns || [this.data])[0];
      return _.get(source, thing, def);
    }

    /**
     * Returns true if null values are present
     * @returns {*}
     */
    hasNullValues() {
      const chartData = this.chartData();

      return chartData.some(function (chart) {
        return chart.series.some(function (obj) {
          return obj.values.some(function (d) {
            return d.y === null;
          });
        });
      });
    }

    /**
     * Return an array of all value objects
     * Pluck the data.series array from each data object
     * Create an array of all the value objects from the series array
     *
     * @method flatten
     * @returns {Array} Value objects
     */
    flatten() {
      return _(this.chartData())
        .pluck('series')
        .flattenDeep()
        .pluck('values')
        .flattenDeep()
        .value();
    }

    /**
     * Validates that the Y axis min value defined by user input
     * is a number.
     *
     * @param val {Number} Y axis min value
     * @returns {Number} Y axis min value
     */
    validateUserDefinedYMin(val) {
      if (!_.isNumber(val)) {
        throw new Error('validateUserDefinedYMin expects a number');
      }
      return val;
    }

    /**
     * Helper function for getNames
     * Returns an array of objects with a name (key) value and an index value.
     * The index value allows us to sort the names in the correct nested order.
     *
     * @method returnNames
     * @param array {Array} Array of data objects
     * @param index {Number} Number of times the object is nested
     * @param columns {Object} Contains name formatter information
     * @returns {Array} Array of labels (strings)
     */
    returnNames(array, index, columns) {
      const names = [];
      const self = this;

      _.forEach(array, function (obj) {
        names.push({
          label: obj.name,
          aggConfigResult: obj.aggConfigResult,
          index: index
        });

        if (obj.children) {
          const plusIndex = index + 1;

          _.forEach(self.returnNames(obj.children, plusIndex, columns), function (namedObj) {
            names.push(namedObj);
          });
        }
      });

      return names;
    }

    /**
     * Flattens hierarchical data into an array of objects with a name and index value.
     * The indexed value determines the order of nesting in the data.
     * Returns an array with names sorted by the index value.
     *
     * @method getNames
     * @param data {Object} Chart data object
     * @param columns {Object} Contains formatter information
     * @returns {Array} Array of names (strings)
     */
    getNames(data, columns) {
      const slices = data.slices;

      if (slices.children) {
        const namedObj = this.returnNames(slices.children, 0, columns);

        return _(namedObj)
          .sortBy(function (obj) {
            return obj.index;
          })
          .unique(function (d) {
            return d.label;
          })
          .value();
      }
    }

    /**
     * Clean visualization data from missing/wrong values.
     * Currently used only to clean remove zero slices from
     * pie chart.
     */
    _cleanVisData() {
      const visData = this.getVisData();
      if (this.type === 'slices') {
        this._cleanPieChartData(visData);
      }
    }

    /**
     * Mutate the current pie chart vis data to remove slices with
     * zero values.
     * @param {Array} data
     */
    _cleanPieChartData(data) {
      _.forEach(data, (obj) => {
        obj.slices = this._removeZeroSlices(obj.slices);
      });
    }

    /**
     * Removes zeros from pie chart data, mutating the passed values.
     * @param slices
     * @returns {*}
     */
    _removeZeroSlices(slices) {
      if (!slices.children) {
        return slices;
      }

      slices = _.clone(slices);
      slices.children = slices.children.reduce((children, child) => {
        if (child.size !== 0) {
          return [...children, this._removeZeroSlices(child)];
        }
        return children;
      }, []);

      return slices;
    }

    /**
     * Returns an array of names ordered by appearance in the nested array
     * of objects
     *
     * @method pieNames
     * @returns {Array} Array of unique names (strings)
     */
    pieNames(data) {
      const self = this;
      const names = [];

      _.forEach(data, function (obj) {
        const columns = obj.raw ? obj.raw.columns : undefined;
        _.forEach(self.getNames(obj, columns), function (name) {
          names.push(name);
        });
      });

      return _.uniq(names, 'label');
    }

    /**
     * Inject zeros into the data
     *
     * @method injectZeros
     * @returns {Object} Data object with zeros injected
     */
    injectZeros(data, orderBucketsBySum = false) {
      return injectZeros(data, this.data, orderBucketsBySum);
    }

    /**
     * Returns an array of all x axis values from the data
     *
     * @method xValues
     * @returns {Array} Array of x axis values
     */
    xValues(orderBucketsBySum = false) {
      return orderKeys(this.data, orderBucketsBySum);
    }

    /**
     * Return an array of unique labels
     * Currently, only used for vertical bar and line charts,
     * or any data object with series values
     *
     * @method getLabels
     * @returns {Array} Array of labels (strings)
     */
    getLabels() {
      return getLabels(this.data);
    }

    /**
     * Returns a function that does color lookup on labels
     *
     * @method getColorFunc
     * @returns {Function} Performs lookup on string and returns hex color
     */
    getColorFunc() {
      if (this.type === 'slices') {
        return this.getPieColorFunc();
      }
      const defaultColors = this.uiState.get('vis.defaultColors');
      const overwriteColors = this.uiState.get('vis.colors');
      const colors = defaultColors ? _.defaults({}, overwriteColors, defaultColors) : overwriteColors;
      return color(this.getLabels(), colors);
    }

    /**
     * Returns a function that does color lookup on names for pie charts
     *
     * @method getPieColorFunc
     * @returns {Function} Performs lookup on string and returns hex color
     */
    getPieColorFunc() {
      return color(this.pieNames(this.getVisData()).map(function (d) {
        return d.label;
      }), this.uiState.get('vis.colors'));
    }

    /**
     * ensure that the datas ordered property has a min and max
     * if the data represents an ordered date range.
     *
     * @return {undefined}
     */
    _normalizeOrdered() {
      const data = this.getVisData();
      const self = this;

      data.forEach(function (d) {
        if (!d.ordered || !d.ordered.date) return;

        const missingMin = d.ordered.min == null;
        const missingMax = d.ordered.max == null;

        if (missingMax || missingMin) {
          const extent = d3.extent(self.xValues());
          if (missingMin) d.ordered.min = extent[0];
          if (missingMax) d.ordered.max = extent[1];
        }
      });
    }

    /**
     * Calculates min and max values for all map data
     * series.rows is an array of arrays
     * each row is an array of values
     * last value in row array is bucket count
     *
     * @method mapDataExtents
     * @param series {Array} Array of data objects
     * @returns {Array} min and max values
     */
    mapDataExtents(series) {
      const values = _.map(series.rows, function (row) {
        return row[row.length - 1];
      });
      return [_.min(values), _.max(values)];
    }

    /**
     * Get the maximum number of series, considering each chart
     * individually.
     *
     * @return {number} - the largest number of series from all charts
     */
    maxNumberOfSeries() {
      return this.chartData().reduce(function (max, chart) {
        return Math.max(max, chart.series.length);
      }, 0);
    }
  }

  return Data;
}
