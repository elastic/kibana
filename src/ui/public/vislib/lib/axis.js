import d3 from 'd3';
import _ from 'lodash';
import $ from 'jquery';
import moment from 'moment';
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
      rotate: 0,
      color: 'black',
      font: '', // TODO
      fontSize: '8pt',
      truncate: 50, // TODO,
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
    // TODO:
    // we should do this at a later stage and only for numerical scales (not ordinal or time)
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

  /**
   * Returns D3 time domain
   *
   * @method getTimeDomain
   * @param scale {Function} D3 scale function
   * @param data {Array}
   * @returns {*} D3 scale function
   */
  Axis.prototype.getTimeDomain = function (scale, data) {
    return scale.domain([this.minExtent(data), this.maxExtent(data)]);
  };

  Axis.prototype.minExtent = function (data) {
    return this._calculateExtent(data || this.xValues, 'min');
  };

  Axis.prototype.maxExtent = function (data) {
    return this._calculateExtent(data || this.xValues, 'max');
  };

  /**
   *
   * @param data
   * @param extent
   */
  Axis.prototype._calculateExtent = function (data, extent) {
    let ordered = this.ordered;
    let opts = [ordered[extent]];

    let point = d3[extent](data);
    if (this.expandLastBucket && extent === 'max') {
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
  Axis.prototype.addInterval = function (x) {
    return this.modByInterval(x, +1);
  };

  /**
   * Subtract the interval to a point on the x axis,
   * this properly subtracts dates if needed.
   *
   * @param {number} x - a value on the x-axis
   * @returns {number} - x - the ordered interval
   */
  Axis.prototype.subtractInterval = function (x) {
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
  Axis.prototype.modByInterval = function (x, n) {
    let ordered = this.ordered;
    if (!ordered) return x;
    let interval = ordered.interval;
    if (!interval) return x;

    if (!ordered.date) {
      return x += (ordered.interval * n);
    }

    let y = moment(x);
    let method = n > 0 ? 'add' : 'subtract';

    _.times(Math.abs(n), function () {
      y[method](interval);
    });

    return y.valueOf();
  };

  Axis.prototype._getExtents = function (domain) {
    const [min, max] = domain;

    if (this.ordered && this.ordered.date) return this.getTimeDomain(this.values);
    if (this.values) return this.values;
    if (this._isUserDefined()) return this._validateUserExtents(domain);
    if (this._isYExtents()) return domain;
    if (this._attr.scale === 'log') return this._logDomain(min, max); // Negative values cannot be displayed with a log scale.
    return [Math.min(0, min), Math.max(0, max)];
  };

  Axis.prototype._getRange = function (height) {
    return this.inverted ? [0, height] : [height, 0];
  };

  Axis.prototype._throwCustomError = function (message) {
    throw new Error(message);
  };

  Axis.prototype._throwLogScaleValuesError = function () {
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
  Axis.prototype._logDomain = function (min, max) {
    if (min < 0 || max < 0) return this._throwLogScaleValuesError();
    return [1, max];
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

    if (this.ordered && this.ordered.date) return d3.time.scale.utc(); // allow time scale
    if (typeof d3.scale[fnName] !== 'function') return this._throwCustomError('Axis.getScaleType: ' + fnName + ' is not a function');

    return d3.scale[fnName]();
  };

  /**
   * Creates the d3 y scale function
   *
   * @method getscale
   * @param height {Number} DOM Element height
   * @returns {D3.Scale.QuantitiveScale|*} D3 scale function
   */
  Axis.prototype.getScale = function (height) {
    // TODO: should receive size (width, height) and decide based on the position
    const scale = this._getScaleType(this._attr.scale);
    // TODO: should call getDomain which can return extents, ordinal domain values, time extents
    const domain = this._getExtents(this.domain);
    // TODO: should allow range bands
    const range = this._getRange(height);
    this.scale = scale.domain(domain).range(range);

    if (!this._isUserDefined()) this.scale.nice(); // round extents when not user defined
    // Prevents bars from going off the chart when the y extents are within the domain range
    if (this._attr.type === 'histogram') this.scale.clamp(true);

    this._validateScale(this.scale);

    return this.scale;
  };

  Axis.prototype.getScaleType = function () {
    return this._attr.scale;
  };

  Axis.prototype._validateScale = function (scale) {
    if (!scale || _.isNaN(scale)) throw new Error('scale is ' + scale);
  };

  /**
   * Creates the d3 y axis function
   *
   * @method getAxis
   * @param length {Number} DOM Element height
   * @returns {D3.Svg.Axis|*} D3 axis function
   */
  Axis.prototype.getAxis = function (length) {
    const scale = this.getScale(length);

    // Create the d3 axis function
    this.axis = d3.svg.axis()
      .scale(scale)
      .tickFormat(this.tickFormat(this.domain))
      .ticks(this.tickScale(length))
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
  Axis.prototype.tickScale = function (length) {
    // TODO: should accept size and decide based on position which one to use (width, height)
    const yTickScale = d3.scale.linear()
    .clamp(true)
    .domain([20, 40, 1000])
    .range([0, 3, 11]);

    return Math.ceil(yTickScale(length));
  };

  Axis.prototype.tickFormat = function () {
    if (this.axisFormatter) return this.axisFormatter;
    if (this._isPercentage()) return d3.format('%');
    return d3.format('n');
  };

  Axis.prototype.getLength = function (el) {
    if (this.position === 'top' || this.position === 'bottom') {
      return $(el).parent().width() - this._attr.margin.left - this._attr.margin.right;
    }
    return $(el).parent().height() - this._attr.margin.top - this._attr.margin.bottom;
  };

  /**
   * Renders the y axis to the visualization
   *
   * @method draw
   * @returns {Function} Renders y axis to visualization
   */
  Axis.prototype.draw = function () {
    const self = this;
    const margin = this.vis._attr.margin;
    const mode = this._attr.mode;
    const isWiggleOrSilhouette = (mode === 'wiggle' || mode === 'silhouette');

    return function (selection) {
      selection.each(function () {
        const el = this;
        const div = d3.select(el);
        const width = $(el).parent().width();
        const height = $(el).height();
        const length = self.getLength(el);
        const adjustedHeight = height - margin.top - margin.bottom;
        // TODO: adjust width based on the labels size
        const adjustedWidth = width + margin.left + margin.right + 50;

        // Validate whether width and height are not 0 or `NaN`
        self.validateWidthandHeight(width, adjustedHeight);

        let axis = self.getAxis(length);

        // The axis should not appear if mode is set to 'wiggle' or 'silhouette'
        if (!isWiggleOrSilhouette && self.show) {
          // Append svg and y axis
          const svg = div.append('svg')
          .attr('width', adjustedWidth)
          .attr('height', height);

          const svgAxis = svg.append('g')
          .attr('class', `axis ${self.id}`)
          .attr('transform', 'translate(' + (width - 2) + ',' + margin.top + ')')
          .call(axis);

          const container = svg.select('g.axis').node();
          if (container) {
            const cWidth = Math.max(adjustedWidth, container.getBBox().width);
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

            svgAxis.call(self.truncateLabels());
            svgAxis.call(self.rotateAxisLabels());
          }
        }
      });
    };
  };

  Axis.prototype.adjustSize = function () {
    let maxRotatedLength = 120;
    let xAxisPadding = 15;
    let svg;

    return function (selection) {
      const text = selection.selectAll('.tick text');
      const lengths = [];

      text.each(function textWidths() {
        lengths.push(d3.select(this).node().getBBox().width);
      });
      const length = _.max(lengths);
      self._attr.xAxisLabelHt = length + xAxisPadding;

      selection.select('svg')
        .attr('height', self._attr.xAxisLabelHt);
    };
  };

  /**
   * Rotate the axis tick labels within selection
   *
   * @returns {Function} Rotates x axis tick labels of a D3 selection
   */
  Axis.prototype.rotateAxisLabels = function () {
    const self = this;
    return function (selection) {
      const text = selection.selectAll('.tick text');

      if (self.labels.rotate) {
        text
          .attr('transform', function rotate(d, j) {
            // rotate around center .. maybe we should rotate around textend
            const coord = text[0][j].getBBox();
            const transX =  ((coord.x) + (coord.width / 2));
            const transY =  ((coord.y) + (coord.height / 2));
            return `rotate(${self.labels.rotate}, ${transX}, ${transY})`;
          });
      }
    };
  };

  /**
   * Returns a string that is truncated to fit size
   *
   * @method truncateLabel
   * @param text {HTMLElement}
   * @param size {Number}
   * @returns {*|jQuery}
   */
  Axis.prototype.truncateLabel = function (text, size) {
    let node = d3.select(text).node();
    let str = $(node).text();
    let width = node.getBBox().width;
    let chars = str.length;
    let pxPerChar = width / chars;
    let endChar = 0;
    let ellipsesPad = 4;

    if (width > size) {
      endChar = Math.floor((size / pxPerChar) - ellipsesPad);
      while (str[endChar - 1] === ' ' || str[endChar - 1] === '-' || str[endChar - 1] === ',') {
        endChar = endChar - 1;
      }
      str = str.substr(0, endChar) + '...';
    }
    return str;
  };

  Axis.prototype.truncateLabels = function () {
    const self = this;
    return function (selection) {
      selection.selectAll('.tick text')
        .text(function () {
          // TODO: add title to trancuated labels
          return self.truncateLabel(this, self.labels.truncate);
        });
    };
  };

  /**
   * Filter out text labels by width and position on axis
   * trims labels that would overlap each other
   * or extend past left or right edges
   * if prev label pos (or 0) + half of label width is < label pos
   * and label pos + half width  is not > width of axis
   *
   * @method filterAxisLabels
   * @returns {Function}
   */
  Axis.prototype.filterAxisLabels = function () {
    let self = this;
    let startX = 0;
    let maxW;
    let par;
    let myX;
    let myWidth;
    let halfWidth;
    let padding = 1.1;

    return function (selection) {
      selection.selectAll('.tick text')
        .text(function (d) {
          par = d3.select(this.parentNode).node();
          myX = self.xScale(d);
          myWidth = par.getBBox().width * padding;
          halfWidth = myWidth / 2;
          maxW = $(self.el).find('.x-axis-div').width();

          if ((startX + halfWidth) < myX && maxW > (myX + halfWidth)) {
            startX = myX + halfWidth;
            return self.xAxisFormatter(d);
          } else {
            d3.select(this.parentNode).remove();
          }
        });
    };
  };

  return Axis;
};
