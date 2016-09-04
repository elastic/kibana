import d3 from 'd3';
import _ from 'lodash';
import $ from 'jquery';
import VislibErrorHandlerProvider from 'ui/vislib/lib/_error_handler';
import VislibAxisTitleProvider from 'ui/vislib/lib/axis_title';
import VislibAxisLabelsProvider from 'ui/vislib/lib/axis_labels';
import VislibAxisScaleProvider from 'ui/vislib/lib/axis_scale';

export default function AxisFactory(Private) {
  const ErrorHandler = Private(VislibErrorHandlerProvider);
  const AxisTitle = Private(VislibAxisTitleProvider);
  const AxisLabels = Private(VislibAxisLabelsProvider);
  const AxisScale = Private(VislibAxisScaleProvider);
  const defaults = {
    show: true,
    type: 'value',
    elSelector: '.axis-wrapper-{pos} .axis-div',
    position: 'left',
    axisFormatter: null, // TODO: create default axis formatter
    scale: 'linear',
    expandLastBucket: true, //TODO: rename ... bucket has nothing to do with vis
    inverted: false,
    style: {
      color: '#ddd',
      lineWidth: '1px',
      opacity: 1,
      tickColor: '#ddd',
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
  class Axis extends ErrorHandler {
    constructor(args) {
      super();
      if (args.type === 'category') {
        _.extend(this, defaults, categoryDefaults, args);
      } else {
        _.extend(this, defaults, args);
      }

      this._attr = args.vis._attr;
      this.elSelector = this.elSelector.replace('{pos}', this.position);
      this.scale = new AxisScale(this, {scale: this.scale});
      this.axisTitle = new AxisTitle(this, this.axisTitle);
      this.axisLabels = new AxisLabels(this, this.labels);
    }

    render() {
      d3.select(this.vis.el).selectAll(this.elSelector).call(this.draw());
    }

    isHorizontal() {
      return (this.position === 'top' || this.position === 'bottom');
    }

    getAxis(length) {
      const scale = this.scale.getScale(length);

      return d3.svg.axis()
        .scale(scale)
        .tickFormat(this.tickFormat(this.domain))
        .ticks(this.tickScale(length))
        .orient(this.position);
    }

    getScale() {
      return this.scale.scale;
    }

    addInterval(interval) {
      return this.scale.addInterval(interval);
    }

    substractInterval(interval) {
      return this.scale.substractInterval(interval);
    }

    tickScale(length) {
      // TODO: should accept size and decide based on position which one to use (width, height)
      const yTickScale = d3.scale.linear()
        .clamp(true)
        .domain([20, 40, 1000])
        .range([0, 3, 11]);

      return Math.ceil(yTickScale(length));
    }

    tickFormat() {
      if (this.axisFormatter) return this.axisFormatter;
      if (this.isPercentage()) return d3.format('%');
      return d3.format('n');
    }

    getLength(el, n) {
      if (this.isHorizontal()) {
        return $(el).parent().width() / n - this._attr.margin.left - this._attr.margin.right - 50;
      }
      return $(el).parent().height() / n - this._attr.margin.top - this._attr.margin.bottom;
    }

    updateXaxisHeight() {
      const self = this;
      const selection = d3.select(this.vis.el).selectAll('.vis-wrapper');


      selection.each(function () {
        const visEl = d3.select(this);

        if (visEl.select('.inner-spacer-block').node() === null) {
          visEl.selectAll('.y-axis-spacer-block')
            .append('div')
            .attr('class', 'inner-spacer-block');
        }

        const height = visEl.select(`.axis-wrapper-${self.position}`).style('height');
        visEl.selectAll(`.y-axis-spacer-block-${self.position} .inner-spacer-block`).style('height', height);
      });
    }

    adjustSize() {
      const self = this;
      const xAxisPadding = 15;

      return function (selection) {
        const text = selection.selectAll('.tick text');
        const lengths = [];

        text.each(function textWidths() {
          lengths.push((() => {
            if (self.isHorizontal()) {
              return d3.select(this.parentNode).node().getBBox().height;
            } else {
              return d3.select(this.parentNode).node().getBBox().width;
            }
          })());
        });
        const length = _.max(lengths);

        if (self.isHorizontal()) {
          selection.attr('height', length);
          self.updateXaxisHeight();
          if (self.position === 'top') {
            selection.select('g')
              .attr('transform', `translate(0, ${length - parseInt(self.style.lineWidth)})`);
            selection.select('path')
              .attr('transform', 'translate(1,0)');
          }
        } else {
          selection.attr('width', length + xAxisPadding);
          if (self.position === 'left') {
            selection.select('g')
              .attr('transform', `translate(${length + xAxisPadding - 2 - parseInt(self.style.lineWidth)},${self._attr.margin.top})`);
          }
        }
      };
    }

    draw() {
      const self = this;
      const margin = this.vis._attr.margin;
      const mode = this._attr.mode;

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

          // The axis should not appear if mode is set to 'wiggle' or 'silhouette'
          if (self.show) {
            // Append svg and y axis
            const svg = div.append('svg')
              .attr('width', width)
              .attr('height', height);


            svg.append('g')
              .attr('class', `axis ${self.id}`)
              .call(axis);

            const container = svg.select('g.axis').node();
            if (container) {
              svg.select('path')
              .style('stroke', self.style.color)
              .style('stroke-width', self.style.lineWidth)
              .style('stroke-opacity', self.style.opacity);
              svg.selectAll('line')
              .style('stroke', self.style.tickColor)
              .style('stroke-width', self.style.tickWidth)
              .style('stroke-opacity', self.style.opacity);
              // TODO: update to be depenent on position ...
              //.attr('x1', -parseInt(self.style.lineWidth) / 2)
              //.attr('x2', -parseInt(self.style.lineWidth) / 2 - parseInt(self.style.tickLength));

              if (self.axisLabels) self.axisLabels.render(svg);
              svg.call(self.adjustSize());
            }
          }
        });
      };
    }
  }

  return Axis;
};
