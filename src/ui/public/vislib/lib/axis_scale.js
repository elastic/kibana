import d3 from 'd3';
import _ from 'lodash';
import moment from 'moment';
import errors from 'ui/errors';

export default function AxisScaleFactory(Private) {
  class AxisScale {
    constructor(config, data) {
      super();
      this.config = config;
      this.data = data;

      if (this.config.get('type') === 'category') {
        this.values = data.xValues();
        this.ordered = data.get('ordered');
      }
    };

    isPercentage() {
      const mode = this.config.get('mode');
      return mode === 'percentage';
    };

    isUserDefined() {
      const setYExtents = this.config.get('scale.setYExtents');
      return setYExtents;
    };

    isYExtents() {
      const defaultYExtents = this.config.get('scale.defaultYExtents');
      return defaultYExtents;
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

    getTimeDomain(data) {
      return [this.minExtent(data), this.maxExtent(data)];
    };

    minExtent(data) {
      return this.calculateExtent(data || this.values, 'min');
    };

    maxExtent(data) {
      return this.calculateExtent(data || this.values, 'max');
    };

    calculateExtent(data, extent) {
      const ordered = this.ordered;
      const opts = [ordered[extent]];

      let point = d3[extent](data);
      if (this.config.get('scale.expandLastBucket') && extent === 'max') {
        point = this.addInterval(point);
      }
      opts.push(point);

      return d3[extent](opts.reduce(function (opts, v) {
        if (!_.isNumber(v)) v = +v;
        if (!isNaN(v)) opts.push(v);
        return opts;
      }, []));
    };

    addInterval(x) {
      return this.modByInterval(x, +1);
    };

    subtractInterval(x) {
      return this.modByInterval(x, -1);
    };

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

      const min = this.config.get('scale.min') || this.data.getYMin();
      const max = this.config.get('scale.max') || this.data.getYMax();
      const domain = [min, max];
      if (this.isUserDefined()) return this.validateUserExtents(domain);
      if (this.isYExtents()) return domain;
      if (this.isLogScale()) return this.logDomain(min, max);
      return [Math.min(0, min), Math.max(0, max)];
    };

    getRange(length) {
      if (this.config.isHorizontal()) {
        return !this.config.get('scale.inverted') ? [0, length] : [length, 0];
      } else {
        return this.config.get('scale.inverted') ? [0, length] : [length, 0];
      }
    };

    throwCustomError(message) {
      throw new Error(message);
    };

    throwLogScaleValuesError() {
      throw new errors.InvalidLogScaleValues();
    };

    logDomain(min, max) {
      if (min < 0 || max < 0) return this.throwLogScaleValuesError();
      return [1, max];
    };

    getScaleType(fnName) {
      if (fnName === 'square root') fnName = 'sqrt'; // Rename 'square root' to 'sqrt'
      fnName = fnName || 'linear';

      if (this.config.isTimeDomain()) return d3.time.scale.utc(); // allow time scale
      if (this.config.isOrdinal()) return d3.scale.ordinal();
      if (typeof d3.scale[fnName] !== 'function') return this.throwCustomError('Axis.getScaleType: ' + fnName + ' is not a function');

      return d3.scale[fnName]();
    };

    getScale(length) {
      const config = this.config;
      const scale = this.getScaleType(this.config.get('vis._attr.scale'));
      const domain = this.getExtents();
      const range = this.getRange(length);
      this.scale = scale.domain(domain);
      if (config.isOrdinal()) {
        this.scale.rangeBands(range, 0.1);
      } else {
        this.scale.range(range);
      }

      if (!this.isUserDefined() && !config.isOrdinal() && !config.isTimeDomain()) this.scale.nice(); // round extents when not user defined
      // Prevents bars from going off the chart when the y extents are within the domain range
      if (config.get('vis._attr.type') === 'histogram' && this.scale.clamp) this.scale.clamp(true);

      this.validateScale(this.scale);

      return this.scale;
    };

    validateScale(scale) {
      if (!scale || _.isNaN(scale)) throw new Error('scale is ' + scale);
    };
  }
  return AxisScale;
};
