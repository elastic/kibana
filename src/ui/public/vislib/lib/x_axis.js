import d3 from 'd3';
import $ from 'jquery';
import _ from 'lodash';
import moment from 'moment';
import VislibLibErrorHandlerProvider from 'ui/vislib/lib/_error_handler';
export default function XAxisFactory(Private) {

  const ErrorHandler = Private(VislibLibErrorHandlerProvider);

  /**
   * Adds an x axis to the visualization
   *
   * @class XAxis
   * @constructor
   * @param args {{el: (HTMLElement), xValues: (Array), ordered: (Object|*),
   * xAxisFormatter: (Function), _attr: (Object|*)}}
   */
  class XAxis extends ErrorHandler {
    constructor(args) {
      super();
      this.el = args.el;
      this.xValues = args.xValues;
      this.ordered = args.ordered;
      this.xAxisFormatter = args.xAxisFormatter;
      this.expandLastBucket = args.expandLastBucket == null ? true : args.expandLastBucket;
      this._attr = _.defaults(args._attr || {});
    }

    /**
     * Renders the x axis
     *
     * @method render
     * @returns {D3.UpdateSelection} Appends x axis to visualization
     */
    render() {
      d3.select(this.el).selectAll('.x-axis-div').call(this.draw());
    };

    /**
     * Returns d3 x axis scale function.
     * If time, return time scale, else return d3 ordinal scale for nominal data
     *
     * @method getScale
     * @returns {*} D3 scale function
     */
    getScale() {
      const ordered = this.ordered;

      if (ordered && ordered.date) {
        return d3.time.scale.utc();
      }
      return d3.scale.ordinal();
    };

    /**
     * Add domain to the x axis scale.
     * if time, return a time domain, and calculate the min date, max date, and time interval
     * else, return a nominal (d3.scale.ordinal) domain, i.e. array of x axis values
     *
     * @method getDomain
     * @param scale {Function} D3 scale
     * @returns {*} D3 scale function
     */
    getDomain(scale) {
      const ordered = this.ordered;

      if (ordered && ordered.date) {
        return this.getTimeDomain(scale, this.xValues);
      }
      return this.getOrdinalDomain(scale, this.xValues);
    };

    /**
     * Returns D3 time domain
     *
     * @method getTimeDomain
     * @param scale {Function} D3 scale function
     * @param data {Array}
     * @returns {*} D3 scale function
     */
    getTimeDomain(scale, data) {
      return scale.domain([this.minExtent(data), this.maxExtent(data)]);
    };

    minExtent(data) {
      return this._calculateExtent(data || this.xValues, 'min');
    };

    maxExtent(data) {
      return this._calculateExtent(data || this.xValues, 'max');
    };

    /**
     *
     * @param data
     * @param extent
     */
    _calculateExtent(data, extent) {
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

    /**
     * Return a nominal(d3 ordinal) domain
     *
     * @method getOrdinalDomain
     * @param scale {Function} D3 scale function
     * @param xValues {Array} Array of x axis values
     * @returns {*} D3 scale function
     */
    getOrdinalDomain(scale, xValues) {
      return scale.domain(xValues);
    };

    /**
     * Return the range for the x axis scale
     * if time, return a normal range, else if nominal, return rangeBands with a default (0.1) spacer specified
     *
     * @method getRange
     * @param scale {Function} D3 scale function
     * @param width {Number} HTML Element width
     * @returns {*} D3 scale function
     */
    getRange(domain, width) {
      const ordered = this.ordered;

      if (ordered && ordered.date) {
        return domain.range([0, width]);
      }
      return domain.rangeBands([0, width], 0.1);
    };

    /**
     * Return the x axis scale
     *
     * @method getXScale
     * @param width {Number} HTML Element width
     * @returns {*} D3 x scale function
     */
    getXScale(width) {
      const domain = this.getDomain(this.getScale());

      return this.getRange(domain, width);
    };

    /**
     * Creates d3 xAxis function
     *
     * @method getXAxis
     * @param width {Number} HTML Element width
     */
    getXAxis(width) {
      this.xScale = this.getXScale(width);

      if (!this.xScale || _.isNaN(this.xScale)) {
        throw new Error('xScale is ' + this.xScale);
      }

      this.xAxis = d3.svg.axis()
      .scale(this.xScale)
      .ticks(10)
      .tickFormat(this.xAxisFormatter)
      .orient('bottom');
    };

    /**
     * Renders the x axis
     *
     * @method draw
     * @returns {Function} Renders the x axis to a D3 selection
     */
    draw() {
      const self = this;
      this._attr.isRotated = false;

      return function (selection) {
        const n = selection[0].length;
        const parentWidth = $(self.el)
        .find('.x-axis-div-wrapper')
        .width();

        selection.each(function () {

          const div = d3.select(this);
          const width = parentWidth / n;
          const height = $(this.parentElement).height();

          self.validateWidthandHeight(width, height);

          self.getXAxis(width);

          const svg = div.append('svg')
          .attr('width', width)
          .attr('height', height);

          svg.append('g')
          .attr('class', 'x axis')
          .attr('transform', 'translate(0,0)')
          .call(self.xAxis);
        });

        selection.call(self.filterOrRotate());
      };
    };

    /**
     * Returns a function that evaluates scale type and
     * applies filter to tick labels on time scales
     * rotates and truncates tick labels on nominal/ordinal scales
     *
     * @method filterOrRotate
     * @returns {Function} Filters or rotates x axis tick labels
     */
    filterOrRotate() {
      const self = this;
      const ordered = self.ordered;

      return function (selection) {
        selection.each(function () {
          const axis = d3.select(this);
          if (ordered && ordered.date) {
            axis.call(self.filterAxisLabels());
          } else {
            axis.call(self.rotateAxisLabels());
          }
        });

        self.updateXaxisHeight();

        selection.call(self.fitTitles());

      };
    };

    /**
     * Rotate the axis tick labels within selection
     *
     * @returns {Function} Rotates x axis tick labels of a D3 selection
     */
    rotateAxisLabels() {
      const self = this;
      const barWidth = self.xScale.rangeBand();
      const maxRotatedLength = 120;
      const xAxisPadding = 15;
      const lengths = [];
      self._attr.isRotated = false;

      return function (selection) {
        const text = selection.selectAll('.tick text');

        text.each(function textWidths() {
          lengths.push(d3.select(this).node().getBBox().width);
        });
        const length = _.max(lengths);
        self._attr.xAxisLabelHt = length + xAxisPadding;

        // if longer than bar width, rotate
        if (length > barWidth) {
          self._attr.isRotated = true;
        }

        // if longer than maxRotatedLength, truncate
        if (length > maxRotatedLength) {
          self._attr.xAxisLabelHt = maxRotatedLength;
        }

        if (self._attr.isRotated) {
          text
          .text(function truncate() {
            return self.truncateLabel(this, self._attr.xAxisLabelHt);
          })
          .style('text-anchor', 'end')
          .attr('dx', '-.8em')
          .attr('dy', '-.60em')
          .attr('transform', function rotate() {
            return 'rotate(-90)';
          })
          .append('title')
          .text(text => text);

          selection.select('svg')
          .attr('height', self._attr.xAxisLabelHt);
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
    truncateLabel(text, size) {
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
    filterAxisLabels() {
      const self = this;
      let startX = 0;
      let maxW;
      let par;
      let myX;
      let myWidth;
      let halfWidth;
      const padding = 1.1;

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

    /**
     * Returns a function that adjusts axis titles and
     * chart title transforms to fit axis label divs.
     * Sets transform of x-axis-title to fit .x-axis-title div width
     * if x-axis-chart-titles, set transform of x-axis-chart-titles
     * to fit .chart-title div width
     *
     * @method fitTitles
     * @returns {Function}
     */
    fitTitles() {
      const visEls = $('.vis-wrapper');
      let xAxisChartTitle;
      let yAxisChartTitle;
      let text;
      let titles;

      return function () {

        visEls.each(function () {
          const visEl = d3.select(this);
          const $visEl = $(this);
          const xAxisTitle = $visEl.find('.x-axis-title');
          const yAxisTitle = $visEl.find('.y-axis-title');
          let titleWidth = xAxisTitle.width();
          let titleHeight = yAxisTitle.height();

          text = visEl.select('.x-axis-title')
          .select('svg')
          .attr('width', titleWidth)
          .select('text')
          .attr('transform', 'translate(' + (titleWidth / 2) + ',11)');

          text = visEl.select('.y-axis-title')
          .select('svg')
          .attr('height', titleHeight)
          .select('text')
          .attr('transform', 'translate(11,' + (titleHeight / 2) + ')rotate(-90)');

          if ($visEl.find('.x-axis-chart-title').length) {
            xAxisChartTitle = $visEl.find('.x-axis-chart-title');
            titleWidth = xAxisChartTitle.find('.chart-title').width();

            titles = visEl.select('.x-axis-chart-title').selectAll('.chart-title');
            titles.each(function () {
              text = d3.select(this)
              .select('svg')
              .attr('width', titleWidth)
              .select('text')
              .attr('transform', 'translate(' + (titleWidth / 2) + ',11)');
            });
          }

          if ($visEl.find('.y-axis-chart-title').length) {
            yAxisChartTitle = $visEl.find('.y-axis-chart-title');
            titleHeight = yAxisChartTitle.find('.chart-title').height();

            titles = visEl.select('.y-axis-chart-title').selectAll('.chart-title');
            titles.each(function () {
              text = d3.select(this)
              .select('svg')
              .attr('height', titleHeight)
              .select('text')
              .attr('transform', 'translate(11,' + (titleHeight / 2) + ')rotate(-90)');
            });
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
    updateXaxisHeight() {
      const selection = d3.select(this.el).selectAll('.vis-wrapper');

      selection.each(function () {
        const visEl = d3.select(this);

        if (visEl.select('.inner-spacer-block').node() === null) {
          visEl.select('.y-axis-spacer-block')
          .append('div')
          .attr('class', 'inner-spacer-block');
        }
        const xAxisHt = visEl.select('.x-axis-wrapper').style('height');

        visEl.select('.inner-spacer-block').style('height', xAxisHt);
      });

    };
  }

  return XAxis;
};
