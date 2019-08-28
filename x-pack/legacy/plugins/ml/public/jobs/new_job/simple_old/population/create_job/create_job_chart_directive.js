/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



/*
 * Chart showing metric data, annotated with anomalies.
 */

import $ from 'jquery';
import { i18n } from '@kbn/i18n';
import d3 from 'd3';
import angular from 'angular';
import moment from 'moment';

import { formatHumanReadableDateTime } from '../../../../../util/date_utils';
import { TimeBuckets } from 'ui/time_buckets';
import { numTicksForDateFormat } from '../../../../../util/chart_utils';
import { mlEscape } from '../../../../../util/string_utils';
import { mlChartTooltipService } from '../../../../../components/chart_tooltip/chart_tooltip_service';

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

module.directive('mlPopulationJobChart', function () {

  function link(scope, element) {

    let svgWidth = 0;
    const chartHeight = scope.chartHeight;
    const margin = { top: 0, right: 0, bottom: 20, left: scope.chartTicksMargin.width };
    const svgHeight = chartHeight + margin.top + margin.bottom;
    let vizWidth  = svgWidth  - margin.left - margin.right;
    const chartLimits = { max: 0, min: 0 };

    let chartXScale = null;
    let chartYScale = null;

    let chartGroup;
    let swimlaneGroup;

    let $progressBar;

    scope.$on('render', () => {
      init();
      createSVGGroups();
      drawChart();
    });

    scope.$on('render-results', () => {
      drawResults();
    });

    element.on('$destroy', () => {
      scope.$destroy();
    });

    function init() {
      const $el = angular.element('.population-job-container .card-front');
      const offset = $el.hasClass('card') ? 30 : 0;

      margin.left = scope.chartTicksMargin.width;

      svgWidth = $el.width() - offset;
      vizWidth = svgWidth  - margin.left - margin.right;

      chartXScale = d3.time.scale().range([0, vizWidth]);
      chartYScale = d3.scale.linear().range([chartHeight, 0]);
    }


    function createSVGGroups() {
      if (scope.chartData.line === undefined) {
        return;
      }

      // Clear any existing elements from the visualization,
      // then build the svg elements for the chart.
      const chartElement = d3.select(element.get(0));
      chartElement.select('svg').remove();
      chartElement.select('.progress').remove();

      if (chartElement.select('.progress-bar')[0][0] === null) {
        const style = `width: ${(+vizWidth + 2)}px;
          margin-bottom: -${(+chartHeight - 15)}px;
          margin-left: ${(+margin.left - 1)}px;'`;

        chartElement.append('div')
          .attr('class', 'progress')
          .attr('style', style)
          .append('div')
          .attr('class', 'progress-bar');
      }

      $progressBar = $('.progress-bar');

      const svg = chartElement.append('svg')
        .attr('width',  svgWidth)
        .attr('height', svgHeight);

      swimlaneGroup = svg.append('g')
        .attr('class', 'swimlane')
        .attr('transform', `translate(${margin.left}, ${margin.top})`);

      chartGroup = svg.append('g')
        .attr('class', 'line-chart')
        .attr('transform', `translate(${margin.left}, ${margin.top})`);
    }

    function drawChart() {
      if (scope.chartData.line.length === 0) {
        return;
      }

      // create flat array of data points
      const data = scope.chartData.line.reduce((p, c) => {
        if (c.values.length) {
          c.values.forEach(v => {
            p.push({ date: c.date, value: v.value, label: v.label });
          });
        } else {
          // for empty buckets, still add an entry so we plot gaps
          p.push({ date: c.date, value: null, label: null });
        }
        return p;
      }, []);

      chartXScale = chartXScale.domain(d3.extent(data, d => d.date));

      chartLimits.max = d3.max(data, (d) => d.value);
      chartLimits.min = d3.min(data, (d) => d.value);

      // add padding of 10% of the difference between max and min
      // to the upper and lower ends of the y-axis
      const padding = (chartLimits.max - chartLimits.min) * 0.05;
      chartLimits.max += padding;
      chartLimits.min -= padding;

      chartYScale = chartYScale.domain([
        chartLimits.min,
        chartLimits.max
      ]);

      // Get the scaled date format to use for x axis tick labels.
      const timeBuckets = new TimeBuckets();
      timeBuckets.setInterval('auto');
      if (data.length > 0) {
        const xDomain = chartXScale.domain();
        const bounds = { min: moment(xDomain[0]), max: moment(xDomain[1]) };
        timeBuckets.setBounds(bounds);
      }
      const xAxisTickFormat = timeBuckets.getScaledDateFormat();

      const xAxis = d3.svg
        .axis()
        .scale(chartXScale)
        .orient('bottom')
        .innerTickSize(-chartHeight)
        .outerTickSize(0)
        .tickPadding(10)
        .ticks(numTicksForDateFormat(vizWidth, xAxisTickFormat))
        .tickFormat(d => moment(d).format(xAxisTickFormat));

      const yAxis = d3.svg
        .axis()
        .scale(chartYScale)
        .orient('left')
        .innerTickSize(-vizWidth)
        .outerTickSize(0)
        .tickPadding(10);

      if (scope.chartData.fieldFormat !== undefined) {
        yAxis.tickFormat(d => scope.chartData.fieldFormat.convert(d, 'text'));
      }

      // add a white background to the chart
      swimlaneGroup.append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('height', chartHeight)
        .attr('width', vizWidth)
        .style('fill', '#FFFFFF');

      // Add border round plot area.
      chartGroup.append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('height', chartHeight)
        .attr('width', vizWidth)
        .style('stroke', '#cccccc')
        .style('fill', 'none')
        .style('stroke-width', 1);


      drawChartAxes(xAxis, yAxis);
      drawChartDots(data);
    }

    function drawChartAxes(xAxis, yAxis) {

      const axes = chartGroup.append('g');

      axes.append('g')
        .attr('class', 'x axis')
        .attr('transform', `translate(0, ${chartHeight})`)
        .call(xAxis);

      axes.append('g')
        .attr('class', 'y axis')
        .call(yAxis);
    }

    function drawChartDots(data) {
      const dotGroup = chartGroup.append('g')
        .classed('values-dots', true);
      dotGroup.selectAll('circle').data(data)
        .enter().append('circle')
        .attr('cx', (d) => chartXScale(d.date))
        .attr('cy', (d) => chartYScale(d.value))
        .attr('r', 3)
        .style('display', (d) => d.value === null ? 'none' : 'auto')
        .on('mouseover', function (d) {
          showTooltip(d, this);
        })
        .on('mouseout', () => mlChartTooltipService.hide());
    }

    function showTooltip(data, el) {
      scope;
      let contents = '';
      const formattedDate = formatHumanReadableDateTime(data.date);
      contents += `${formattedDate}<br/><hr/>`;
      contents += `${mlEscape(scope.overFieldName)}: ${mlEscape(data.label)}<br/>`;
      contents += i18n.translate('xpack.ml.newJob.simple.population.chartTooltipValueLabel', {
        defaultMessage: 'Value: {dataValue}',
        values: {
          dataValue: scope.chartData.fieldFormat !== undefined
            ? scope.chartData.fieldFormat.convert(data.value, 'text')
            : parseInt(data.value)
        }
      });
      mlChartTooltipService.show(contents, el, {
        x: 5,
        y: 10
      });
    }

    function drawResults() {
      drawSwimlane(vizWidth, chartHeight);
      updateProgressBar();
    }

    function drawSwimlane(swlWidth, swlHeight) {
      const data = scope.chartData.swimlane;

      let cellWidth = 0;
      if (data.length > 0) {
        cellWidth = chartXScale(data[0].time + scope.chartData.swimlaneInterval) - chartXScale(data[0].time);
      }

      d3.time.scale().range([0, swlWidth])
        .domain(d3.extent(data, (d) => d.date));

      d3.scale.linear().range([swlHeight, 0])
        .domain([0, swlHeight]);

      // Set up the color scale to use for indicating score.
      const color = d3.scale.threshold()
        .domain([3, 25, 50, 75, 100])
        .range(['#d2e9f7', '#8bc8fb', '#ffdd00', '#ff7e00', '#fe5050']);

      swimlaneGroup.select('.swimlane-cells').remove();

      const cells = swimlaneGroup.append('g')
        .attr('class', 'swimlane-cells')
        .selectAll('cells')
        .data(data);

      cells.enter().append('rect')
        .attr('x', (d) => chartXScale(d.date))
        .attr('y', 0)
        .attr('rx', 0)
        .attr('ry', 0)
        .attr('class', (d) => d.value > 0 ? 'swimlane-cell' : 'swimlane-cell-hidden')
        .attr('width', cellWidth - 0)
        .attr('height', swlHeight - 0)
        .style('fill', (d) => color(d.value));

    }

    function updateProgressBar() {
      const pcnt = (scope.chartData.percentComplete < 100) ? scope.chartData.percentComplete : 0;
      $progressBar.css('width', pcnt + '%');
    }
  }

  return {
    scope: {
      chartData: '=',
      chartHeight: '=',
      chartTicksMargin: '=',
      overFieldName: '='
    },
    link
  };
});
