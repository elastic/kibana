import d3 from 'd3';
import _ from 'lodash';
import { VislibComponentsZeroInjectionInjectZerosProvider } from '../components/zero_injection/inject_zeros';
import { VislibComponentsColorColorProvider } from 'ui/vis/components/color/color';
import { tooltipFormatter } from 'ui/vis/components/tooltip/formatter';

export function VislibLibDataProvider(Private) {

  const injectZeros = Private(VislibComponentsZeroInjectionInjectZerosProvider);
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
      this.type = this.getDataType(data);
      this.data = this.copyDataObj(data);

      this.labels = this.getLabels();
      this.color = this.labels ? color(this.labels, uiState.get('vis.colors')) : undefined;
      this._normalizeOrdered();

      this.chartData()[0].tooltipFormatter = tooltipFormatter;
    }

    getDataType(data) {
      if (!data.charts || !data.charts.length) return 'no data';
      if (data.charts[0].series) return 'series';
      if (data.charts[0].children) return 'slices';
      if (data.charts[0].cells) return 'table';

      throw ('vislib: invalid data format');
    }

    copyDataObj(data) {
      if (data.split === 'row') {
        return { rows: _.cloneDeep(data.charts) };
      }
      return { columns: _.cloneDeep(data.charts) };
    }

    getLabels(data = this.chartData()) {
      const getSeriesLabels = (data) => {
        const labels = {};
        data.forEach(chart => {
          _.each(chart.series, series => {
            if (!labels[series.label]) labels[series.label] = 1;
          });
        });
        return _.keys(labels);
      };
      return this.type === 'series' ? getSeriesLabels(data) : this.pieNames();
    }

    chartData() {
      return this.data.columns || this.data.rows;
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
      this.chartData().forEach((chart, i) => {
        this.stackChartData(handler, chart.series, handler.visConfig.get(`charts[${i}]`));
      });
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
      const source = this.chartData()[0];
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

    getNames(slices) {
      return slices
        .reduce((slices, slice) => {
          if (slice.children && slice.children.length) {
            slices = slices.concat(this.getNames(slice.children));
          }
          slices.push({
            label: slice.label
          });
          return slices;
        }, []);
    }

    /**
     * Removes zeros from pie chart data
     * @param slices
     * @returns {*}
     */
    _removeZeroSlices(data) {
      const self = this;

      if (!data.children || !data.children.length) return data;

      data.children = data.children.reduce(function (children, child) {
        if (child.values[0].value !== 0) {
          children.push(self._removeZeroSlices(child));
        }
        return children;
      }, []);

      return data;
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
        obj = self._removeZeroSlices(obj);

        _.forEach(self.getNames(obj.children), function (name) {
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
      const buckets = [];
      this.chartData().forEach(chart => {
        _.each(chart.series, series => {
          series.values.forEach(value => {
            const bucket = buckets.find(bucket => bucket.label === value.x);
            if (bucket) {
              bucket.value += value.y;
            } else {
              buckets.push({
                label: value.x,
                value: value.y
              });
            }
          });
        });
      });
      if (orderBucketsBySum) {
        return _.sortByOrder(buckets, 'value', 'desc').map(bucket => bucket.label);
      }
      return buckets.map(bucket => bucket.label);
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
      return color(this.pieNames(this.chartData()).map(function (d) {
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
      const data = this.chartData();
      const self = this;

      data.forEach(function (d) {
        if (!d.ordered || !d.ordered.date) return;

        const missingMin = d.ordered.min == null;
        const missingMax = d.ordered.max == null;

        if (missingMax || missingMin) {
          const extent = d3.extent(self.xValues());
          if (missingMin) d.ordered.min = parseInt(extent[0]);
          if (missingMax) d.ordered.max = parseInt(extent[1]);
        }
      });
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
