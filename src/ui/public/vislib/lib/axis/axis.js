import d3 from 'd3';
import _ from 'lodash';
import $ from 'jquery';
import ErrorHandlerProvider from 'ui/vislib/lib/_error_handler';
import AxisTitleProvider from 'ui/vislib/lib/axis/axis_title';
import AxisLabelsProvider from 'ui/vislib/lib/axis/axis_labels';
import AxisScaleProvider from 'ui/vislib/lib/axis/axis_scale';
import AxisConfigProvider from 'ui/vislib/lib/axis/axis_config';

export default function AxisFactory(Private) {
  const ErrorHandler = Private(ErrorHandlerProvider);
  const AxisTitle = Private(AxisTitleProvider);
  const AxisLabels = Private(AxisLabelsProvider);
  const AxisScale = Private(AxisScaleProvider);
  const AxisConfig = Private(AxisConfigProvider);

  class Axis extends ErrorHandler {
    constructor(visConfig, axisConfigArgs) {
      super();
      this.visConfig = visConfig;

      this.axisConfig = new AxisConfig(this.visConfig, axisConfigArgs);
      if (this.axisConfig.get('type') === 'category') {
        this.values = this.visConfig.data.xValues();
        this.ordered = this.visConfig.data.get('ordered');
      }
      this.axisScale = new AxisScale(this.axisConfig, visConfig);
      this.axisTitle = new AxisTitle(this.axisConfig);
      this.axisLabels = new AxisLabels(this.axisConfig, this.axisScale);

      this.stack = d3.layout.stack()
      .x(d => {
        return d.x;
      })
      .y(d => {
        if (this.axisConfig.get('scale.offset') === 'expand') {
          return Math.abs(d.y);
        }
        return d.y;
      })
      .offset(this.axisConfig.get('scale.offset', 'zero'));

      if (this.axisConfig.get('scale.mode') === 'stacked'/* && visConfigArgs.type === 'histogram'*/) {
        this.stack.out((d, y0, y) => {
          return this._stackNegAndPosVals(d, y0, y);
        });
      }
    }

    /**
     * Returns true for positive numbers
     */
    _isPositive(num) {
      return num >= 0;
    };

    /**
     * Returns true for negative numbers
     */
    _isNegative(num) {
      return num < 0;
    };

    /**
     * Adds two input values
     */
    _addVals(a, b) {
      return a + b;
    };

    /**
     * Returns the results of the addition of numbers in a filtered array.
     */
    _sumYs(arr, callback) {
      const filteredArray = arr.filter(callback);

      return (filteredArray.length) ? filteredArray.reduce(this._addVals) : 0;
    };

    /**
     * Calculates the d.y0 value for stacked data in D3.
     */
    _calcYZero(y, arr) {
      if (y >= 0) return this._sumYs(arr, this._isPositive);
      return this._sumYs(arr, this._isNegative);
    };

    _getCounts(i, j) {
      const data = this.visConfig.data.chartData();
      const dataLengths = {};

      dataLengths.charts = data.length;
      dataLengths.stacks = dataLengths.charts ? data[i].series.length : 0;
      dataLengths.values = dataLengths.stacks ? data[i].series[j].values.length : 0;

      return dataLengths;
    };

    _createCache() {
      const cache = {
        index: {
          chart: 0,
          stack: 0,
          value: 0
        },
        yValsArr: []
      };

      cache.count = this._getCounts(cache.index.chart, cache.index.stack);

      return cache;
    };
    /**
     * Stacking function passed to the D3 Stack Layout `.out` API.
     * See: https://github.com/mbostock/d3/wiki/Stack-Layout
     * It is responsible for calculating the correct d.y0 value for
     * mixed datasets containing both positive and negative values.
     */
    _stackNegAndPosVals(d, y0, y) {
      const data = this.visConfig.data.chartData();

      // Storing counters and data characteristics needed to stack values properly
      if (!this._cache) {
        this._cache = this._createCache();
      }

      d.y0 = this._calcYZero(y, this._cache.yValsArr);
      ++this._cache.index.stack;


      // last stack, or last value, reset the stack count and y value array
      const lastStack = (this._cache.index.stack >= this._cache.count.stacks);
      if (lastStack) {
        this._cache.index.stack = 0;
        ++this._cache.index.value;
        this._cache.yValsArr = [];
        // still building the stack collection, push v value to array
      } else if (y !== 0) {
        this._cache.yValsArr.push(y);
      }

      // last value, prepare for the next chart, if one exists
      const lastValue = (this._cache.index.value >= this._cache.count.values);
      if (lastValue) {
        this._cache.index.value = 0;
        ++this._cache.index.chart;

        // no more charts, reset the queue and finish
        if (this._cache.index.chart >= this._cache.count.charts) {
          this._cache = this._createCache();
          return;
        }

        // get stack and value count for next chart
        const chartSeries = data[this._cache.index.chart].series;
        this._cache.count.stacks = chartSeries.length;
        this._cache.count.values = chartSeries.length ? chartSeries[this._cache.index.stack].values.length : 0;
      }
    };

    render() {
      const elSelector = this.axisConfig.get('elSelector');
      const rootEl = this.axisConfig.get('rootEl');
      d3.select(rootEl).selectAll(elSelector).call(this.draw());
    }

    getAxis(length) {
      const scale = this.axisScale.getScale(length);
      const position = this.axisConfig.get('position');
      const axisFormatter = this.axisConfig.get('labels.axisFormatter');

      return d3.svg.axis()
      .scale(scale)
      .tickFormat(axisFormatter)
      .ticks(this.tickScale(length))
      .orient(position);
    }

    getScale() {
      return this.axisScale.scale;
    }

    addInterval(interval) {
      return this.axisScale.addInterval(interval);
    }

    substractInterval(interval) {
      return this.axisScale.substractInterval(interval);
    }

    tickScale(length) {
      const yTickScale = d3.scale.linear()
      .clamp(true)
      .domain([20, 40, 1000])
      .range([0, 3, 11]);

      return Math.ceil(yTickScale(length));
    }

    getLength(el, n) {
      const margin = this.visConfig.get('style.margin');
      if (this.axisConfig.isHorizontal()) {
        return $(el).parent().width() / n - margin.left - margin.right - 50;
      }
      return $(el).parent().height() / n - margin.top - margin.bottom;
    }

    updateXaxisHeight() {
      const el = this.axisConfig.get('rootEl');
      const position = this.axisConfig.get('position');
      const selection = d3.select(el).selectAll('.vis-wrapper');

      selection.each(function () {
        const visEl = d3.select(this);

        if (visEl.select('.inner-spacer-block').node() === null) {
          visEl.selectAll('.y-axis-spacer-block')
          .append('div')
          .attr('class', 'inner-spacer-block');
        }

        const height = visEl.select(`.axis-wrapper-${position}`).style('height');
        visEl.selectAll(`.y-axis-spacer-block-${position} .inner-spacer-block`).style('height', height);
      });
    }

    adjustSize() {
      const self = this;
      const config = this.axisConfig;
      const xAxisPadding = 15;
      const style = config.get('style');
      const margin = this.visConfig.get('style.margin');
      const position = config.get('position');

      return function (selection) {
        const text = selection.selectAll('.tick text');
        const lengths = [];

        text.each(function textWidths() {
          lengths.push((() => {
            if (config.isHorizontal()) {
              return d3.select(this.parentNode).node().getBBox().height;
            } else {
              return d3.select(this.parentNode).node().getBBox().width;
            }
          })());
        });
        const length = lengths.length > 0 ? _.max(lengths) : 0;

        if (config.isHorizontal()) {
          selection.attr('height', length);
          self.updateXaxisHeight();
          if (position === 'top') {
            selection.select('g')
            .attr('transform', `translate(0, ${length - parseInt(style.lineWidth)})`);
            selection.select('path')
            .attr('transform', 'translate(1,0)');
          }
        } else {
          selection.attr('width', length + xAxisPadding);
          if (position === 'left') {
            const translateWidth = length + xAxisPadding - 2 - parseInt(style.lineWidth);
            selection.select('g')
            .attr('transform', `translate(${translateWidth},${margin.top})`);
          }
        }
      };
    }

    draw() {
      const self = this;
      const config = this.axisConfig;
      const style = config.get('style');

      return function (selection) {
        const n = selection[0].length;
        if (self.axisTitle) {
          self.axisTitle.render(selection);
        }
        selection.each(function () {
          const el = this;
          const div = d3.select(el);
          const width = $(el).parent().width();
          const height = $(el).height();
          const length = self.getLength(el, n);

          // Validate whether width and height are not 0 or `NaN`
          self.validateWidthandHeight(width, height);

          const axis = self.getAxis(length);

          if (config.get('show')) {
            const svg = div.append('svg')
            .attr('width', width)
            .attr('height', height);

            svg.append('g')
            .attr('class', `axis ${config.get('id')}`)
            .call(axis);

            const container = svg.select('g.axis').node();
            if (container) {
              svg.select('path')
              .style('stroke', style.color)
              .style('stroke-width', style.lineWidth)
              .style('stroke-opacity', style.opacity);
              svg.selectAll('line')
              .style('stroke', style.tickColor)
              .style('stroke-width', style.tickWidth)
              .style('stroke-opacity', style.opacity);
            }
            if (self.axisLabels) self.axisLabels.render(svg);
            svg.call(self.adjustSize());
          }
        });
      };
    }
  }

  return Axis;
};
