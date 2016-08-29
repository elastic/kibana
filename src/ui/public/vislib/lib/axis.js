import d3 from 'd3';
import _ from 'lodash';
import $ from 'jquery';
import moment from 'moment';
import errors from 'ui/errors';
import VislibErrorHandlerProvider from 'ui/vislib/lib/_error_handler';
import VislibAxisTitleProvider from 'ui/vislib/lib/axis_title';

export default function AxisFactory(Private) {
  const ErrorHandler = Private(VislibErrorHandlerProvider);
  const AxisTitle = Private(VislibAxisTitleProvider);
  const defaults = {
    show: true,
    type: 'value',
    elSelector: '.axis-wrapper-{pos} .axis-div',
    position: 'left',
    axisFormatter: null, // TODO: create default axis formatter
    scale: 'linear',
    expandLastBucket: true, //TODO: rename ... bucket has nothing to do with vis
    labels: {
      show: true,
      rotate: 0,
      rotateAnchor: 'center',
      filter: false,
      color: 'black',
      font: '"Open Sans", "Lato", "Helvetica Neue", Helvetica, Arial, sans-serif', // TODO
      fontSize: '8pt',
      truncate: 100
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

  const categoryDefaults = {
    type: 'category',
    position: 'bottom',
    labels: {
      rotate: 0,
      rotateAnchor: 'end',
      filter: true
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
    if (args.type === 'category') {
      _.extend(this, defaults, categoryDefaults, args);
    } else {
      _.extend(this, defaults, args);
    }


    if (this.axisTitle) {
      this.axisTitle = new AxisTitle(this, this.axisTitle);
    }
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
    this.elSelector = this.elSelector.replace('{pos}', this.position);

    // horizontal axis with ordinal scale should have labels rotated (so we can fit more)
    if (this._isHorizontal() && this._isOrdinal()) {
      this.labels.filter = args.labels && args.labels.filter ? args.labels.filter :  false;
      this.labels.rotate = args.labels && args.labels.rotate ? args.labels.rotate : 70;
    }
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

  Axis.prototype._isHorizontal = function () {
    return (this.position === 'top' || this.position === 'bottom');
  };

  Axis.prototype._isOrdinal = function () {
    return !!this.values && (!this.ordered || !this.ordered.date);
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
  Axis.prototype.getTimeDomain = function (data) {
    return [this.minExtent(data), this.maxExtent(data)];
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
    const ordered = this.ordered;
    const opts = [ordered[extent]];

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

  Axis.prototype._getExtents = function (domain) {
    const [min, max] = domain;

    if (this.ordered && this.ordered.date) return this.getTimeDomain(this.values);
    if (this._isOrdinal()) return this.values;
    if (this._isUserDefined()) return this._validateUserExtents(domain);
    if (this._isYExtents()) return domain;
    if (this._attr.scale === 'log') return this._logDomain(min, max); // Negative values cannot be displayed with a log scale.
    return [Math.min(0, min), Math.max(0, max)];
  };

  Axis.prototype._getRange = function (length) {
    if (this._isHorizontal()) {
      return !this.inverted ? [0, length] : [length, 0];
    } else {
      return this.inverted ? [0, length] : [length, 0];
    }
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
    if (this._isOrdinal()) return d3.scale.ordinal();
    if (typeof d3.scale[fnName] !== 'function') return this._throwCustomError('Axis.getScaleType: ' + fnName + ' is not a function');

    return d3.scale[fnName]();
  };

  /**
   * Creates the d3 y scale function
   *
   * @method getscale
   * @param length {Number} DOM Element height
   * @returns {D3.Scale.QuantitiveScale|*} D3 scale function
   */
  Axis.prototype.getScale = function (length) {
    // TODO: should receive size (width, height) and decide based on the position
    const scale = this._getScaleType(this._attr.scale);
    const domain = this._getExtents(this.domain);
    const range = this._getRange(length);
    this.scale = scale.domain(domain);
    if (this._isOrdinal()) {
      this.scale.rangeBands(range, 0.1);
    } else {
      this.scale.range(range);
    }

    if (!this._isUserDefined() && !this._isOrdinal()) this.scale.nice(); // round extents when not user defined
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

  Axis.prototype.getLength = function (el, n) {
    if (this._isHorizontal()) {
      return $(el).parent().width() / n - this._attr.margin.left - this._attr.margin.right;
    }
    return $(el).parent().height() / n - this._attr.margin.top - this._attr.margin.bottom;
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
    let n;

    return function (selection) {
      n = selection[0].length;
      if (self.axisTitle) {
        //self.axisTitle.render(selection);
      }
      selection.each(function () {
        const el = this;
        const div = d3.select(el);
        const width = $(el).parent().width();
        const height = $(el).height();
        let length = self.getLength(el, n);
        let adjustedHeight = height - margin.top - margin.bottom;
        let adjustedWidth = width + margin.left + margin.right + 50;
        if (self._isHorizontal()) {
          adjustedWidth /= n;
        } else {
          adjustedHeight /= n;
        }

        // Validate whether width and height are not 0 or `NaN`
        self.validateWidthandHeight(adjustedWidth, adjustedHeight);

        let axis = self.getAxis(length);

        // The axis should not appear if mode is set to 'wiggle' or 'silhouette'
        if (!isWiggleOrSilhouette && self.show) {
          // Append svg and y axis
          const svg = div.append('svg')
          .attr('width', adjustedWidth)
          .attr('height', height);

          const svgAxis = svg.append('g')
          .attr('class', `axis ${self.id}`)
          .call(axis);

          const container = svg.select('g.axis').node();
          if (container) {
            const cWidth = Math.max(adjustedWidth, container.getBBox().width);
            svg.select('path')
            .attr('style', `stroke: ${self.style.color}; stroke-width: ${self.style.lineWidth}; stroke-opacity: ${self.style.opacity}`);
            svg.selectAll('line')
            .attr('style', `stroke: ${self.style.tickColor}; stroke-width: ${self.style.tickWidth}; stroke-opacity: ${self.style.opacity}`);
            // TODO: update to be depenent on position ...
            //.attr('x1', -parseInt(self.style.lineWidth) / 2)
            //.attr('x2', -parseInt(self.style.lineWidth) / 2 - parseInt(self.style.tickLength));

            svg.selectAll('text')
            .attr('style', function () {
              const currentStyle = d3.select(this).attr('style');
              return `${currentStyle} font-size: ${self.labels.fontSize};`;
            });
            //.attr('x', -3 - parseInt(self.style.lineWidth) / 2 - parseInt(self.style.tickLength));
            if (!self.labels.show) svg.selectAll('test').attr('style', 'display: none;');

            svgAxis.call(self.truncateLabels());
            svgAxis.call(self.rotateAxisLabels());
            svgAxis.call(self.filterAxisLabels());
            svg.call(self.adjustSize());

            //svgAxis.call(self.fitTitles());
          }
        }
      });
    };
  };

  /**
   * Appends div to make .y-axis-spacer-block
   * match height of .x-axis-wrapper
   *
   * @method updateXaxisHeight
   */
  Axis.prototype.updateXaxisHeight = function (height) {
    const self = this;
    const selection = d3.select(this.vis.el).selectAll('.vis-wrapper');


    selection.each(function () {
      const visEl = d3.select(this);

      if (visEl.select('.inner-spacer-block').node() === null) {
        visEl.selectAll('.y-axis-spacer-block')
          .append('div')
          .attr('class', 'inner-spacer-block');
      }

      visEl.selectAll(`.y-axis-spacer-block-${self.position} .inner-spacer-block`).style('height', `${height}px`);
    });

  };

  Axis.prototype.adjustSize = function () {
    const self = this;
    const xAxisPadding = 15;

    return function (selection) {
      const text = selection.selectAll('.tick text');
      const lengths = [];

      text.each(function textWidths() {
        lengths.push((() => {
          if (self._isHorizontal()) {
            return d3.select(this.parentNode).node().getBBox().height;
          } else {
            return d3.select(this.parentNode).node().getBBox().width;
          }
        })());
      });
      const length = _.max(lengths);

      if (self._isHorizontal()) {
        selection.attr('height', length);
        self.updateXaxisHeight(length + xAxisPadding);
        if (self.position === 'top') {
          selection.select('g')
            .attr('transform', `translate(0, ${length - parseInt(self.style.lineWidth)})`);
          selection.select('path')
            .attr('transform', 'translate(1,0)');
        }
      } else {
        selection.attr('width', length);
        if (self.position === 'left') {
          selection.select('g')
            .attr('transform', `translate(${length - 2 - parseInt(self.style.lineWidth)},${self._attr.margin.top})`);
        }
      }
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
          .style('text-anchor', function () {
            return self.labels.rotateAnchor === 'center' ? 'center' : 'end';
          })
          .attr('dy', function () {
            if (self._isHorizontal()) {
              if (self.position === 'top') return '-0.9em';
              else return '0.3em';
            }
            return '0';
          })
          .attr('dx', function () {
            return self._isHorizontal() ? '-0.9em' : '0';
          })
          .attr('transform', function rotate(d, j) {
            if (self.labels.rotateAnchor === 'center') {
              const coord = text[0][j].getBBox();
              const transX =  ((coord.x) + (coord.width / 2));
              const transY =  ((coord.y) + (coord.height / 2));
              return `rotate(${self.labels.rotate}, ${transX}, ${transY})`;
            } else {
              const rotateDeg = self.position === 'top' ? self.labels.rotate : -self.labels.rotate;
              return `rotate(${rotateDeg})`;
            }
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
    const node = d3.select(text).node();
    let str = $(node).text();
    const width = node.getBBox().width;
    const chars = str.length;
    const pxPerChar = width / chars;
    let endChar = 0;
    const ellipsesPad = 4;

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
    const self = this;
    let startX = 0;
    let maxW;
    let par;
    let myX;
    let myWidth;
    let halfWidth;
    let padding = 1.1;

    return function (selection) {
      if (!self.labels.filter) return;

      selection.selectAll('.tick text')
        .text(function (d) {
          par = d3.select(this.parentNode).node();
          myX = self.scale(d);
          myWidth = par.getBBox().width * padding;
          halfWidth = myWidth / 2;
          maxW = $(self.vis.el).find(self.elSelector).width();

          if ((startX + halfWidth) < myX && maxW > (myX + halfWidth)) {
            startX = myX + halfWidth;
            return self.axisFormatter(d);
          } else {
            d3.select(this.parentNode).remove();
          }
        });
    };
  };

  return Axis;
};
