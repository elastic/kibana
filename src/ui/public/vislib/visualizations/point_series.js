import d3 from 'd3';
import _ from 'lodash';
import $ from 'jquery';
import errors from 'ui/errors';
import TooltipProvider from 'ui/vislib/components/tooltip';
import VislibVisualizationsChartProvider from 'ui/vislib/visualizations/_chart';
import VislibVisualizationsTimeMarkerProvider from 'ui/vislib/visualizations/time_marker';
import VislibVisualizationsSeriTypesProvider from 'ui/vislib/visualizations/point_series/seri_types';

export default function PointSeriesFactory(Private) {

  const Chart = Private(VislibVisualizationsChartProvider);
  const Tooltip = Private(TooltipProvider);
  const TimeMarker = Private(VislibVisualizationsTimeMarkerProvider);
  const seriTypes = Private(VislibVisualizationsSeriTypesProvider);
  const touchdownTmpl = _.template(require('ui/vislib/partials/touchdown.tmpl.html'));
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
      this.chartConfig = handler.visConfig.get('chart');
      this.handler.pointSeries = this;
    }

    shouldBeStacked(seriesConfig) {
      const isHistogram = (seriesConfig.type === 'histogram');
      const isArea = (seriesConfig.type === 'area');
      const stacked = (seriesConfig.mode === 'stacked');

      return (isHistogram || isArea) && stacked;
    };

    getStackedSeries(axis, series, first = false) {
      const matchingSeries = [];
      this.chartConfig.series.forEach((seriArgs, i) => {
        const matchingAxis = seriArgs.valueAxis === axis.axisConfig.get('id') || (!seriArgs.valueAxis && first);
        if (matchingAxis && this.shouldBeStacked(seriArgs)) {
          matchingSeries.push(series[i]);
        }
      });
      return this.handler.data.injectZeros(matchingSeries);
    };

    stackData(data) {
      const stackedData = {};
      this.handler.valueAxes.forEach((axis, i) => {
        const id = axis.axisConfig.get('id');
        stackedData[id] = this.getStackedSeries(axis, data.series, i === 0);
        axis.stack(_.map(stackedData[id], 'values'));
      });
      return stackedData;
    };

    addClipPath(svg, width, height) {
      // Prevents circles from being clipped at the top of the chart
      const startX = 0;
      const startY = 0;
      const id = 'chart-area' + _.uniqueId();

      // Creating clipPath
      return svg
      .attr('clip-path', 'url(#' + id + ')')
      .append('clipPath')
      .attr('id', id)
      .append('rect')
      .attr('x', startX)
      .attr('y', startY)
      .attr('width', width)
      .attr('height', height);
    };

    addEvents(svg) {
      const isBrushable = this.events.isBrushable();
      if (isBrushable) {
        const brush = this.events.addBrushEvent(svg);
        return svg.call(brush);
      }
    };

    createEndZones(svg) {
      const self = this;
      const xAxis = this.handler.categoryAxes[0];
      const xScale = xAxis.getScale();
      const ordered = xAxis.ordered;
      const isHorizontal = xAxis.axisConfig.isHorizontal();
      const missingMinMax = !ordered || _.isUndefined(ordered.min) || _.isUndefined(ordered.max);

      if (missingMinMax || ordered.endzones === false) return;

      const {width, height} = svg.node().getBBox();

      // we don't want to draw endzones over our min and max values, they
      // are still a part of the dataset. We want to start the endzones just
      // outside of them so we will use these values rather than ordered.min/max
      const oneUnit = (ordered.units || _.identity)(1);

      // points on this axis represent the amount of time they cover,
      // so draw the endzones at the actual time bounds
      const leftEndzone = {
        x: isHorizontal ? 0 : Math.max(xScale(ordered.min), 0),
        w: isHorizontal ? Math.max(xScale(ordered.min), 0) : height - Math.max(xScale(ordered.min), 0)
      };

      const rightLastVal = xAxis.expandLastBucket ? ordered.max : Math.min(ordered.max, _.last(xAxis.values));
      const rightStart = rightLastVal + oneUnit;
      const rightEndzone = {
        x: isHorizontal ? xScale(rightStart) : 0,
        w: isHorizontal ? Math.max(width - xScale(rightStart), 0) : xScale(rightStart)
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
        const min = isHorizontal ? leftEndzone.w : rightEndzone.w;
        const max = isHorizontal ? rightEndzone.x : leftEndzone.x;

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
    };

    draw() {
      // todo: do we need to handle width and height here ?
      let self = this;
      let $elem = $(this.chartEl);
      let margin = this.handler.visConfig.get('style.margin');
      let elWidth = this.chartConfig.width = $elem.width();
      let elHeight = this.chartConfig.height = $elem.height();
      let xScale = this.handler.categoryAxes[0].getScale();
      let minWidth = 50;
      let minHeight = 50;
      let addTimeMarker = this.chartConfig.addTimeMarker;
      let times = this.chartConfig.times || [];
      let timeMarker;
      let div;
      let svg;
      let width;
      let height;

      return function (selection) {
        selection.each(function (data) {
          const el = this;

          width = elWidth;
          height = elHeight;
          if (width < minWidth || height < minHeight) {
            throw new errors.ContainerTooSmall();
          }

          if (addTimeMarker) {
            timeMarker = new TimeMarker(times, xScale, height);
          }

          div = d3.select(el);

          svg = div.append('svg')
          .attr('width', elWidth)
          .attr('height', elHeight)
          .append('g');

          self.addClipPath(svg, width, height);

          self.stackData(data);
          self.series = [];
          _.each(self.chartConfig.series, (seriArgs, i) => {
            const SeriClass = seriTypes[seriArgs.type || self.handler.visConfig.get('chart.type')];
            const series = new SeriClass(self.handler, svg, data.series[i], seriArgs);
            series.events = self.events;
            svg.call(series.draw());
            self.series.push(series);
          });

          self.addEvents(svg);
          self.createEndZones(svg);

          if (addTimeMarker) {
            timeMarker.render(svg);
          }

          return svg;
        });
      };
    };
  }

  return PointSeries;
};
