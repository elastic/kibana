import d3 from 'd3';
import _ from 'lodash';
import $ from 'jquery';
import { ContainerTooSmall } from 'ui/errors';
import TooltipProvider from 'ui/vis/components/tooltip';
import VislibVisualizationsChartProvider from './_chart';
import VislibVisualizationsTimeMarkerProvider from './time_marker';
import VislibVisualizationsSeriTypesProvider from './point_series/series_types';

export default function PointSeriesFactory(Private) {

  const Chart = Private(VislibVisualizationsChartProvider);
  const Tooltip = Private(TooltipProvider);
  const TimeMarker = Private(VislibVisualizationsTimeMarkerProvider);
  const seriTypes = Private(VislibVisualizationsSeriTypesProvider);
  const touchdownTmpl = _.template(require('../partials/touchdown.tmpl.html'));
  /**
   * Line Chart Visualization
   *
   * @class PointSeries
   * @constructor
   * @extends Chart
   * @param handler {Object} Reference to the Handler Class Constructor
   * @param el {HTMLElement} HTML element to which the chart will be appended
   * @param chartData {Object} Elasticsearch query results for this specific chart
   */
  class PointSeries extends Chart {
    constructor(handler, chartEl, chartData) {
      super(handler, chartEl, chartData);

      this.handler = handler;
      this.chartData = chartData;
      this.chartEl = chartEl;
      this.chartConfig = this.findChartConfig();
      this.handler.pointSeries = this;
    }

    findChartConfig() {
      const charts = this.handler.visConfig.get('charts');
      const chartIndex = this.handler.data.chartData().indexOf(this.chartData);
      return charts[chartIndex];
    }

    addBackground(svg, width, height) {
      const startX = 0;
      const startY = 0;

      return svg
      .append('rect')
      .attr('x', startX)
      .attr('y', startY)
      .attr('width', width)
      .attr('height', height)
      .attr('fill', 'transparent')
      .attr('class', 'background');
    }

    addGrid(svg) {
      const { width, height } = svg.node().getBBox();
      return svg
        .append('g')
        .attr('class', 'grid')
        .call(this.handler.grid.draw(width, height));
    }

    addClipPath(svg) {
      const { width, height } = svg.node().getBBox();
      const startX = 0;
      const startY = 0;
      this.clipPathId = 'chart-area' + _.uniqueId();

      // Creating clipPath
      return svg
      .append('clipPath')
      .attr('id', this.clipPathId)
      .append('rect')
      .attr('x', startX)
      .attr('y', startY)
      .attr('width', width)
      .attr('height', height);
    }

    addEvents(svg) {
      const isBrushable = this.events.isBrushable();
      if (isBrushable) {
        const brush = this.events.addBrushEvent(svg);
        return svg.call(brush);
      }
    }

    createEndZones(svg) {
      const self = this;
      const xAxis = this.handler.categoryAxes[0];
      const xScale = xAxis.getScale();
      const ordered = xAxis.ordered;
      const isHorizontal = xAxis.axisConfig.isHorizontal();
      const missingMinMax = !ordered || _.isUndefined(ordered.min) || _.isUndefined(ordered.max);

      if (missingMinMax || ordered.endzones === false) return;

      const { width, height } = svg.node().getBBox();

      // we don't want to draw endzones over our min and max values, they
      // are still a part of the dataset. We want to start the endzones just
      // outside of them so we will use these values rather than ordered.min/max
      const oneUnit = (ordered.units || _.identity)(1);

      const drawInverted = isHorizontal || xAxis.axisConfig.get('scale.inverted', false);
      const size = isHorizontal ? width : height;
      // points on this axis represent the amount of time they cover,
      // so draw the endzones at the actual time bounds
      const leftEndzone = {
        x: drawInverted ? 0 : Math.max(xScale(ordered.min), 0),
        w: drawInverted ? Math.max(xScale(ordered.min), 0) : height - Math.max(xScale(ordered.min), 0)
      };

      const expandLastBucket = xAxis.axisConfig.get('scale.expandLastBucket');
      const rightLastVal = expandLastBucket ? ordered.max : Math.min(ordered.max, _.last(xAxis.values));
      const rightStart = rightLastVal + oneUnit;
      const rightEndzone = {
        x: drawInverted ? xScale(rightStart) : 0,
        w: drawInverted ? Math.max(size - xScale(rightStart), 0) : xScale(rightStart)
      };

      this.endzones = svg.selectAll('.layer')
        .data([leftEndzone, rightEndzone])
        .enter()
        .insert('g', '.brush')
        .attr('class', 'endzone')
        .append('rect')
        .attr('class', 'zone')
        .attr('x', function (d) {
          return isHorizontal ? d.x : 0;
        })
        .attr('y', function (d) {
          return isHorizontal ? 0 : d.x;
        })
        .attr('height', function (d) {
          return isHorizontal ? height : d.w;
        })
        .attr('width', function (d) {
          return isHorizontal ? d.w : width;
        });

      function callPlay(event) {
        const boundData = event.target.__data__;
        const mouseChartXCoord = event.clientX - self.chartEl.getBoundingClientRect().left;
        const mouseChartYCoord = event.clientY - self.chartEl.getBoundingClientRect().top;
        const wholeBucket = boundData && boundData.x != null;

        // the min and max that the endzones start in
        const min = drawInverted ? leftEndzone.w : rightEndzone.w;
        const max = drawInverted ? rightEndzone.x : leftEndzone.x;

        // bounds of the cursor to consider
        let xLeft = isHorizontal ? mouseChartXCoord : mouseChartYCoord;
        let xRight = isHorizontal ? mouseChartXCoord : mouseChartYCoord;
        if (wholeBucket) {
          xLeft = xScale(boundData.x);
          xRight = xScale(xAxis.addInterval(boundData.x));
        }

        return {
          wholeBucket: wholeBucket,
          touchdown: min > xLeft || max < xRight
        };
      }

      function textFormatter() {
        return touchdownTmpl(callPlay(d3.event));
      }

      const endzoneTT = new Tooltip('endzones', this.handler.el, textFormatter, null);
      this.tooltips.push(endzoneTT);
      endzoneTT.order = 0;
      endzoneTT.showCondition = function inEndzone() {
        return callPlay(d3.event).touchdown;
      };
      endzoneTT.render()(svg);
    }

    calculateRadiusLimits(data) {
      this.radii = _(data.series)
        .map(function (series) {
          return _.map(series.values, 'z');
        })
        .flattenDeep()
        .reduce(function (result, val) {
          if (result.min > val) result.min = val;
          if (result.max < val) result.max = val;
          return result;
        }, {
          min: Infinity,
          max: -Infinity
        });
    }

    draw() {
      const self = this;
      const $elem = $(this.chartEl);
      const width = this.chartConfig.width = $elem.width();
      const height = this.chartConfig.height = $elem.height();
      const xScale = this.handler.categoryAxes[0].getScale();
      const minWidth = 50;
      const minHeight = 50;
      const addTimeMarker = this.chartConfig.addTimeMarker;
      const times = this.chartConfig.times || [];
      let timeMarker;
      let div;
      let svg;

      return function (selection) {
        selection.each(function (data) {
          const el = this;

          if (width < minWidth || height < minHeight) {
            throw new ContainerTooSmall();
          }

          if (addTimeMarker) {
            timeMarker = new TimeMarker(times, xScale, height);
          }

          div = d3.select(el);

          svg = div.append('svg')
          .attr('width', width)
          .attr('height', height);

          self.addBackground(svg, width, height);
          self.addGrid(svg);
          self.addClipPath(svg);
          self.addEvents(svg);
          self.createEndZones(svg);
          self.calculateRadiusLimits(data);

          self.series = [];
          _.each(self.chartConfig.series, (seriArgs, i) => {
            if (!seriArgs.show) return;
            const SeriClass = seriTypes[seriArgs.type || self.handler.visConfig.get('chart.type')] || seriTypes.line;
            const series = new SeriClass(self.handler, svg, data.series[i], seriArgs);
            series.events = self.events;
            svg.call(series.draw());
            self.series.push(series);
          });

          if (addTimeMarker) {
            timeMarker.render(svg);
          }

          return svg;
        });
      };
    }
  }

  return PointSeries;
}
