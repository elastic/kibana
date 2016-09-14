import d3 from 'd3';
import _ from 'lodash';
import $ from 'jquery';
import ErrorHandlerProvider from 'ui/vislib/lib/_error_handler';
import AxisTitleProvider from 'ui/vislib/lib/axis_title';
import AxisLabelsProvider from 'ui/vislib/lib/axis_labels';
import AxisScaleProvider from 'ui/vislib/lib/axis_scale';
import AxisConfigProvider from 'ui/vislib/lib/axis_config';

export default function AxisFactory(Private) {
  const ErrorHandler = Private(ErrorHandlerProvider);
  const AxisTitle = Private(AxisTitleProvider);
  const AxisLabels = Private(AxisLabelsProvider);
  const AxisScale = Private(AxisScaleProvider);
  const AxisConfig = Private(AxisConfigProvider);

  class Axis extends ErrorHandler {
    constructor(args) {
      super();
      this.data = args.data;
      this.config = new AxisConfig(args);
      if (this.config.get('type') === 'category') {
        this.values = this.data.xValues();
        this.ordered = this.data.get('ordered');
      }
      this.axisScale = new AxisScale(this.config, this.data);
      this.axisTitle = new AxisTitle(this.config);
      this.axisLabels = new AxisLabels(this.config, this.axisScale);
    }

    render() {
      const elSelector = this.config.get('elSelector');
      const rootEl = this.config.get('rootEl');
      d3.select(rootEl).selectAll(elSelector).call(this.draw());
    }

    getAxis(length) {
      const scale = this.axisScale.getScale(length);
      const position = this.config.get('position');
      return d3.svg.axis()
      .scale(scale)
      .tickFormat(this.tickFormat(this.domain))
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

    tickFormat() {
      if (this.config.get('labels.axisFormatter')) return this.config.get('labels.axisFormatter');
      if (this.config.isPercentage()) return d3.format('%');
      return d3.format('n');
    }

    getLength(el, n) {
      const margin = this.config.get('vis._attr.margin');
      if (this.config.isHorizontal()) {
        return $(el).parent().width() / n - margin.left - margin.right - 50;
      }
      return $(el).parent().height() / n - margin.top - margin.bottom;
    }

    updateXaxisHeight() {
      const self = this;
      const position = this.config.get('position');
      const selection = d3.select(this.config.get('rootEl')).selectAll('.vis-wrapper');

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
      const xAxisPadding = 15;
      const style = this.config.get('style');
      const margin = this.config.get('vis._attr.margin');
      const position = this.config.get('position');

      return function (selection) {
        const text = selection.selectAll('.tick text');
        const lengths = [];

        text.each(function textWidths() {
          lengths.push((() => {
            if (self.config.isHorizontal()) {
              return d3.select(this.parentNode).node().getBBox().height;
            } else {
              return d3.select(this.parentNode).node().getBBox().width;
            }
          })());
        });
        const length = lengths.length > 0 ? _.max(lengths) : 0;

        if (self.config.isHorizontal()) {
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
      const config = this.config;
      const style = config.style;

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
              // TODO: update to be depenent on position ...
              //.attr('x1', -parseInt(style.lineWidth) / 2)
              //.attr('x2', -parseInt(style.lineWidth) / 2 - parseInt(style.tickLength));

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
