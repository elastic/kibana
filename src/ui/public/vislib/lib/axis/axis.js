import d3 from 'd3';
import _ from 'lodash';
import $ from 'jquery';
import { VislibLibErrorHandlerProvider } from '../_error_handler';
import { VislibLibAxisTitleProvider } from './axis_title';
import { VislibAxisLabelsProvider } from './axis_labels';
import { VislibAxisScaleProvider } from './axis_scale';
import { VislibLibAxisConfigProvider } from './axis_config';
import { VislibError } from 'ui/errors';

export function VislibLibAxisProvider(Private) {
  const ErrorHandler = Private(VislibLibErrorHandlerProvider);
  const AxisTitle = Private(VislibLibAxisTitleProvider);
  const AxisLabels = Private(VislibAxisLabelsProvider);
  const AxisScale = Private(VislibAxisScaleProvider);
  const AxisConfig = Private(VislibLibAxisConfigProvider);

  class Axis extends ErrorHandler {
    constructor(visConfig, axisConfigArgs) {
      super();
      this.visConfig = visConfig;

      this.axisConfig = new AxisConfig(this.visConfig, axisConfigArgs);
      if (this.axisConfig.get('type') === 'category') {
        this.values = this.axisConfig.values;
        this.ordered = this.axisConfig.ordered;
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

      const stackedMode = ['normal', 'grouped'].includes(this.axisConfig.get('scale.mode'));
      if (stackedMode) {
        this.stack = this._stackNegAndPosVals;
      }
    }

    _stackNegAndPosVals(data) {
      const cache = {};
      data.forEach(series => {
        series.forEach(value => {
          if (!cache[value.x]) cache[value.x] = [0, 0];
          value.y0 = cache[value.x][value.y < 0 ? 0 : 1];
          cache[value.x][value.y < 0 ? 0 : 1] += value.y;
        });
      });
      return data;
    }

    render() {
      const elSelector = this.axisConfig.get('elSelector');
      const rootEl = this.axisConfig.get('rootEl');
      d3.select(rootEl).selectAll(elSelector).call(this.draw());
    }

    destroy() {
      const elSelector = this.axisConfig.get('elSelector');
      const rootEl = this.axisConfig.get('rootEl');
      $(rootEl).find(elSelector).find('svg').remove();
      this.axisTitle.destroy();
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

    getLength(el) {
      if (this.axisConfig.isHorizontal()) {
        return $(el).width();
      } else {
        return $(el).height();
      }
    }

    adjustSize() {
      const config = this.axisConfig;
      const style = config.get('style');
      const chartEl = this.visConfig.get('el');
      const position = config.get('position');
      const axisPadding = 5;

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
        let length = lengths.length > 0 ? _.max(lengths) : 0;
        length += axisPadding;

        if (config.isHorizontal()) {
          selection.attr('height', Math.ceil(length));
          if (position === 'top') {
            selection.select('g')
            .attr('transform', `translate(0, ${length - parseInt(style.lineWidth)})`);
            selection.select('path')
            .attr('transform', 'translate(1,0)');
          }
          if (config.get('type') === 'value') {
            const spacerNodes = $(chartEl).find(`.y-axis-spacer-block-${position}`);
            const elHeight = $(chartEl).find(`.axis-wrapper-${position}`).height();
            spacerNodes.height(elHeight);
          }
        } else {
          const axisWidth = Math.ceil(length);
          selection.attr('width', axisWidth);
          if (position === 'left') {
            selection.select('g')
            .attr('transform', `translate(${axisWidth},0)`);
          }
        }
      };
    }

    validate() {
      if (this.axisConfig.isLogScale() && this.axisConfig.isPercentage()) {
        throw new VislibError(`Can't mix percentage mode with log scale.`);
      }
    }

    draw() {
      const svgs = [];
      const self = this;
      const config = this.axisConfig;
      const style = config.get('style');

      return function (selection) {
        const n = selection[0].length;
        if (config.get('show') && self.axisTitle && ['left', 'top'].includes(config.get('position'))) {
          self.axisTitle.render(selection);
        }
        selection.each(function () {
          const el = this;
          const div = d3.select(el);
          const width = $(el).width();
          const height = $(el).height();
          const length = self.getLength(el, n);

          self.validate();

          const axis = self.getAxis(length);

          if (config.get('show')) {
            const svg = div.append('svg')
            .attr('width', width)
            .attr('height', height);

            svgs.push(svg);

            const axisClass = self.axisConfig.isHorizontal() ? 'x' : 'y';
            svg.append('g')
            .attr('class', `${axisClass} axis ${config.get('id')}`)
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
          }
        });

        if (self.axisTitle && ['right', 'bottom'].includes(config.get('position'))) {
          self.axisTitle.render(selection);
        }

        svgs.forEach(svg => svg.call(self.adjustSize()));
      };
    }
  }

  return Axis;
}
