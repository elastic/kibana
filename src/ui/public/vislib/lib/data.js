import d3 from 'd3';
import _ from 'lodash';
import VislibComponentsZeroInjectionInjectZerosProvider from 'ui/vislib/components/zero_injection/inject_zeros';
import VislibComponentsZeroInjectionOrderedXKeysProvider from 'ui/vislib/components/zero_injection/ordered_x_keys';
import VislibComponentsLabelsLabelsProvider from 'ui/vislib/components/labels/labels';
import VislibComponentsColorColorProvider from 'ui/vislib/components/color/color';
export default function DataFactory(Private) {

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
      this.data = data;
      this.type = this.getDataType();

      this.labels = this._getLabels(this.data);
      this.color = this.labels ? color(this.labels, uiState.get('vis.colors')) : undefined;
      this._normalizeOrdered();
    }

    _updateData() {
      if (this.data.rows) {
        _.map(this.data.rows, this._updateDataSeriesLabel, this);
      } else if (this.data.columns) {
        _.map(this.data.columns, this._updateDataSeriesLabel, this);
      } else {
        this._updateDataSeriesLabel(this.data);
      }
    };

    _updateDataSeriesLabel(eachData) {
      if (eachData.series) {
        eachData.series[0].label = this.get('yAxisLabel');
      }
    };

    _getLabels(data) {
      if (this.type === 'series') {
        const noLabel = getLabels(data).length === 1 && getLabels(data)[0] === '';
        if (noLabel) {
          this._updateData();
          return [(this.get('yAxisLabel'))];
        }
        return getLabels(data);
      }
      return this.pieNames();
    };

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
    };

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
    };

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
    };

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
      }, {min: Infinity, max: -Infinity});
    };

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
    };

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
    };

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
    };

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
    };

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
    };

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

      _.forEach(array, function (obj, i) {
        names.push({
          label: obj.name,
          values: obj,
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
    };

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
    };

    /**
     * Removes zeros from pie chart data
     * @param slices
     * @returns {*}
     */
    _removeZeroSlices(slices) {
      const self = this;

      if (!slices.children) return slices;

      slices = _.clone(slices);
      slices.children = slices.children.reduce(function (children, child) {
        if (child.size !== 0) {
          children.push(self._removeZeroSlices(child));
        }
        return children;
      }, []);

      return slices;
    };

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
        obj.slices = self._removeZeroSlices(obj.slices);

        _.forEach(self.getNames(obj, columns), function (name) {
          names.push(name);
        });
      });

      return _.uniq(names, 'label');
    };

    /**
     * Inject zeros into the data
     *
     * @method injectZeros
     * @returns {Object} Data object with zeros injected
     */
    injectZeros() {
      return injectZeros(this.data);
    };

    /**
     * Returns an array of all x axis values from the data
     *
     * @method xValues
     * @returns {Array} Array of x axis values
     */
    xValues() {
      return orderKeys(this.data);
    };

    /**
     * Return an array of unique labels
     * Curently, only used for vertical bar and line charts,
     * or any data object with series values
     *
     * @method getLabels
     * @returns {Array} Array of labels (strings)
     */
    getLabels() {
      return getLabels(this.data);
    };

    /**
     * Returns a function that does color lookup on labels
     *
     * @method getColorFunc
     * @returns {Function} Performs lookup on string and returns hex color
     */
    getColorFunc() {
      return color(this.getLabels(), this.uiState.get('vis.colors'));
    };

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
    };

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
    };

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
      let values;
      values = _.map(series.rows, function (row) {
        return row[row.length - 1];
      });
      return [_.min(values), _.max(values)];
    };

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
    };
  }

  return Data;
};
