/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



/*
 * AngularJS directive for rendering a chart showing the distribution of values for
 * a metric on the field data card.
 */

import _ from 'lodash';
import { i18n } from '@kbn/i18n';
import d3 from 'd3';

import { numTicks } from '../../util/chart_utils';
import { ordinalSuffix } from 'ui/utils/ordinal_suffix';
import { mlChartTooltipService } from '../../components/chart_tooltip/chart_tooltip_service';

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

module.directive('mlMetricDistributionChart', function () {

  function link(scope, element, attrs) {
    const svgWidth = attrs.width ? +attrs.width : 400;
    const svgHeight = scope.height = attrs.height ? +attrs.height : 400;

    // TODO - do we want to label the y axis?
    const margin = { top: 0, right: 15, bottom: 20, left: 15 };
    const infoLabelHeight = 15;

    const chartWidth = svgWidth - (margin.left + margin.right);
    const chartHeight = svgHeight - (margin.top + margin.bottom + infoLabelHeight);

    let xScale = d3.scale.linear().range([0, chartWidth]);
    let yScale = d3.scale.linear().range([chartHeight, 0]);
    let xAxisMin = 0;
    let xAxisMax = 1;
    let chartGroup;

    const distributionArea = d3.svg.area()
      .x(function (d) { return xScale(d.x); })
      .y0(function () { return yScale(0); })
      .y1(function (d) { return yScale(d.y); });

    const MIN_BAR_WIDTH = 3;  // Minimum bar width, in pixels.

    element.on('$destroy', function () {
      scope.$destroy();
    });

    function processDistributionData() {
      const distributionData = _.get(scope, ['card', 'stats', 'distribution', 'percentiles'], []);
      const chartData = [];

      // Process the raw distribution data so it is in a suitable format for plotting:
      if (distributionData.length === 0) {
        return chartData;
      }

      // Adjust x axis min and max if there is a single bar.
      const minX = distributionData[0].minValue;
      const maxX = distributionData[distributionData.length - 1].maxValue;
      xAxisMin = minX;
      xAxisMax = maxX;
      if (maxX === minX) {
        if (minX !== 0) {
          xAxisMin = 0;
          xAxisMax = 2 * minX;
        } else {
          xAxisMax = 1;
        }
      }

      // Adjust the right hand x coordinates so that each bar is
      // at least MIN_BAR_WIDTH.
      // TODO - make sure last bar isn't cropped at RHS.
      const minBarWidth = (MIN_BAR_WIDTH / chartWidth) * (xAxisMax - xAxisMin);
      const processedData = [];
      let lastBar = undefined;
      _.each(distributionData, (data, index) => {

        if (index === 0) {
          const bar = {
            x0: data.minValue,
            x1: Math.max(data.minValue + minBarWidth, data.maxValue),
            dataMin: data.minValue,
            dataMax: data.maxValue,
            percent: data.percent
          };

          // Scale the height of the bar according to the range of data values in the bar.
          bar.y = (data.percent / (bar.x1 - bar.x0)) *
            Math.max(1, (minBarWidth / Math.max((data.maxValue - data.minValue), 0.5 * minBarWidth)));
          bar.isMinWidth = (data.maxValue <= (data.minValue + minBarWidth));
          processedData.push(bar);
          lastBar = bar;
        } else {
          if (lastBar.isMinWidth === false || data.maxValue > lastBar.x1) {
            const bar = {
              x0: lastBar.x1,
              x1: Math.max(lastBar.x1 + minBarWidth, data.maxValue),
              dataMin: data.minValue,
              dataMax: data.maxValue,
              percent: data.percent
            };

            // Scale the height of the bar according to the range of data values in the bar.
            bar.y = (data.percent / (bar.x1 - bar.x0)) *
              Math.max(1, (minBarWidth / Math.max((data.maxValue - data.minValue), 0.5 * minBarWidth)));
            bar.isMinWidth = (data.maxValue <= (lastBar.x1 + minBarWidth));
            processedData.push(bar);
            lastBar = bar;
          } else {
            // Combine bars which are less than minBarWidth apart.
            lastBar.percent = lastBar.percent + data.percent;
            lastBar.y = lastBar.percent / (lastBar.x1 - lastBar.x0);
            lastBar.dataMax = data.maxValue;
          }
        }

      });

      if (maxX !== minX) {
        xAxisMax = _.last(processedData).x1;
      }

      // Adjust the maximum bar height to be (10 * median bar height).
      // TODO indicate if a bar height has been truncated?
      let barHeights = _.pluck(processedData, 'y');
      barHeights = barHeights.sort((a, b) => a - b);

      let maxBarHeight = 0;
      const processedDataLength = processedData.length;
      if (Math.abs(processedDataLength % 2) === 1) {
        maxBarHeight = 20 * barHeights[(Math.floor(processedDataLength / 2))];
      } else {
        maxBarHeight = 20 * (barHeights[(Math.floor(processedDataLength / 2)) - 1] +
          barHeights[(Math.floor(processedDataLength / 2))]) / 2;
      }

      _.each(processedData, (data) => {
        data.y = Math.min(data.y, maxBarHeight);
      });

      scope.processedData = processedData;

      chartData.push({ x: minX, y: 0 });
      _.each(processedData, (data) => {
        chartData.push({ x: data.x0, y: data.y });
        chartData.push({ x: data.x1, y: data.y });
      });
      chartData.push({ x: processedData[processedData.length - 1].x1, y: 0 });

      return chartData;
    }

    function init() {
      scope.chartData = processDistributionData();

      // Clear any existing elements from the visualization,
      // then build the svg elements for the chart.
      const chartElement = d3.select(element.get(0)).select('.content-wrapper');
      chartElement.select('svg').remove();

      const svg = chartElement.append('svg')
        .attr('width',  svgWidth)
        .attr('height', svgHeight);

      // Add a label above the chart to display percentiles being plotted.
      const minPercentile = _.get(scope, ['card', 'stats', 'distribution', 'minPercentile']);
      const maxPercentile = _.get(scope, ['card', 'stats', 'distribution', 'maxPercentile']);
      const minPercent = ordinalSuffix(minPercentile);
      const maxPercent = ordinalSuffix(maxPercentile);
      svg.append('text')
        .attr('x', chartWidth / 2)
        .attr('y', 10)
        .attr('class', 'info-text')
        .attr('transform', `translate(${margin.left}, ${margin.top})`)
        .text(i18n.translate('xpack.ml.fieldDataCard.metricDistributionChart.displayingPercentilesLabel', {
          defaultMessage: 'Displaying {minPercent} - {maxPercent} percentiles',
          values: {
            minPercent,
            maxPercent,
          },
        }));

      const translateTop = margin.top + infoLabelHeight;
      chartGroup = svg.append('g')
        .attr('class', 'distribution-chart')
        .attr('transform', `translate(${margin.left}, ${translateTop})`);

      const dataLength = scope.chartData.length;
      if (dataLength > 0) {
        xScale = xScale.domain([xAxisMin, xAxisMax]);

        const yMax = d3.max(scope.chartData, (d) => d.y);
        yScale = yScale.domain([0, yMax]);
      }
    }

    function drawAxes() {
      const axes = chartGroup.append('g')
        .attr('class', 'axes');

      // Use the numTicks util function to calculate the number of ticks
      // for the x axis, according to the width of the chart.
      // Note that d3 doesn't guarantee that the axis will end up with
      // this exact number of ticks.
      const xAxis = d3.svg.axis().scale(xScale).orient('bottom')
        .outerTickSize(0).ticks(numTicks(chartWidth))
        .tickFormat((d) => {
          // Format the tick label according to the format of the index pattern field.
          return scope.card.fieldFormat.convert(d, 'text');
        });

      const yAxis = d3.svg.axis().scale(yScale).orient('left')
        .outerTickSize(0).ticks(0);

      axes.append('g')
        .attr('class', 'x axis')
        .attr('transform', `translate(0, ${chartHeight})`)
        .call(xAxis);

      axes.append('g')
        .attr('class', 'y axis')
        .call(yAxis);
    }

    function drawDistributionArea() {
      const path = chartGroup.append('path');
      path.datum(scope.chartData)
        .attr('class', 'area')
        .attr('d', distributionArea)
        .on('mouseover', showChartTooltip)
        .on('mouseout', () => mlChartTooltipService.hide())
        .on('mousemove', showChartTooltip);

      function showChartTooltip() {
        const xPos = d3.mouse(this)[0];
        const yPos = d3.mouse(this)[1];
        const xVal = xScale.invert(xPos);

        let processedDataIdx = 0;
        for (let i = 0; i < scope.processedData.length; i++) {
          if (xVal < scope.processedData[i].x1) {
            processedDataIdx = i;
            break;
          }
        }

        let contents;
        const bar = scope.processedData[processedDataIdx];
        const minValFormatted =  scope.card.fieldFormat.convert(bar.dataMin, 'text');
        if (bar.dataMax > bar.dataMin) {
          const maxValFormatted =  scope.card.fieldFormat.convert(bar.dataMax, 'text');
          contents = i18n.translate('xpack.ml.fieldDataCard.metricDistributionChart.documentsBarPercentBetweenValuesDescription', {
            defaultMessage: '{barPercent}% of documents have{br}values between {minValFormatted} and {maxValFormatted}',
            values: {
              barPercent: bar.percent,
              minValFormatted,
              maxValFormatted,
              br: '<br />',
            },
          });
        } else {
          contents = i18n.translate('xpack.ml.fieldDataCard.metricDistributionChart.documentsBarPercentValueDescription', {
            defaultMessage: '{barPercent}% of documents have{br}a value of {minValFormatted}',
            values: {
              barPercent: bar.percent,
              minValFormatted,
              br: '<br />',
            },
          });
        }

        contents = `<div class='eui-textCenter'>${contents}</div>`;

        if (path.length && path[0].length) {
          mlChartTooltipService.show(contents, path[0][0], {
            x: xPos + 5,
            y: yPos + 10
          });
        }
      }
    }

    init();
    drawAxes();
    drawDistributionArea();

  }

  return {
    scope: false,
    link: link
  };
});
