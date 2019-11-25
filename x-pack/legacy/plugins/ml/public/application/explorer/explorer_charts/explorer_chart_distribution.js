/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * React component for rendering a chart of anomalies in the raw data in
 * the Machine Learning Explorer dashboard.
 */

import PropTypes from 'prop-types';
import React from 'react';

import _ from 'lodash';
import d3 from 'd3';
import $ from 'jquery';
import moment from 'moment';

// don't use something like plugins/ml/../common
// because it won't work with the jest tests
import { formatHumanReadableDateTime } from '../../util/date_utils';
import { formatValue } from '../../formatters/format_value';
import { getSeverityColor, getSeverityWithLow } from '../../../../common/util/anomaly_utils';
import {
  getChartType,
  getTickValues,
  numTicksForDateFormat,
  removeLabelOverlap
} from '../../util/chart_utils';
import { LoadingIndicator } from '../../components/loading_indicator/loading_indicator';
import { TimeBuckets } from '../../util/time_buckets';
import { mlFieldFormatService } from '../../services/field_format_service';
import { mlChartTooltipService } from '../../components/chart_tooltip/chart_tooltip_service';
import { severity$ } from '../../components/controls/select_severity/select_severity';

import { CHART_TYPE } from '../explorer_constants';

import { injectI18n } from '@kbn/i18n/react';

const CONTENT_WRAPPER_HEIGHT = 215;

// If a rare/event-distribution chart has a cardinality of 10 or less,
// then the chart will display the y axis labels for each lane of events.
// If cardinality is higher, then the axis will just be hidden.
// Cardinality in this case refers to the available for display,
// not the cardinality of the full source data set.
const Y_AXIS_LABEL_THRESHOLD = 10;

