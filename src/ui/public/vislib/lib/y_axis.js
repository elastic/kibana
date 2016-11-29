import d3 from 'd3';
import _ from 'lodash';
import $ from 'jquery';
import errors from 'ui/errors';
import VislibLibErrorHandlerProvider from 'ui/vislib/lib/_error_handler';
export default function YAxisFactory(Private) {

  const ErrorHandler = Private(VislibLibErrorHandlerProvider);

  /**
   * Appends y axis to the visualization
   *
   * @class YAxis
   * @constructor
   * @param args {{el: (HTMLElement), yMax: (Number), _attr: (Object|*)}}
   */
  class YAxis extends ErrorHandler {
    constructor(args) {
      super();
      this.el = args.el;
      this.scale = null;
      this.domain = [args.yMin, args.yMax];
      this.yAxisFormatter = args.yAxisFormatter;
      this._attr = args._attr || {};
    }

    /**
     * Renders the y axis
     *
     * @method render
     * @return {D3.UpdateSelection} Renders y axis to visualization
     */
    render() {
      d3.select(this.el).selectAll('.y-axis-div').call(this.draw());
    };

    _isPercentage() {
      return (this._attr.mode === 'percentage');
    };

    _isUserDefined() {
      return (this._attr.setYExtents);
    };

    _isYExtents() {
      return (this._attr.defaultYExtents);
    };

    _validateUserExtents(domain) {
      const self = this;

      return domain.map(function (val) {
        val = parseInt(val, 10);

        if (isNaN(val)) throw new Error(val + ' is not a valid number');
        if (self._isPercentage() && self._attr.setYExtents) return val / 100;
        return val;
      });
    };

    _getExtents(domain) {
      const min = domain[0];
      const max = domain[1];

      if (this._isUserDefined()) return this._validateUserExtents(domain);
      if (this._isYExtents()) return domain;
      if (this._attr.scale === 'log') return this._logDomain(min, max); // Negative values cannot be displayed with a log scale.
      if (!this._isYExtents() && !this._isUserDefined()) return [Math.min(0, min), Math.max(0, max)];
      return domain;
    };

    _throwCustomError(message) {
      throw new Error(message);
    };

    _throwLogScaleValuesError() {
      throw new errors.InvalidLogScaleValues();
    };

    /**
     * Returns the appropriate D3 scale
     *
     * @param fnName {String} D3 scale
     * @returns {*}
     */
    _getScaleType(fnName) {
      if (fnName === 'square root') fnName = 'sqrt'; // Rename 'square root' to 'sqrt'
      fnName = fnName || 'linear';

      if (typeof d3.scale[fnName] !== 'function') return this._throwCustomError('YAxis.getScaleType: ' + fnName + ' is not a function');

      return d3.scale[fnName]();
    };

    /**
     * Return the domain for log scale, i.e. the extent of the log scale.
     * Log scales must begin at 1 since the log(0) = -Infinity
     *
     * @param {Number} min
     * @param {Number} max
     * @returns {Array}
     */
    _logDomain(min, max) {
      if (min < 0 || max < 0) return this._throwLogScaleValuesError();
      return [1, max];
    };

    /**
     * Creates the d3 y scale function
     *
     * @method getYScale
     * @param height {Number} DOM Element height
     * @returns {D3.Scale.QuantitiveScale|*} D3 yScale function
     */
    getYScale(height) {
      const scale = this._getScaleType(this._attr.scale);
      const domain = this._getExtents(this.domain);

      this.yScale = scale
      .domain(domain)
      .range([height, 0]);

      if (!this._isUserDefined()) this.yScale.nice(); // round extents when not user defined
      // Prevents bars from going off the chart when the y extents are within the domain range
      if (this._attr.type === 'histogram') this.yScale.clamp(true);
      return this.yScale;
    };

    getScaleType() {
      return this._attr.scale;
    };

    tickFormat() {
      const isPercentage = this._attr.mode === 'percentage';
      if (isPercentage) return d3.format('%');
      if (this.yAxisFormatter) return this.yAxisFormatter;
      return d3.format('n');
    };

    _validateYScale(yScale) {
      if (!yScale || _.isNaN(yScale)) throw new Error('yScale is ' + yScale);
    };

    /**
     * Creates the d3 y axis function
     *
     * @method getYAxis
     * @param height {Number} DOM Element height
     * @returns {D3.Svg.Axis|*} D3 yAxis function
     */
    getYAxis(height) {
      const yScale = this.getYScale(height);
      this._validateYScale(yScale);

      // Create the d3 yAxis function
      this.yAxis = d3.svg.axis()
      .scale(yScale)
      .tickFormat(this.tickFormat(this.domain))
      .ticks(this.tickScale(height))
      .orient('left');

      return this.yAxis;
    };

    /**
     * Create a tick scale for the y axis that modifies the number of ticks
     * based on the height of the wrapping DOM element
     * Avoid using even numbers in the yTickScale.range
     * Causes the top most tickValue in the chart to be missing
     *
     * @method tickScale
     * @param height {Number} DOM element height
     * @returns {number} Number of y axis ticks
     */
    tickScale(height) {
      const yTickScale = d3.scale.linear()
      .clamp(true)
      .domain([20, 40, 1000])
      .range([0, 3, 11]);

      return Math.ceil(yTickScale(height));
    };

    /**
     * Renders the y axis to the visualization
     *
     * @method draw
     * @returns {Function} Renders y axis to visualization
     */
    draw() {
      const self = this;
      const margin = this._attr.margin;
      const mode = this._attr.mode;
      const isWiggleOrSilhouette = (mode === 'wiggle' || mode === 'silhouette');

      return function (selection) {
        selection.each(function () {
          const el = this;

          const div = d3.select(el);
          const width = $(el).parent().width();
          const height = $(el).height();
          const adjustedHeight = height - margin.top - margin.bottom;

          // Validate whether width and height are not 0 or `NaN`
          self.validateWidthandHeight(width, adjustedHeight);

          const yAxis = self.getYAxis(adjustedHeight);

          // The yAxis should not appear if mode is set to 'wiggle' or 'silhouette'
          if (!isWiggleOrSilhouette) {
            // Append svg and y axis
            const svg = div.append('svg')
            .attr('width', width)
            .attr('height', height);

            svg.append('g')
            .attr('class', 'y axis')
            .attr('transform', 'translate(' + (width - 2) + ',' + margin.top + ')')
            .call(yAxis);

            const container = svg.select('g.y.axis').node();
            if (container) {
              const cWidth = Math.max(width, container.getBBox().width);
              svg.attr('width', cWidth);
              svg.select('g')
              .attr('transform', 'translate(' + (cWidth - 2) + ',' + margin.top + ')');
            }
          }
        });
      };
    };
  }

  return YAxis;
};
