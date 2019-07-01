/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



/*
 * AngularJS directive for rendering a chart showing
 * document count on the field data card.
 */

import _ from 'lodash';
import { i18n } from '@kbn/i18n';
import d3 from 'd3';
import moment from 'moment';

import { parseInterval } from 'ui/utils/parse_interval';
import { numTicksForDateFormat } from '../../util/chart_utils';
import { calculateTextWidth } from '../../util/string_utils';
import { MlTimeBuckets } from '../../util/ml_time_buckets';
import { mlChartTooltipService } from '../../components/chart_tooltip/chart_tooltip_service';
import { formatHumanReadableDateTime } from '../../util/date_utils';

import { uiModules } from 'ui/modules';
import { timefilter } from 'ui/timefilter';
const module = uiModules.get('apps/ml');

module.directive('mlDocumentCountChart', function () {
  function link(scope, element, attrs) {
    const svgWidth = attrs.width ? +attrs.width : 400;
    const svgHeight = scope.height = attrs.height ? +attrs.height : 400;

    const margin = { top: 0, right: 5, bottom: 20, left: 15 };

    let chartWidth = svgWidth - (margin.left + margin.right);
    const chartHeight = svgHeight - (margin.top + margin.bottom);

    let xScale = null;
    let yScale = d3.scale.linear().range([chartHeight, 0]);
    let xAxisTickFormat = 'YYYY-MM-DD HH:mm';

    let barChartGroup;
    let barWidth = 5;            // Adjusted according to data aggregation interval.

    scope.chartData = [];

    element.on('$destroy', function () {
      scope.$destroy();
    });

    function processChartData() {
      // Build the dataset in format used by the d3 chart i.e. array
      // of Objects with keys time (epoch ms), date (JavaScript date) and value.
      const bucketsData = _.get(scope, ['card', 'stats', 'documentCounts', 'buckets'], {});
      const chartData = [];
      _.each(bucketsData, (value, time) => {
        chartData.push({
          date: new Date(+time),
          time: +time,
          value
        });
      });

      scope.chartData = chartData;
    }

    function render() {
      // Clear any existing elements from the visualization,
      // then build the svg elements for the bar chart.
      const chartElement = d3.select(element.get(0)).select('.content-wrapper');
      chartElement.selectAll('*').remove();

      if (scope.chartData === undefined) {
        return;
      }

      const svg = chartElement.append('svg')
        .attr('width',  svgWidth)
        .attr('height', svgHeight);

      // Set the size of the left margin according to the width
      // of the largest y axis tick label.
      const maxYVal = d3.max(scope.chartData, (d) => d.value);
      yScale = yScale.domain([0, maxYVal]);

      const yAxis = d3.svg.axis().scale(yScale).orient('left').outerTickSize(0);

      // barChartGroup translate doesn't seem to be relative
      // to parent svg, so have to add an extra 5px on.
      const maxYAxisLabelWidth = calculateTextWidth(maxYVal, true, svg);
      margin.left = Math.max(maxYAxisLabelWidth + yAxis.tickPadding() + 5, 25);
      chartWidth  = Math.max(svgWidth  - margin.left - margin.right, 0);

      const bounds = timefilter.getActiveBounds();
      xScale = d3.time.scale()
        .domain([new Date(bounds.min.valueOf()), new Date(bounds.max.valueOf())])
        .range([0, chartWidth]);

      if (scope.chartData.length > 0) {
        // x axis tick format and bar width determined by data aggregation interval.
        const buckets = new MlTimeBuckets();
        const aggInterval = _.get(scope, ['card', 'stats', 'documentCounts', 'interval']);
        buckets.setInterval(aggInterval);
        buckets.setBounds(bounds);
        xAxisTickFormat = buckets.getScaledDateFormat();

        const intervalMs = parseInterval(aggInterval).asMilliseconds();
        barWidth = xScale(scope.chartData[0].time + intervalMs) - xScale(scope.chartData[0].time);
      }

      const xAxis = d3.svg.axis().scale(xScale).orient('bottom')
        .outerTickSize(0).ticks(numTicksForDateFormat(chartWidth, xAxisTickFormat))
        .tickFormat((d) => {
          return moment(d).format(xAxisTickFormat);
        });

      barChartGroup = svg.append('g')
        .attr('class', 'bar-chart')
        .attr('transform', `translate(${margin.left}, ${margin.top})`);

      drawBarChartAxes(xAxis, yAxis);
      drawBarChartPaths();
    }

    function drawBarChartAxes(xAxis, yAxis)  {
      const axes = barChartGroup.append('g');

      axes.append('g')
        .attr('class', 'x axis')
        .attr('transform', `translate(0, ${chartHeight})`)
        .call(xAxis);

      axes.append('g')
        .attr('class', 'y axis')
        .call(yAxis);
    }

    function drawBarChartPaths() {
      barChartGroup.selectAll('bar')
        .data(scope.chartData)
        .enter().append('rect')
        .attr('class', 'bar')
        .attr('x', (d) => { return xScale(d.time); })
        .attr('width', barWidth)
        .attr('y', (d) => { return yScale(d.value); })
        .attr('height', (d) => { return chartHeight - yScale(d.value); })
        .on('mouseover', function (d) {
          showChartTooltip(d, this);
        })
        .on('mousemove', function (d) {
          showChartTooltip(d, this);
        })
        .on('mouseout', () => mlChartTooltipService.hide());

      function showChartTooltip(data, rect) {
        const formattedDate = formatHumanReadableDateTime(data.time);
        const contents = i18n.translate('xpack.ml.fieldDataCard.documentCountChart.chartTooltip', {
          defaultMessage: '{formattedDate}{br}{hr}count: {dataValue}',
          values: {
            formattedDate,
            dataValue: data.value,
            br: '<br />',
            hr: '<hr />',
          },
        });

        // Calculate the y offset.
        // rectY are mouseY are relative to top of the chart area.
        const rectY = d3.select(rect).attr('y');
        const mouseY = +(d3.mouse(rect)[1]);

        mlChartTooltipService.show(contents, rect, {
          x: 5,
          y: (mouseY - rectY)
        });
      }
    }

    // Process the data and then render the chart.
    processChartData();
    render();
  }

  return {
    scope: false,
    link: link
  };
});
