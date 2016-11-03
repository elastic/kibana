import d3 from 'd3';
import $ from 'jquery';
import _ from 'lodash';
import moment from 'moment';
import errors from 'ui/errors';

import ErrorHandlerProvider from 'ui/vislib/lib/_error_handler';
export default function AxisScaleFactory(Private) {

  const ErrorHandler = Private(ErrorHandlerProvider);

  /**
   * Appends axis title(s) to the visualization
   *
   * @class AxisScale
   * @constructor
   * @param el {HTMLElement} DOM element
   * @param xTitle {String} X-axis title
   * @param yTitle {String} Y-axis title
   */
  class AxisScale extends ErrorHandler {
    constructor(config, data) {
      super();
      this.config = config;
      this.data = data;

      if (this.config.get('type') === 'category') {
        this.values = data.xValues();
        this.ordered = data.data.ordered;
      }
    };

    isPercentage() {
      const mode = this.config.get('mode');
      return (mode === 'percentage');
    };

    isUserDefined() {
      const setYExtents = this.config.get('setYExtents');
      return (setYExtents);
    };

    isYExtents() {
      const defaultYExtents = this.config.get('defaultYExtents');
      return (defaultYExtents);
    };

    isLogScale() {
      return this.getScaleType() === 'log';
    };

    getScaleType() {
      return this.config.get('scale');
    };

    validateUserExtents(domain) {
      return domain.map((val) => {
        val = parseInt(val, 10);

        if (isNaN(val)) throw new Error(val + ' is not a valid number');
        if (this.isPercentage() && this.isUserDefined()) return val / 100;
        return val;
      });
    };

    /**
     * Returns D3 time domain
     *
     * @method getTimeDomain
     * @param scale {Function} D3 scale function
     * @param data {Array}
     * @returns {*} D3 scale function
     */
    getTimeDomain(data) {
      return [this.minExtent(data), this.maxExtent(data)];
    };

    minExtent(data) {
      return this.calculateExtent(data || this.values, 'min');
    };

    maxExtent(data) {
      return this.calculateExtent(data || this.values, 'max');
    };

    /**
     *
     * @param data
     * @param extent
     */
    calculateExtent(data, extent) {
      const ordered = this.ordered;
      const opts = [ordered[extent]];

      let point = d3[extent](data);
      if (this.config.get('expandLastBucket') && extent === 'max') {
        point = this.addInterval(point);
      }
      opts.push(point);

      return d3[extent](opts.reduce(function (opts, v) {
        if (!_.isNumber(v)) v = +v;
        if (!isNaN(v)) opts.push(v);
        return opts;
      }, []));
    };

    /**
     * Add the interval to a point on the x axis,
     * this properly adds dates if needed.
     *
     * @param {number} x - a value on the x-axis
     * @returns {number} - x + the ordered interval
     */
    addInterval(x) {
      return this.modByInterval(x, +1);
    };

    /**
     * Subtract the interval to a point on the x axis,
     * this properly subtracts dates if needed.
     *
     * @param {number} x - a value on the x-axis
     * @returns {number} - x - the ordered interval
     */
    subtractInterval(x) {
      return this.modByInterval(x, -1);
    };

    /**
     * Modify the x value by n intervals, properly
     * handling dates if needed.
     *
     * @param {number} x - a value on the x-axis
     * @param {number} n - the number of intervals
     * @returns {number} - x + n intervals
     */
    modByInterval(x, n) {
      const ordered = this.ordered;
      if (!ordered) return x;
      const interval = ordered.interval;
      if (!interval) return x;

      if (!ordered.date) {
        return x += (ordered.interval * n);
      }

      const y = moment(x);
      const method = n > 0 ? 'add' : 'subtract';

      _.times(Math.abs(n), function () {
        y[method](interval);
      });

      return y.valueOf();
    };

    getExtents() {
      if (this.config.get('type') === 'category') {
        if (this.config.isTimeDomain()) return this.getTimeDomain(this.values);
        if (this.config.isOrdinal()) return this.values;
      }

      const min = this.config.get('min') || this.data.getYMin();
      const max = this.config.get('max') || this.data.getYMax();
      const domain = [min, max];
      if (this.isUserDefined()) return this.validateUserExtents(domain);
      if (this.isYExtents()) return domain;
      if (this.isLogScale()) return this.logDomain(min, max);
      return [Math.min(0, min), Math.max(0, max)];
    };

    getRange(length) {
      if (this.config.isHorizontal()) {
        return !this.config.get('inverted') ? [0, length] : [length, 0];
      } else {
        return this.config.get('inverted') ? [0, length] : [length, 0];
      }
    };

    throwCustomError(message) {
      throw new Error(message);
    };

    throwLogScaleValuesError() {
      throw new errors.InvalidLogScaleValues();
    };

    /**
     * Return the domain for log scale, i.e. the extent of the log scale.
     * Log scales must begin at 1 since the log(0) = -Infinity
     *
     * @param scale
     * @param yMin
     * @param yMax
     * @returns {*[]}
     */
    logDomain(min, max) {
      if (min < 0 || max < 0) return this.throwLogScaleValuesError();
      return [1, max];
    };

    /**
     * Returns the appropriate D3 scale
     *
     * @param fnName {String} D3 scale
     * @returns {*}
     */
    getScaleType(fnName) {
      if (fnName === 'square root') fnName = 'sqrt'; // Rename 'square root' to 'sqrt'
      fnName = fnName || 'linear';

      if (this.config.isTimeDomain()) return d3.time.scale.utc(); // allow time scale
      if (this.config.isOrdinal()) return d3.scale.ordinal();
      if (typeof d3.scale[fnName] !== 'function') return this.throwCustomError('Axis.getScaleType: ' + fnName + ' is not a function');

      return d3.scale[fnName]();
    };

    /**
     * Creates the d3 y scale function
     *
     * @method getscale
     * @param length {Number} DOM Element height
     * @returns {D3.Scale.QuantitiveScale|*} D3 scale function
     */
    getScale(length) {
      const scale = this.getScaleType(this.config.get('vis._attr.scale'));
      const domain = this.getExtents();
      const range = this.getRange(length);
      this.scale = scale.domain(domain);
      if (this.config.isOrdinal()) {
        this.scale.rangeBands(range, 0.1);
      } else {
        this.scale.range(range);
      }

      if (!this.isUserDefined() && !this.config.isOrdinal() && !this.config.isTimeDomain()) this.scale.nice(); // round extents when not user defined
      // Prevents bars from going off the chart when the y extents are within the domain range
      // todo: make this work (its accessing chart config ... we only have axis config availible)
      //if (this.axis._attr.type === 'histogram' && this.scale.clamp) this.scale.clamp(true);

      this.validateScale(this.scale);

      return this.scale;
    };

    validateScale(scale) {
      if (!scale || _.isNaN(scale)) throw new Error('scale is ' + scale);
    };
  }
  return AxisScale;
};
