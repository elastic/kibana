import d3 from 'd3';
import _ from 'lodash';
export default function DataFactory(Private) {
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
                values: seri.values.map(val => {
                  const newVal = _.clone(val);
                  newVal.aggConfig = val.aggConfig;
                  newVal.aggConfigResult = val.aggConfigResult;
                  newVal.extraMetrics = val.extraMetrics;
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