export const ExplorerChartDistribution = injectI18n(class ExplorerChartDistribution extends React.Component {
  static propTypes = {
    seriesConfig: PropTypes.object,
  }

  componentDidMount() {
    this.renderChart();
  }

  componentDidUpdate() {
    this.renderChart();
  }

  renderChart() {
    const {
      tooManyBuckets,
      intl,
    } = this.props;

    const element = this.rootNode;
    const config = this.props.seriesConfig;

    if (
      typeof config === 'undefined' ||
      Array.isArray(config.chartData) === false
    ) {
      // just return so the empty directive renders without an error later on
      return;
    }

    const fieldFormat = mlFieldFormatService.getFieldFormat(config.jobId, config.detectorIndex);

    let vizWidth = 0;
    const chartHeight = 170;
    const LINE_CHART_ANOMALY_RADIUS = 7;
    const SCHEDULED_EVENT_MARKER_HEIGHT = 5;

    const chartType = getChartType(config);

    // Left margin is adjusted later for longest y-axis label.
    const margin = { top: 10, right: 0, bottom: 30, left: 0 };
    if (chartType === CHART_TYPE.POPULATION_DISTRIBUTION) {
      margin.left = 60;
    }

    let lineChartXScale = null;
    let lineChartYScale = null;
    let lineChartGroup;
    let lineChartValuesLine = null;

    const CHART_Y_ATTRIBUTE = (chartType === CHART_TYPE.EVENT_DISTRIBUTION) ? 'entity' : 'value';

    let highlight = config.chartData.find(d => (d.anomalyScore !== undefined));
    highlight = highlight && highlight.entity;

    const filteredChartData = init(config);
    drawRareChart(filteredChartData);

    function init({ chartData }) {
      const $el = $('.ml-explorer-chart');

      // Clear any existing elements from the visualization,
      // then build the svg elements for the chart.
      const chartElement = d3.select(element).select('.content-wrapper');
      chartElement.select('svg').remove();

      const svgWidth = $el.width();
      const svgHeight = chartHeight + margin.top + margin.bottom;

      const svg = chartElement.append('svg')
        .classed('ml-explorer-chart-svg', true)
        .attr('width', svgWidth)
        .attr('height', svgHeight);

      const categoryLimit = 30;
      const scaleCategories = d3.nest()
        .key(d => d.entity)
        .entries(chartData)
        .sort((a, b) => {
          return b.values.length - a.values.length;
        })
        .filter((d, i) => {
          // only filter for rare charts
          if (chartType === CHART_TYPE.EVENT_DISTRIBUTION) {
            return (i < categoryLimit || d.key === highlight);
          }
          return true;
        })
        .map(d => d.key);

      chartData = chartData.filter((d) => {
        return (scaleCategories.includes(d.entity));
      });

      if (chartType === CHART_TYPE.POPULATION_DISTRIBUTION) {
        const focusData = chartData.filter((d) => {
          return d.entity === highlight;
        }).map(d => d.value);
        const focusExtent = d3.extent(focusData);

        // now again filter chartData to include only the data points within the domain
        chartData = chartData.filter((d) => {
          return (d.value <= focusExtent[1]);
        });

        lineChartYScale = d3.scale.linear()
          .range([chartHeight, 0])
          .domain([0, focusExtent[1]])
          .nice();
      } else if (chartType === CHART_TYPE.EVENT_DISTRIBUTION) {
        // avoid overflowing the border of the highlighted area
        const rowMargin = 5;
        lineChartYScale = d3.scale.ordinal()
          .rangePoints([rowMargin, chartHeight - rowMargin])
          .domain(scaleCategories);
      } else {
        throw `chartType '${chartType}' not supported`;
      }

      const yAxis = d3.svg.axis().scale(lineChartYScale)
        .orient('left')
        .innerTickSize(0)
        .outerTickSize(0)
        .tickPadding(10);

      let maxYAxisLabelWidth = 0;
      const tempLabelText = svg.append('g')
        .attr('class', 'temp-axis-label tick');
      const tempLabelTextData = (chartType === CHART_TYPE.POPULATION_DISTRIBUTION) ? lineChartYScale.ticks() : scaleCategories;
      tempLabelText.selectAll('text.temp.axis').data(tempLabelTextData)
        .enter()
        .append('text')
        .text((d) => {
          if (fieldFormat !== undefined) {
            return fieldFormat.convert(d, 'text');
          } else {
            if (chartType === CHART_TYPE.POPULATION_DISTRIBUTION) {
              return lineChartYScale.tickFormat()(d);
            }
            return d;
          }
        })
        // Don't use an arrow function since we need access to `this`.
        .each(function () {
          maxYAxisLabelWidth = Math.max(this.getBBox().width + yAxis.tickPadding(), maxYAxisLabelWidth);
        })
        .remove();
      d3.select('.temp-axis-label').remove();

      // Set the size of the left margin according to the width of the largest y axis tick label
      // if the chart is either a population chart or a rare chart below the cardinality threshold.
      if (
        chartType === CHART_TYPE.POPULATION_DISTRIBUTION
        || (
          chartType === CHART_TYPE.EVENT_DISTRIBUTION
          && scaleCategories.length <= Y_AXIS_LABEL_THRESHOLD
        )
      ) {
        margin.left = (Math.max(maxYAxisLabelWidth, 40));
      }
      vizWidth = svgWidth - margin.left - margin.right;

      // Set the x axis domain to match the request plot range.
      // This ensures ranges on different charts will match, even when there aren't
      // data points across the full range, and the selected anomalous region is centred.
      lineChartXScale = d3.time.scale()
        .range([0, vizWidth])
        .domain([config.plotEarliest, config.plotLatest]);

      lineChartValuesLine = d3.svg.line()
        .x(d => lineChartXScale(d.date))
        .y(d => lineChartYScale(d[CHART_Y_ATTRIBUTE]))
        .defined(d => d.value !== null);

      lineChartGroup = svg.append('g')
        .attr('class', 'line-chart')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

      return chartData;
    }

    function drawRareChart(data) {
      // Add border round plot area.
      lineChartGroup.append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('height', chartHeight)
        .attr('width', vizWidth)
        .style('stroke', '#cccccc')
        .style('fill', 'none')
        .style('stroke-width', 1);

      drawRareChartAxes();
      drawRareChartHighlightedSpan();
      drawRareChartDots(data, lineChartGroup, lineChartValuesLine);
      drawRareChartMarkers(data);
    }

    function drawRareChartAxes() {
      // Get the scaled date format to use for x axis tick labels.
      const timeBuckets = new TimeBuckets();
      const bounds = { min: moment(config.plotEarliest), max: moment(config.plotLatest) };
      timeBuckets.setBounds(bounds);
      timeBuckets.setInterval('auto');
      const xAxisTickFormat = timeBuckets.getScaledDateFormat();

      const tickValuesStart = Math.max(config.selectedEarliest, config.plotEarliest);
      // +1 ms to account for the ms that was subtracted for query aggregations.
      const interval = config.selectedLatest - config.selectedEarliest + 1;
      const tickValues = getTickValues(tickValuesStart, interval, config.plotEarliest, config.plotLatest);

      const xAxis = d3.svg.axis().scale(lineChartXScale)
        .orient('bottom')
        .innerTickSize(-chartHeight)
        .outerTickSize(0)
        .tickPadding(10)
        .tickFormat(d => moment(d).format(xAxisTickFormat));

      // With tooManyBuckets the chart would end up with no x-axis labels
      // because the ticks are based on the span of the emphasis section,
      // and the highlighted area spans the whole chart.
      if (tooManyBuckets === false) {
        xAxis.tickValues(tickValues);
      } else {
        xAxis.ticks(numTicksForDateFormat(vizWidth, xAxisTickFormat));
      }

      const yAxis = d3.svg.axis().scale(lineChartYScale)
        .orient('left')
        .innerTickSize(0)
        .outerTickSize(0)
        .tickPadding(10);

      if (fieldFormat !== undefined) {
        yAxis.tickFormat(d => fieldFormat.convert(d, 'text'));
      }

      const axes = lineChartGroup.append('g');

      const gAxis = axes.append('g')
        .attr('class', 'x axis')
        .attr('transform', 'translate(0,' + chartHeight + ')')
        .call(xAxis);

      axes.append('g')
        .attr('class', 'y axis')
        .call(yAxis);

      // emphasize the y axis label this rare chart is actually about
      if (chartType === CHART_TYPE.EVENT_DISTRIBUTION) {
        axes.select('.y').selectAll('text').each(function (d) {
          d3.select(this).classed('ml-explorer-chart-axis-emphasis', (d === highlight));
        });
      }

      if (tooManyBuckets === false) {
        removeLabelOverlap(gAxis, tickValuesStart, interval, vizWidth);
      }
    }

    function drawRareChartDots(dotsData, rareChartGroup, rareChartValuesLine, radius = 1.5) {
      // check if `g.values-dots` already exists, if not create it
      // in both cases assign the element to `dotGroup`
      const dotGroup = (rareChartGroup.select('.values-dots').empty())
        ? rareChartGroup.append('g').classed('values-dots', true)
        : rareChartGroup.select('.values-dots');

      // use d3's enter/update/exit pattern to render the dots
      const dots = dotGroup.selectAll('circle').data(dotsData);

      dots.enter().append('circle')
        .classed('values-dots-circle', true)
        .classed('values-dots-circle-blur', (d) => {
          return (d.entity !== highlight);
        })
        .attr('r', d => ((d.entity === highlight) ? (radius * 1.5) : radius));

      dots
        .attr('cx', rareChartValuesLine.x())
        .attr('cy', rareChartValuesLine.y());

      dots.exit().remove();
    }

    function drawRareChartHighlightedSpan() {
      // Draws a rectangle which highlights the time span that has been selected for view.
      // Note depending on the overall time range and the bucket span, the selected time
      // span may be longer than the range actually being plotted.
      const rectStart = Math.max(config.selectedEarliest, config.plotEarliest);
      const rectEnd = Math.min(config.selectedLatest, config.plotLatest);
      const rectWidth = lineChartXScale(rectEnd) - lineChartXScale(rectStart);

      lineChartGroup.append('rect')
        .attr('class', 'selected-interval')
        .attr('x', lineChartXScale(new Date(rectStart)) + 2)
        .attr('y', 2)
        .attr('rx', 3)
        .attr('ry', 3)
        .attr('width', rectWidth - 4)
        .attr('height', chartHeight - 4);
    }

    function drawRareChartMarkers(data) {
      // Render circle markers for the points.
      // These are used for displaying tooltips on mouseover.
      // Don't render dots where value=null (data gaps)
      const dots = lineChartGroup.append('g')
        .attr('class', 'chart-markers')
        .selectAll('.metric-value')
        .data(data.filter(d => d.value !== null));

      // Remove dots that are no longer needed i.e. if number of chart points has decreased.
      dots.exit().remove();
      // Create any new dots that are needed i.e. if number of chart points has increased.
      dots.enter().append('circle')
        .attr('r', LINE_CHART_ANOMALY_RADIUS)
        // Don't use an arrow function since we need access to `this`.
        .on('mouseover', function (d) {
          showLineChartTooltip(d, this);
        })
        .on('mouseout', () => mlChartTooltipService.hide());

      // Update all dots to new positions.
      const threshold = severity$.getValue();
      dots.attr('cx', d => lineChartXScale(d.date))
        .attr('cy', d => lineChartYScale(d[CHART_Y_ATTRIBUTE]))
        .attr('class', (d) => {
          let markerClass = 'metric-value';
          if (_.has(d, 'anomalyScore') && Number(d.anomalyScore) >= threshold.val) {
            markerClass += ' anomaly-marker ';
            markerClass += getSeverityWithLow(d.anomalyScore).id;
          }
          return markerClass;
        });

      // Add rectangular markers for any scheduled events.
      const scheduledEventMarkers = lineChartGroup.select('.chart-markers').selectAll('.scheduled-event-marker')
        .data(data.filter(d => d.scheduledEvents !== undefined));

      // Remove markers that are no longer needed i.e. if number of chart points has decreased.
      scheduledEventMarkers.exit().remove();
      // Create any new markers that are needed i.e. if number of chart points has increased.
      scheduledEventMarkers.enter().append('rect')
        .attr('width', LINE_CHART_ANOMALY_RADIUS * 2)
        .attr('height', SCHEDULED_EVENT_MARKER_HEIGHT)
        .attr('class', 'scheduled-event-marker')
        .attr('rx', 1)
        .attr('ry', 1);

      // Update all markers to new positions.
      scheduledEventMarkers.attr('x', (d) => lineChartXScale(d.date) - LINE_CHART_ANOMALY_RADIUS)
        .attr('y', (d) => lineChartYScale(d[CHART_Y_ATTRIBUTE]) - (SCHEDULED_EVENT_MARKER_HEIGHT / 2));

    }

    function showLineChartTooltip(marker, circle) {
      // Show the time and metric values in the tooltip.
      // Uses date, value, upper, lower and anomalyScore (optional) marker properties.
      const formattedDate = formatHumanReadableDateTime(marker.date);
      const tooltipData = [{ name: formattedDate }];
      const seriesKey = config.detectorLabel;

      if (_.has(marker, 'entity')) {
        tooltipData.push({
          name: intl.formatMessage({
            id: 'xpack.ml.explorer.distributionChart.entityLabel',
            defaultMessage: 'entity'
          }),
          value: marker.entity,
          seriesKey
        });
      }

      if (_.has(marker, 'anomalyScore')) {
        const score = parseInt(marker.anomalyScore);
        const displayScore = (score > 0 ? score : '< 1');
        tooltipData.push({
          name: intl.formatMessage({
            id: 'xpack.ml.explorer.distributionChart.anomalyScoreLabel',
            defaultMessage: 'anomaly score'
          }),
          value: displayScore,
          color: getSeverityColor(score),
          seriesKey,
          yAccessor: 'anomaly_score'
        });
        if (chartType !== CHART_TYPE.EVENT_DISTRIBUTION) {
          tooltipData.push({
            name: intl.formatMessage({
              id: 'xpack.ml.explorer.distributionChart.valueLabel',
              defaultMessage: 'value'
            }),
            value: formatValue(marker.value, config.functionDescription, fieldFormat),
            seriesKey,
            yAccessor: 'value'
          });
          if (typeof marker.numberOfCauses === 'undefined' || marker.numberOfCauses === 1) {
            tooltipData.push({
              name: intl.formatMessage({
                id: 'xpack.ml.explorer.distributionChart.typicalLabel',
                defaultMessage: 'typical'
              }),
              value: formatValue(marker.typical, config.functionDescription, fieldFormat),
              seriesKey,
              yAccessor: 'typical'
            });
          }
          if (typeof marker.byFieldName !== 'undefined' && _.has(marker, 'numberOfCauses')) {
            tooltipData.push({
              name: intl.formatMessage({
                id: 'xpack.ml.explorer.distributionChart.unusualByFieldValuesLabel',
                defaultMessage:
                  '{ numberOfCauses, plural, one {# unusual {byFieldName} value} other {#{plusSign} unusual {byFieldName} values}}'
              }, {
                numberOfCauses: marker.numberOfCauses,
                byFieldName: marker.byFieldName,
                // Maximum of 10 causes are stored in the record, so '10' may mean more than 10.
                plusSign: marker.numberOfCauses < 10 ? '' : '+',
              }),
              seriesKey,
              yAccessor: 'numberOfCauses'
            });
          }
        }
      } else if (chartType !== CHART_TYPE.EVENT_DISTRIBUTION) {
        tooltipData.push({
          name: intl.formatMessage({
            id: 'xpack.ml.explorer.distributionChart.valueWithoutAnomalyScoreLabel',
            defaultMessage: 'value'
          }),
          value: formatValue(marker.value, config.functionDescription, fieldFormat),
          seriesKey,
          yAccessor: 'value'
        });
      }

      if (_.has(marker, 'scheduledEvents')) {
        marker.scheduledEvents.forEach((scheduledEvent, i) => {
          tooltipData.push({
            name: intl.formatMessage({
              id: 'xpack.ml.timeSeriesExplorer.timeSeriesChart.scheduledEventsLabel',
              defaultMessage: 'scheduled event{counter}'
            }, { counter: marker.scheduledEvents.length > 1 ? ` #${i + 1}` : '' }),
            value: scheduledEvent,
            seriesKey,
            yAccessor: `scheduled_events_${i + 1}`
          });
        });
      }

      mlChartTooltipService.show(tooltipData, circle, {
        x: LINE_CHART_ANOMALY_RADIUS * 3,
        y: LINE_CHART_ANOMALY_RADIUS * 2,
      });
    }
  }

  shouldComponentUpdate() {
    // Always return true, d3 will take care of appropriate re-rendering.
    return true;
  }

  setRef(componentNode) {
    this.rootNode = componentNode;
  }

  render() {
    const {
      seriesConfig
    } = this.props;

    if (typeof seriesConfig === 'undefined') {
      // just return so the empty directive renders without an error later on
      return null;
    }

    // create a chart loading placeholder
    const isLoading = seriesConfig.loading;

    return (
      <div className="ml-explorer-chart" ref={this.setRef.bind(this)} >
        {isLoading && (
          <LoadingIndicator height={CONTENT_WRAPPER_HEIGHT} />
        )}
        {!isLoading && (
          <div className="content-wrapper" />
        )}
      </div>
    );
  }
});
