define(function (require) {
  return function YAxisFactory(Private) {
    let d3 = require('d3');
    let _ = require('lodash');
    let $ = require('jquery');
    let errors = require('ui/errors');

    let ErrorHandler = Private(require('ui/vislib/lib/_error_handler'));

    /**
     * Appends y axis to the visualization
     *
     * @class YAxis
     * @constructor
     * @param args {{el: (HTMLElement), yMax: (Number), _attr: (Object|*)}}
     */
    _.class(YAxis).inherits(ErrorHandler);
    function YAxis(args) {
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
    YAxis.prototype.render = function () {
      d3.select(this.el).selectAll('.y-axis-div').call(this.draw());
    };

    YAxis.prototype._isPercentage = function () {
      return (this._attr.mode === 'percentage');
    };

    YAxis.prototype._isUserDefined = function () {
      return (this._attr.setYExtents);
    };

    YAxis.prototype._isYExtents = function () {
      return (this._attr.defaultYExtents);
    };

    YAxis.prototype._validateUserExtents = function (domain) {
      let self = this;

      return domain.map(function (val) {
        val = parseInt(val, 10);

        if (isNaN(val)) throw new Error(val + ' is not a valid number');
        if (self._isPercentage() && self._attr.setYExtents) return val / 100;
        return val;
      });
    };

    YAxis.prototype._getExtents = function (domain) {
      let min = domain[0];
      let max = domain[1];

      if (this._isUserDefined()) return this._validateUserExtents(domain);
      if (this._isYExtents()) return domain;
      if (this._attr.scale === 'log') return this._logDomain(min, max); // Negative values cannot be displayed with a log scale.
      if (!this._isYExtents() && !this._isUserDefined()) return [Math.min(0, min), Math.max(0, max)];
      return domain;
    };

    YAxis.prototype._throwCustomError = function (message) {
      throw new Error(message);
    };

    YAxis.prototype._throwLogScaleValuesError = function () {
      throw new errors.InvalidLogScaleValues();
    };

    /**
     * Returns the appropriate D3 scale
     *
     * @param fnName {String} D3 scale
     * @returns {*}
     */
    YAxis.prototype._getScaleType = function (fnName) {
      if (fnName === 'square root') fnName = 'sqrt'; // Rename 'square root' to 'sqrt'
      fnName = fnName || 'linear';

      if (typeof d3.scale[fnName] !== 'function') return this._throwCustomError('YAxis.getScaleType: ' + fnName + ' is not a function');

      return d3.scale[fnName]();
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
    YAxis.prototype._logDomain = function (min, max) {
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
    YAxis.prototype.getYScale = function (height) {
      let scale = this._getScaleType(this._attr.scale);
      let domain = this._getExtents(this.domain);

      this.yScale = scale
      .domain(domain)
      .range([height, 0]);

      if (!this._isUserDefined()) this.yScale.nice(); // round extents when not user defined
      // Prevents bars from going off the chart when the y extents are within the domain range
      if (this._attr.type === 'histogram') this.yScale.clamp(true);
      return this.yScale;
    };

    YAxis.prototype.getScaleType = function () {
      return this._attr.scale;
    };

    YAxis.prototype.tickFormat = function () {
      let isPercentage = this._attr.mode === 'percentage';
      if (isPercentage) return d3.format('%');
      if (this.yAxisFormatter) return this.yAxisFormatter;
      return d3.format('n');
    };

    YAxis.prototype._validateYScale = function (yScale) {
      if (!yScale || _.isNaN(yScale)) throw new Error('yScale is ' + yScale);
    };

    /**
     * Creates the d3 y axis function
     *
     * @method getYAxis
     * @param height {Number} DOM Element height
     * @returns {D3.Svg.Axis|*} D3 yAxis function
     */
    YAxis.prototype.getYAxis = function (height) {
      let yScale = this.getYScale(height);
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
    YAxis.prototype.tickScale = function (height) {
      let yTickScale = d3.scale.linear()
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
    YAxis.prototype.draw = function () {
      let self = this;
      let margin = this._attr.margin;
      let mode = this._attr.mode;
      let isWiggleOrSilhouette = (mode === 'wiggle' || mode === 'silhouette');

      return function (selection) {
        selection.each(function () {
          let el = this;

          let div = d3.select(el);
          let width = $(el).parent().width();
          let height = $(el).height();
          let adjustedHeight = height - margin.top - margin.bottom;

          // Validate whether width and height are not 0 or `NaN`
          self.validateWidthandHeight(width, adjustedHeight);

          let yAxis = self.getYAxis(adjustedHeight);

          // The yAxis should not appear if mode is set to 'wiggle' or 'silhouette'
          if (!isWiggleOrSilhouette) {
            // Append svg and y axis
            let svg = div.append('svg')
            .attr('width', width)
            .attr('height', height);

            svg.append('g')
            .attr('class', 'y axis')
            .attr('transform', 'translate(' + (width - 2) + ',' + margin.top + ')')
            .call(yAxis);

            let container = svg.select('g.y.axis').node();
            if (container) {
              let cWidth = Math.max(width, container.getBBox().width);
              svg.attr('width', cWidth);
              svg.select('g')
              .attr('transform', 'translate(' + (cWidth - 2) + ',' + margin.top + ')');
            }
          }
        });
      };
    };

    return YAxis;
  };
});
