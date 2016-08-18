import d3 from 'd3';
import _ from 'lodash';
import $ from 'jquery';
import errors from 'ui/errors';
import VislibLibErrorHandlerProvider from 'ui/vislib/lib/_error_handler';
export default function AxisFactory(Private) {
  const ErrorHandler = Private(VislibLibErrorHandlerProvider);
  const defaults = {
    show: true,
    elClass: '.y-axis-div',
    position: 'left',
    axisTitle: null, //TODO: axis title should be a part of axis ... new AxisTitle(),
    axisFormatter: null, // TODO: create default axis formatter
    scale: 'linear',
    labels: {
      show: true,
      rotate: 0, // TODO
      color: 'black',
      font: '', // TODO
      fontSize: '8pt',
      maxSize: 50, // TODO
    },
    inverted: false,
    style: {
      color: 'black',
      lineWidth: '1px',
      opacity: 1,
      tickColor: 'black',
      tickWidth: '1px',
      tickLength: '6px'
    }
  };
  /**
   * Appends y axis to the visualization
   *
   * @class Axis
   * @constructor
   * @param args {{el: (HTMLElement), yMax: (Number), _attr: (Object|*)}}
   */
  _.class(Axis).inherits(ErrorHandler);
  function Axis(args) {
    _.extend(this, defaults, args);
    this.scale = null;
    // TODO:
    // we should check which series belong to this axis and then calculate min and max
    // if no series belong to it set show to false
    if (!this.min) this.min = this.data.getYMin();
    if (!this.max) this.max = this.data.getYMax();
    this.domain = [this.min, this.max];
    this._attr = args.vis._attr;
  }

  /**
   * Renders the y axis
   *
   * @method render
   * @return {D3.UpdateSelection} Renders y axis to visualization
   */
  Axis.prototype.render = function () {
    d3.select(this.vis.el).selectAll(this.elSelector).call(this.draw());
  };

  Axis.prototype._isPercentage = function () {
    return (this._attr.mode === 'percentage');
  };

  Axis.prototype._isUserDefined = function () {
    return (this._attr.setYExtents);
  };

  Axis.prototype._isYExtents = function () {
    return (this._attr.defaultYExtents);
  };

  Axis.prototype._validateUserExtents = function (domain) {
    const self = this;

    return domain.map(function (val) {
      val = parseInt(val, 10);

      if (isNaN(val)) throw new Error(val + ' is not a valid number');
      if (self._isPercentage() && self._attr.setYExtents) return val / 100;
      return val;
    });
  };

  Axis.prototype._getExtents = function (domain) {
    const [min, max] = domain;

    if (this._isUserDefined()) return this._validateUserExtents(domain);
    if (this._isYExtents()) return domain;
    if (this._attr.scale === 'log') return this._logDomain(min, max); // Negative values cannot be displayed with a log scale.
    if (!this._isYExtents() && !this._isUserDefined()) return [Math.min(0, min), Math.max(0, max)];
    return domain;
  };

  Axis.prototype._throwCustomError = function (message) {
    throw new Error(message);
  };

  Axis.prototype._throwLogScaleValuesError = function () {
    throw new errors.InvalidLogScaleValues();
  };

  /**
   * Returns the appropriate D3 scale
   *
   * @param fnName {String} D3 scale
   * @returns {*}
   */
  Axis.prototype._getScaleType = function (fnName) {
    if (fnName === 'square root') fnName = 'sqrt'; // Rename 'square root' to 'sqrt'
    fnName = fnName || 'linear';

    if (typeof d3.scale[fnName] !== 'function') return this._throwCustomError('Axis.getScaleType: ' + fnName + ' is not a function');

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
  Axis.prototype._logDomain = function (min, max) {
    if (min < 0 || max < 0) return this._throwLogScaleValuesError();
    return [1, max];
  };

  /**
   * Creates the d3 y scale function
   *
   * @method getscale
   * @param height {Number} DOM Element height
   * @returns {D3.Scale.QuantitiveScale|*} D3 scale function
   */
  Axis.prototype.getScale = function (height) {
    let scale = this._getScaleType(this._attr.scale);
    let domain = this._getExtents(this.domain);

    const range = this.inverted ? [0, height] : [height, 0];
    this.scale = scale.domain(domain).range(range);

    if (!this._isUserDefined()) this.scale.nice(); // round extents when not user defined
    // Prevents bars from going off the chart when the y extents are within the domain range
    if (this._attr.type === 'histogram') this.scale.clamp(true);
    return this.scale;
  };

  Axis.prototype.getScaleType = function () {
    return this._attr.scale;
  };

  Axis.prototype.tickFormat = function () {
    if (this.axisFormatter) return this.axisFormatter;
    if (this._isPercentage()) return d3.format('%');
    return d3.format('n');
  };

  Axis.prototype._validateScale = function (scale) {
    if (!scale || _.isNaN(scale)) throw new Error('scale is ' + scale);
  };

  /**
   * Creates the d3 y axis function
   *
   * @method getAxis
   * @param height {Number} DOM Element height
   * @returns {D3.Svg.Axis|*} D3 axis function
   */
  Axis.prototype.getAxis = function (height) {
    const scale = this.getScale(height);
    this._validateScale(scale);

    // Create the d3 axis function
    this.axis = d3.svg.axis()
      .scale(scale)
      .tickFormat(this.tickFormat(this.domain))
      .ticks(this.tickScale(height))
      .orient(this.position);

    return this.axis;
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
  Axis.prototype.tickScale = function (height) {
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
  Axis.prototype.draw = function () {
    let self = this;
    let margin = this.vis._attr.margin;
    let mode = this._attr.mode;
    let isWiggleOrSilhouette = (mode === 'wiggle' || mode === 'silhouette');

    return function (selection) {
      selection.each(function () {
        let el = this;

        let div = d3.select(el);
        let width = $(el).parent().width();
        let height = $(el).height();
        let adjustedHeight = height - margin.top - margin.bottom;
        // TODO: adjust width based on the labels size
        const adjustedWidth = width + margin.left + margin.right + 50;

        // Validate whether width and height are not 0 or `NaN`
        self.validateWidthandHeight(width, adjustedHeight);

        let axis = self.getAxis(adjustedHeight);

        // The axis should not appear if mode is set to 'wiggle' or 'silhouette'
        if (!isWiggleOrSilhouette && self.show) {
          // Append svg and y axis
          let svg = div.append('svg')
          .attr('width', adjustedWidth)
          .attr('height', height);

          const svgAxis = svg.append('g')
          .attr('class', `axis ${self.id}`)
          .attr('transform', 'translate(' + (width - 2) + ',' + margin.top + ')')
          .call(axis);

          let container = svg.select('g.axis').node();
          if (container) {
            let cWidth = Math.max(adjustedWidth, container.getBBox().width);
            svg.select('path')
            .attr('style', `stroke: ${self.style.color}; stroke-width: ${self.style.lineWidth}; stroke-opacity: ${self.style.opacity}`);
            svg.selectAll('line')
            .attr('style', `stroke: ${self.style.tickColor}; stroke-width: ${self.style.tickWidth}; stroke-opacity: ${self.style.opacity}`)
            .attr('x1', -parseInt(self.style.lineWidth) / 2)
            .attr('x2', -parseInt(self.style.lineWidth) / 2 - parseInt(self.style.tickLength));

            svg.selectAll('text')
            .attr('style', `text-anchor: end; font-size: ${self.labels.fontSize};`)
            .attr('x', -3 - parseInt(self.style.lineWidth) / 2 - parseInt(self.style.tickLength));
            if (!self.labels.show) svg.selectAll('test').attr('style', 'display: none;');

            svg.attr('width', cWidth);
            svg.select('g')
            .attr('transform', 'translate(' + (cWidth - 2 - parseInt(self.style.lineWidth)) + ',' + margin.top + ')');
          }
        }
      });
    };
  };

  return Axis;
};
