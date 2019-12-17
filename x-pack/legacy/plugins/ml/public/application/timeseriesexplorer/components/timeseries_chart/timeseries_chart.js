/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * React component chart plotting data from a single time series, with or without model plot enabled,
 * annotated with anomalies.
 */

import PropTypes from 'prop-types';
import React from 'react';

import _ from 'lodash';
import d3 from 'd3';
import moment from 'moment';

import chrome from 'ui/chrome';

import {
  getSeverityWithLow,
  getMultiBucketImpactLabel,
} from '../../../../../common/util/anomaly_utils';
import { annotation$ } from '../../../services/annotations_service';
import { injectObservablesAsProps } from '../../../util/observable_utils';
import { formatValue } from '../../../formatters/format_value';
import {
  LINE_CHART_ANOMALY_RADIUS,
  MULTI_BUCKET_SYMBOL_SIZE,
  SCHEDULED_EVENT_SYMBOL_HEIGHT,
  drawLineChartDots,
  filterAxisLabels,
  numTicksForDateFormat,
  showMultiBucketAnomalyMarker,
  showMultiBucketAnomalyTooltip,
} from '../../../util/chart_utils';
import { formatHumanReadableDateTimeSeconds } from '../../../util/date_utils';
import { TimeBuckets } from '../../../util/time_buckets';
import { mlTableService } from '../../../services/table_service';
import { ContextChartMask } from '../context_chart_mask';
import { findChartPointForAnomalyTime } from '../../timeseriesexplorer_utils';
import { mlEscape } from '../../../util/string_utils';
import { mlFieldFormatService } from '../../../services/field_format_service';
import { mlChartTooltipService } from '../../../components/chart_tooltip/chart_tooltip_service';
import {
  ANNOTATION_MASK_ID,
  getAnnotationBrush,
  getAnnotationLevels,
  getAnnotationWidth,
  renderAnnotations,
  highlightFocusChartAnnotation,
  unhighlightFocusChartAnnotation,
} from './timeseries_chart_annotations';
import { TEXT_CONTENT_TYPE } from '../../../../../../../../../src/plugins/data/public';

import { injectI18n } from '@kbn/i18n/react';

const focusZoomPanelHeight = 25;
const focusChartHeight = 310;
const focusHeight = focusZoomPanelHeight + focusChartHeight;
const contextChartHeight = 60;
const contextChartLineTopMargin = 3;
const chartSpacing = 25;
const swimlaneHeight = 30;
const margin = { top: 20, right: 10, bottom: 15, left: 40 };
const mlAnnotationsEnabled = chrome.getInjected('mlAnnotationsEnabled', false);

const ZOOM_INTERVAL_OPTIONS = [
  { duration: moment.duration(1, 'h'), label: '1h' },
  { duration: moment.duration(12, 'h'), label: '12h' },
  { duration: moment.duration(1, 'd'), label: '1d' },
  { duration: moment.duration(1, 'w'), label: '1w' },
  { duration: moment.duration(2, 'w'), label: '2w' },
  { duration: moment.duration(1, 'M'), label: '1M' },
];

// Set up the color scale to use for indicating score.
const anomalyColorScale = d3.scale
  .threshold()
  .domain([3, 25, 50, 75, 100])
  .range(['#d2e9f7', '#8bc8fb', '#ffdd00', '#ff7e00', '#fe5050']);

// Create a gray-toned version of the color scale to use under the context chart mask.
const anomalyGrayScale = d3.scale
  .threshold()
  .domain([3, 25, 50, 75, 100])
  .range(['#dce7ed', '#b0c5d6', '#b1a34e', '#b17f4e', '#c88686']);

function getSvgHeight() {
  return (
    focusHeight + contextChartHeight + swimlaneHeight + chartSpacing + margin.top + margin.bottom
  );
}

const TimeseriesChartIntl = injectI18n(
  class TimeseriesChart extends React.Component {
    static propTypes = {
      annotation: PropTypes.object,
      autoZoomDuration: PropTypes.number,
      contextAggregationInterval: PropTypes.object,
      contextChartData: PropTypes.array,
      contextForecastData: PropTypes.array,
      contextChartSelected: PropTypes.func.isRequired,
      detectorIndex: PropTypes.string,
      focusAggregationInterval: PropTypes.object,
      focusAnnotationData: PropTypes.array,
      focusChartData: PropTypes.array,
      focusForecastData: PropTypes.array,
      skipRefresh: PropTypes.bool.isRequired,
      modelPlotEnabled: PropTypes.bool.isRequired,
      renderFocusChartOnly: PropTypes.bool.isRequired,
      selectedJob: PropTypes.object,
      showForecast: PropTypes.bool.isRequired,
      showModelBounds: PropTypes.bool.isRequired,
      svgWidth: PropTypes.number.isRequired,
      swimlaneData: PropTypes.array,
      timefilter: PropTypes.object.isRequired,
      zoomFrom: PropTypes.object,
      zoomTo: PropTypes.object,
      zoomFromFocusLoaded: PropTypes.object,
      zoomToFocusLoaded: PropTypes.object,
    };

    rowMouseenterSubscriber = null;
    rowMouseleaveSubscriber = null;

    componentWillUnmount() {
      const element = d3.select(this.rootNode);
      element.html('');

      if (this.rowMouseenterSubscriber !== null) {
        this.rowMouseenterSubscriber.unsubscribe();
      }
      if (this.rowMouseleaveSubscriber !== null) {
        this.rowMouseleaveSubscriber.unsubscribe();
      }
    }

    componentDidMount() {
      const { svgWidth } = this.props;

      this.vizWidth = svgWidth - margin.left - margin.right;
      const vizWidth = this.vizWidth;

      this.focusXScale = d3.time.scale().range([0, vizWidth]);
      this.focusYScale = d3.scale.linear().range([focusHeight, focusZoomPanelHeight]);
      const focusXScale = this.focusXScale;
      const focusYScale = this.focusYScale;

      this.focusXAxis = d3.svg
        .axis()
        .scale(focusXScale)
        .orient('bottom')
        .innerTickSize(-focusChartHeight)
        .outerTickSize(0)
        .tickPadding(10);
      this.focusYAxis = d3.svg
        .axis()
        .scale(focusYScale)
        .orient('left')
        .innerTickSize(-vizWidth)
        .outerTickSize(0)
        .tickPadding(10);

      this.focusValuesLine = d3.svg
        .line()
        .x(function(d) {
          return focusXScale(d.date);
        })
        .y(function(d) {
          return focusYScale(d.value);
        })
        .defined(d => d.value !== null);
      this.focusBoundedArea = d3.svg
        .area()
        .x(function(d) {
          return focusXScale(d.date) || 1;
        })
        .y0(function(d) {
          return focusYScale(d.upper);
        })
        .y1(function(d) {
          return focusYScale(d.lower);
        })
        .defined(d => d.lower !== null && d.upper !== null);

      this.contextXScale = d3.time.scale().range([0, vizWidth]);
      this.contextYScale = d3.scale.linear().range([contextChartHeight, contextChartLineTopMargin]);

      this.fieldFormat = undefined;

      // Annotations Brush
      if (mlAnnotationsEnabled) {
        this.annotateBrush = getAnnotationBrush.call(this);
      }

      // brush for focus brushing
      this.brush = d3.svg.brush();

      this.mask = undefined;

      // Listeners for mouseenter/leave events for rows in the table
      // to highlight the corresponding anomaly mark in the focus chart.
      const highlightFocusChartAnomaly = this.highlightFocusChartAnomaly.bind(this);
      const boundHighlightFocusChartAnnotation = highlightFocusChartAnnotation.bind(this);
      function tableRecordMousenterListener({ record, type = 'anomaly' }) {
        if (type === 'anomaly') {
          highlightFocusChartAnomaly(record);
        } else if (type === 'annotation') {
          boundHighlightFocusChartAnnotation(record);
        }
      }

      const unhighlightFocusChartAnomaly = this.unhighlightFocusChartAnomaly.bind(this);
      const boundUnhighlightFocusChartAnnotation = unhighlightFocusChartAnnotation.bind(this);
      function tableRecordMouseleaveListener({ record, type = 'anomaly' }) {
        if (type === 'anomaly') {
          unhighlightFocusChartAnomaly(record);
        } else {
          boundUnhighlightFocusChartAnnotation(record);
        }
      }

      this.rowMouseenterSubscriber = mlTableService.rowMouseenter$.subscribe(
        tableRecordMousenterListener
      );
      this.rowMouseleaveSubscriber = mlTableService.rowMouseleave$.subscribe(
        tableRecordMouseleaveListener
      );

      this.renderChart();
      this.drawContextChartSelection();
      this.renderFocusChart();
    }

    componentDidUpdate() {
      if (this.props.skipRefresh) {
        return;
      }

      if (this.props.renderFocusChartOnly === false) {
        this.renderChart();
        this.drawContextChartSelection();
      }

      this.renderFocusChart();

      if (mlAnnotationsEnabled && this.props.annotation === null) {
        const chartElement = d3.select(this.rootNode);
        chartElement.select('g.mlAnnotationBrush').call(this.annotateBrush.extent([0, 0]));
      }
    }

    renderChart() {
      const {
        contextChartData,
        contextForecastData,
        detectorIndex,
        modelPlotEnabled,
        selectedJob,
        svgWidth,
      } = this.props;

      const createFocusChart = this.createFocusChart.bind(this);
      const drawContextElements = this.drawContextElements.bind(this);
      const focusXScale = this.focusXScale;
      const focusYAxis = this.focusYAxis;
      const focusYScale = this.focusYScale;

      const svgHeight = getSvgHeight();

      // Clear any existing elements from the visualization,
      // then build the svg elements for the bubble chart.
      const chartElement = d3.select(this.rootNode);
      chartElement.selectAll('*').remove();

      if (typeof selectedJob !== 'undefined') {
        this.fieldFormat = mlFieldFormatService.getFieldFormat(selectedJob.job_id, detectorIndex);
      } else {
        return;
      }

      if (contextChartData === undefined) {
        return;
      }

      const fieldFormat = this.fieldFormat;

      const svg = chartElement
        .append('svg')
        .attr('width', svgWidth)
        .attr('height', svgHeight);

      let contextDataMin;
      let contextDataMax;
      if (
        modelPlotEnabled === true ||
        (contextForecastData !== undefined && contextForecastData.length > 0)
      ) {
        const combinedData =
          contextForecastData === undefined
            ? contextChartData
            : contextChartData.concat(contextForecastData);

        contextDataMin = d3.min(combinedData, d => Math.min(d.value, d.lower));
        contextDataMax = d3.max(combinedData, d => Math.max(d.value, d.upper));
      } else {
        contextDataMin = d3.min(contextChartData, d => d.value);
        contextDataMax = d3.max(contextChartData, d => d.value);
      }

      // Set the size of the left margin according to the width of the largest y axis tick label.
      // The min / max of the aggregated context chart data may be less than the min / max of the
      // data which is displayed in the focus chart which is likely to be plotted at a lower
      // aggregation interval. Therefore ceil the min / max with the higher absolute value to allow
      // for extra space for chart labels which may have higher values than the context data
      // e.g. aggregated max may be 9500, whereas focus plot max may be 11234.
      const ceiledMax =
        contextDataMax > 0
          ? Math.pow(10, Math.ceil(Math.log10(Math.abs(contextDataMax))))
          : contextDataMax;

      const flooredMin =
        contextDataMin >= 0
          ? contextDataMin
          : -1 * Math.pow(10, Math.ceil(Math.log10(Math.abs(contextDataMin))));

      // Temporarily set the domain of the focus y axis to the min / max of the full context chart
      // data range so that we can measure the maximum tick label width on temporary text elements.
      focusYScale.domain([flooredMin, ceiledMax]);

      let maxYAxisLabelWidth = 0;
      const tempLabelText = svg.append('g').attr('class', 'temp-axis-label tick');
      tempLabelText
        .selectAll('text.temp.axis')
        .data(focusYScale.ticks())
        .enter()
        .append('text')
        .text(d => {
          if (fieldFormat !== undefined) {
            return fieldFormat.convert(d, TEXT_CONTENT_TYPE);
          } else {
            return focusYScale.tickFormat()(d);
          }
        })
        .each(function() {
          maxYAxisLabelWidth = Math.max(
            this.getBBox().width + focusYAxis.tickPadding(),
            maxYAxisLabelWidth
          );
        })
        .remove();
      d3.select('.temp-axis-label').remove();

      margin.left = Math.max(maxYAxisLabelWidth, 40);
      this.vizWidth = Math.max(svgWidth - margin.left - margin.right, 0);
      focusXScale.range([0, this.vizWidth]);
      focusYAxis.innerTickSize(-this.vizWidth);

      const focus = svg
        .append('g')
        .attr('class', 'focus-chart')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

      const context = svg
        .append('g')
        .attr('class', 'context-chart')
        .attr(
          'transform',
          'translate(' + margin.left + ',' + (focusHeight + margin.top + chartSpacing) + ')'
        );

      // Mask to hide annotations overflow
      if (mlAnnotationsEnabled) {
        const annotationsMask = svg
          .append('defs')
          .append('mask')
          .attr('id', ANNOTATION_MASK_ID);

        annotationsMask
          .append('rect')
          .attr('x', 0)
          .attr('y', 0)
          .attr('width', this.vizWidth)
          .attr('height', focusHeight)
          .style('fill', 'white');
      }

      // Draw each of the component elements.
      createFocusChart(focus, this.vizWidth, focusHeight);
      drawContextElements(context, this.vizWidth, contextChartHeight, swimlaneHeight);
    }

    drawContextChartSelection() {
      const {
        contextChartData,
        contextChartSelected,
        contextForecastData,
        zoomFrom,
        zoomTo,
      } = this.props;

      if (contextChartData === undefined) {
        return;
      }

      // Make appropriate selection in the context chart to trigger loading of the focus chart.
      let focusLoadFrom;
      let focusLoadTo;
      const contextXMin = this.contextXScale.domain()[0].getTime();
      const contextXMax = this.contextXScale.domain()[1].getTime();

      let combinedData = contextChartData;
      if (contextForecastData !== undefined) {
        combinedData = combinedData.concat(contextForecastData);
      }

      if (zoomFrom) {
        focusLoadFrom = zoomFrom.getTime();
      } else {
        focusLoadFrom = _.reduce(
          combinedData,
          (memo, point) => Math.min(memo, point.date.getTime()),
          new Date(2099, 12, 31).getTime()
        );
      }
      focusLoadFrom = Math.max(focusLoadFrom, contextXMin);

      if (zoomTo) {
        focusLoadTo = zoomTo.getTime();
      } else {
        focusLoadTo = _.reduce(
          combinedData,
          (memo, point) => Math.max(memo, point.date.getTime()),
          0
        );
      }
      focusLoadTo = Math.min(focusLoadTo, contextXMax);

      if (focusLoadFrom !== contextXMin || focusLoadTo !== contextXMax) {
        this.setContextBrushExtent(new Date(focusLoadFrom), new Date(focusLoadTo), true);
        const newSelectedBounds = {
          min: moment(new Date(focusLoadFrom)),
          max: moment(focusLoadFrom),
        };
        this.selectedBounds = newSelectedBounds;
      } else {
        // Don't set the brush if the selection is the full context chart domain.
        this.setBrushVisibility(false);
        const contextXScaleDomain = this.contextXScale.domain();
        const newSelectedBounds = {
          min: moment(new Date(contextXScaleDomain[0])),
          max: moment(contextXScaleDomain[1]),
        };
        if (!_.isEqual(newSelectedBounds, this.selectedBounds)) {
          this.selectedBounds = newSelectedBounds;
          contextChartSelected({ from: contextXScaleDomain[0], to: contextXScaleDomain[1] });
        }
      }
    }

    createFocusChart(fcsGroup, fcsWidth, fcsHeight) {
      // Split out creation of the focus chart from the rendering,
      // as we want to re-render the paths and points when the zoom area changes.

      const { contextForecastData } = this.props;

      // Add a group at the top to display info on the chart aggregation interval
      // and links to set the brush span to 1h, 1d, 1w etc.
      const zoomGroup = fcsGroup.append('g').attr('class', 'focus-zoom');
      zoomGroup
        .append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', fcsWidth)
        .attr('height', focusZoomPanelHeight)
        .attr('class', 'chart-border');
      this.createZoomInfoElements(zoomGroup, fcsWidth);

      // Create the elements for annotations
      if (mlAnnotationsEnabled) {
        const annotateBrush = this.annotateBrush.bind(this);

        let brushX = 0;
        let brushWidth = 0;

        if (this.props.annotation !== null) {
          // If the annotation brush is showing, set it to the same position
          brushX = this.focusXScale(this.props.annotation.timestamp);
          brushWidth = getAnnotationWidth(this.props.annotation, this.focusXScale);
        }

        fcsGroup
          .append('g')
          .attr('class', 'mlAnnotationBrush')
          .call(annotateBrush)
          .selectAll('rect')
          .attr('x', brushX)
          .attr('y', focusZoomPanelHeight)
          .attr('width', brushWidth)
          .attr('height', focusChartHeight);

        fcsGroup.append('g').classed('mlAnnotations', true);
      }

      // Add border round plot area.
      fcsGroup
        .append('rect')
        .attr('x', 0)
        .attr('y', focusZoomPanelHeight)
        .attr('width', fcsWidth)
        .attr('height', focusChartHeight)
        .attr('class', 'chart-border');

      // Add background for x axis.
      const xAxisBg = fcsGroup.append('g').attr('class', 'x-axis-background');
      xAxisBg
        .append('rect')
        .attr('x', 0)
        .attr('y', fcsHeight)
        .attr('width', fcsWidth)
        .attr('height', chartSpacing);
      xAxisBg
        .append('line')
        .attr('x1', 0)
        .attr('y1', fcsHeight)
        .attr('x2', 0)
        .attr('y2', fcsHeight + chartSpacing);
      xAxisBg
        .append('line')
        .attr('x1', fcsWidth)
        .attr('y1', fcsHeight)
        .attr('x2', fcsWidth)
        .attr('y2', fcsHeight + chartSpacing);
      xAxisBg
        .append('line')
        .attr('x1', 0)
        .attr('y1', fcsHeight + chartSpacing)
        .attr('x2', fcsWidth)
        .attr('y2', fcsHeight + chartSpacing);

      const axes = fcsGroup.append('g');
      axes
        .append('g')
        .attr('class', 'x axis')
        .attr('transform', 'translate(0,' + fcsHeight + ')');
      axes.append('g').attr('class', 'y axis');

      // Create the elements for the metric value line and model bounds area.
      fcsGroup.append('path').attr('class', 'area bounds');
      fcsGroup.append('path').attr('class', 'values-line');
      fcsGroup.append('g').attr('class', 'focus-chart-markers');

      // Create the path elements for the forecast value line and bounds area.
      if (contextForecastData) {
        fcsGroup.append('path').attr('class', 'area forecast');
        fcsGroup.append('path').attr('class', 'values-line forecast');
        fcsGroup.append('g').attr('class', 'focus-chart-markers forecast');
      }

      fcsGroup
        .append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', fcsWidth)
        .attr('height', fcsHeight + 24)
        .attr('class', 'chart-border chart-border-highlight');
    }

    renderFocusChart() {
      const {
        focusAggregationInterval,
        focusAnnotationData,
        focusChartData,
        focusForecastData,
        modelPlotEnabled,
        selectedJob,
        showAnnotations,
        showForecast,
        showModelBounds,
        intl,
        zoomFromFocusLoaded,
        zoomToFocusLoaded,
      } = this.props;

      if (focusChartData === undefined) {
        return;
      }

      const data = focusChartData;

      const contextYScale = this.contextYScale;
      const showFocusChartTooltip = this.showFocusChartTooltip.bind(this);

      const focusChart = d3.select('.focus-chart');

      // Update the plot interval labels.
      const focusAggInt = focusAggregationInterval.expression;
      const bucketSpan = selectedJob.analysis_config.bucket_span;
      const chartElement = d3.select(this.rootNode);
      chartElement.select('.zoom-aggregation-interval').text(
        intl.formatMessage(
          {
            id: 'xpack.ml.timeSeriesExplorer.timeSeriesChart.zoomAggregationIntervalLabel',
            defaultMessage: '(aggregation interval: {focusAggInt}, bucket span: {bucketSpan})',
          },
          { focusAggInt, bucketSpan }
        )
      );

      // Render the axes.

      // Calculate the x axis domain.
      // Elasticsearch aggregation returns points at start of bucket,
      // so set the x-axis min to the start of the first aggregation interval,
      // and the x-axis max to the end of the last aggregation interval.
      if (zoomFromFocusLoaded === undefined || zoomToFocusLoaded === undefined) {
        return;
      }
      const bounds = {
        min: moment(zoomFromFocusLoaded.getTime()),
        max: moment(zoomToFocusLoaded.getTime()),
      };

      const aggMs = focusAggregationInterval.asMilliseconds();
      const earliest = moment(Math.floor(bounds.min.valueOf() / aggMs) * aggMs);
      const latest = moment(Math.ceil(bounds.max.valueOf() / aggMs) * aggMs);
      this.focusXScale.domain([earliest.toDate(), latest.toDate()]);

      // Calculate the y-axis domain.
      if (
        focusChartData.length > 0 ||
        (focusForecastData !== undefined && focusForecastData.length > 0)
      ) {
        if (this.fieldFormat !== undefined) {
          this.focusYAxis.tickFormat(d => this.fieldFormat.convert(d, TEXT_CONTENT_TYPE));
        } else {
          // Use default tick formatter.
          this.focusYAxis.tickFormat(null);
        }

        // Calculate the min/max of the metric data and the forecast data.
        let yMin = 0;
        let yMax = 0;

        let combinedData = data;
        if (focusForecastData !== undefined && focusForecastData.length > 0) {
          combinedData = data.concat(focusForecastData);
        }

        yMin = d3.min(combinedData, d => {
          let metricValue = d.value;
          if (metricValue === null && d.anomalyScore !== undefined && d.actual !== undefined) {
            // If an anomaly coincides with a gap in the data, use the anomaly actual value.
            metricValue = Array.isArray(d.actual) ? d.actual[0] : d.actual;
          }
          if (d.lower !== undefined) {
            if (metricValue !== null && metricValue !== undefined) {
              return Math.min(metricValue, d.lower);
            } else {
              // Set according to the minimum of the lower of the model plot results.
              return d.lower;
            }
          }
          return metricValue;
        });
        yMax = d3.max(combinedData, d => {
          let metricValue = d.value;
          if (metricValue === null && d.anomalyScore !== undefined && d.actual !== undefined) {
            // If an anomaly coincides with a gap in the data, use the anomaly actual value.
            metricValue = Array.isArray(d.actual) ? d.actual[0] : d.actual;
          }
          return d.upper !== undefined ? Math.max(metricValue, d.upper) : metricValue;
        });

        if (yMax === yMin) {
          if (
            this.contextYScale.domain()[0] !== contextYScale.domain()[1] &&
            yMin >= contextYScale.domain()[0] &&
            yMax <= contextYScale.domain()[1]
          ) {
            // Set the focus chart limits to be the same as the context chart.
            yMin = contextYScale.domain()[0];
            yMax = contextYScale.domain()[1];
          } else {
            yMin -= yMin * 0.05;
            yMax += yMax * 0.05;
          }
        }

        // if annotations are present, we extend yMax to avoid overlap
        // between annotation labels, chart lines and anomalies.
        if (mlAnnotationsEnabled && focusAnnotationData && focusAnnotationData.length > 0) {
          const levels = getAnnotationLevels(focusAnnotationData);
          const maxLevel = d3.max(Object.keys(levels).map(key => levels[key]));
          // TODO needs revisiting to be a more robust normalization
          yMax = yMax * (1 + (maxLevel + 1) / 5);
        }
        this.focusYScale.domain([yMin, yMax]);
      } else {
        // Display 10 unlabelled ticks.
        this.focusYScale.domain([0, 10]);
        this.focusYAxis.tickFormat('');
      }

      // Get the scaled date format to use for x axis tick labels.
      const timeBuckets = new TimeBuckets();
      timeBuckets.setInterval('auto');
      timeBuckets.setBounds(bounds);
      const xAxisTickFormat = timeBuckets.getScaledDateFormat();
      focusChart.select('.x.axis').call(
        this.focusXAxis
          .ticks(numTicksForDateFormat(this.vizWidth), xAxisTickFormat)
          .tickFormat(d => {
            return moment(d).format(xAxisTickFormat);
          })
      );
      focusChart.select('.y.axis').call(this.focusYAxis);

      filterAxisLabels(focusChart.select('.x.axis'), this.vizWidth);

      // Render the bounds area and values line.
      if (modelPlotEnabled === true) {
        focusChart
          .select('.area.bounds')
          .attr('d', this.focusBoundedArea(data))
          .classed('hidden', !showModelBounds);
      }

      if (mlAnnotationsEnabled) {
        renderAnnotations(
          focusChart,
          focusAnnotationData,
          focusZoomPanelHeight,
          focusChartHeight,
          this.focusXScale,
          showAnnotations,
          showFocusChartTooltip
        );

        // disable brushing (creation of annotations) when annotations aren't shown
        focusChart.select('.mlAnnotationBrush').style('display', showAnnotations ? null : 'none');
      }

      focusChart.select('.values-line').attr('d', this.focusValuesLine(data));
      drawLineChartDots(data, focusChart, this.focusValuesLine);

      // Render circle markers for the points.
      // These are used for displaying tooltips on mouseover.
      // Don't render dots where value=null (data gaps, with no anomalies)
      // or for multi-bucket anomalies.
      const dots = d3
        .select('.focus-chart-markers')
        .selectAll('.metric-value')
        .data(
          data.filter(
            d =>
              (d.value !== null || typeof d.anomalyScore === 'number') &&
              !showMultiBucketAnomalyMarker(d)
          )
        );

      // Remove dots that are no longer needed i.e. if number of chart points has decreased.
      dots.exit().remove();
      // Create any new dots that are needed i.e. if number of chart points has increased.
      dots
        .enter()
        .append('circle')
        .attr('r', LINE_CHART_ANOMALY_RADIUS)
        .on('mouseover', function(d) {
          showFocusChartTooltip(d, this);
        })
        .on('mouseout', () => mlChartTooltipService.hide());

      // Update all dots to new positions.
      dots
        .attr('cx', d => {
          return this.focusXScale(d.date);
        })
        .attr('cy', d => {
          return this.focusYScale(d.value);
        })
        .attr('class', d => {
          let markerClass = 'metric-value';
          if (_.has(d, 'anomalyScore')) {
            markerClass += ` anomaly-marker ${getSeverityWithLow(d.anomalyScore).id}`;
          }
          return markerClass;
        });

      // Render cross symbols for any multi-bucket anomalies.
      const multiBucketMarkers = d3
        .select('.focus-chart-markers')
        .selectAll('.multi-bucket')
        .data(
          data.filter(d => d.anomalyScore !== null && showMultiBucketAnomalyMarker(d) === true)
        );

      // Remove multi-bucket markers that are no longer needed.
      multiBucketMarkers.exit().remove();

      // Add any new markers that are needed i.e. if number of multi-bucket points has increased.
      multiBucketMarkers
        .enter()
        .append('path')
        .attr(
          'd',
          d3.svg
            .symbol()
            .size(MULTI_BUCKET_SYMBOL_SIZE)
            .type('cross')
        )
        .on('mouseover', function(d) {
          showFocusChartTooltip(d, this);
        })
        .on('mouseout', () => mlChartTooltipService.hide());

      // Update all markers to new positions.
      multiBucketMarkers
        .attr(
          'transform',
          d => `translate(${this.focusXScale(d.date)}, ${this.focusYScale(d.value)})`
        )
        .attr('class', d => `anomaly-marker multi-bucket ${getSeverityWithLow(d.anomalyScore).id}`);

      // Add rectangular markers for any scheduled events.
      const scheduledEventMarkers = d3
        .select('.focus-chart-markers')
        .selectAll('.scheduled-event-marker')
        .data(data.filter(d => d.scheduledEvents !== undefined));

      // Remove markers that are no longer needed i.e. if number of chart points has decreased.
      scheduledEventMarkers.exit().remove();

      // Create any new markers that are needed i.e. if number of chart points has increased.
      scheduledEventMarkers
        .enter()
        .append('rect')
        .attr('width', LINE_CHART_ANOMALY_RADIUS * 2)
        .attr('height', SCHEDULED_EVENT_SYMBOL_HEIGHT)
        .attr('class', 'scheduled-event-marker')
        .attr('rx', 1)
        .attr('ry', 1);

      // Update all markers to new positions.
      scheduledEventMarkers
        .attr('x', d => this.focusXScale(d.date) - LINE_CHART_ANOMALY_RADIUS)
        .attr('y', d => this.focusYScale(d.value) - 3);

      // Plot any forecast data in scope.
      if (focusForecastData !== undefined) {
        focusChart
          .select('.area.forecast')
          .attr('d', this.focusBoundedArea(focusForecastData))
          .classed('hidden', !showForecast);
        focusChart
          .select('.values-line.forecast')
          .attr('d', this.focusValuesLine(focusForecastData))
          .classed('hidden', !showForecast);

        const forecastDots = d3
          .select('.focus-chart-markers.forecast')
          .selectAll('.metric-value')
          .data(focusForecastData);

        // Remove dots that are no longer needed i.e. if number of forecast points has decreased.
        forecastDots.exit().remove();
        // Create any new dots that are needed i.e. if number of forecast points has increased.
        forecastDots
          .enter()
          .append('circle')
          .attr('r', LINE_CHART_ANOMALY_RADIUS)
          .on('mouseover', function(d) {
            showFocusChartTooltip(d, this);
          })
          .on('mouseout', () => mlChartTooltipService.hide());

        // Update all dots to new positions.
        forecastDots
          .attr('cx', d => {
            return this.focusXScale(d.date);
          })
          .attr('cy', d => {
            return this.focusYScale(d.value);
          })
          .attr('class', 'metric-value')
          .classed('hidden', !showForecast);
      }
    }

    createZoomInfoElements(zoomGroup, fcsWidth) {
      const { autoZoomDuration, modelPlotEnabled, timefilter, intl } = this.props;

      const setZoomInterval = this.setZoomInterval.bind(this);

      // Create zoom duration links applicable for the current time span.
      // Don't add links for any durations which would give a brush extent less than 10px.
      const bounds = timefilter.getActiveBounds();
      const boundsSecs = bounds.max.unix() - bounds.min.unix();
      const minSecs = (10 / this.vizWidth) * boundsSecs;

      let xPos = 10;
      const zoomLabel = zoomGroup
        .append('text')
        .attr('x', xPos)
        .attr('y', 17)
        .attr('class', 'zoom-info-text')
        .text(
          intl.formatMessage({
            id: 'xpack.ml.timeSeriesExplorer.timeSeriesChart.zoomLabel',
            defaultMessage: 'Zoom:',
          })
        );

      const zoomOptions = [{ durationMs: autoZoomDuration, label: 'auto' }];
      _.each(ZOOM_INTERVAL_OPTIONS, option => {
        if (option.duration.asSeconds() > minSecs && option.duration.asSeconds() < boundsSecs) {
          zoomOptions.push({ durationMs: option.duration.asMilliseconds(), label: option.label });
        }
      });
      xPos += zoomLabel.node().getBBox().width + 4;

      _.each(zoomOptions, option => {
        const text = zoomGroup
          .append('a')
          .attr('data-ms', option.durationMs)
          .attr('href', '')
          .append('text')
          .attr('x', xPos)
          .attr('y', 17)
          .attr('class', 'zoom-info-text')
          .text(option.label);

        xPos += text.node().getBBox().width + 4;
      });

      zoomGroup
        .append('text')
        .attr('x', xPos + 6)
        .attr('y', 17)
        .attr('class', 'zoom-info-text zoom-aggregation-interval')
        .text(
          intl.formatMessage({
            id: 'xpack.ml.timeSeriesExplorer.timeSeriesChart.zoomGroupAggregationIntervalLabel',
            defaultMessage: '(aggregation interval: , bucket span: )',
          })
        );

      if (modelPlotEnabled === false) {
        const modelPlotLabel = zoomGroup
          .append('text')
          .attr('x', 300)
          .attr('y', 17)
          .attr('class', 'zoom-info-text')
          .text(
            intl.formatMessage({
              id: 'xpack.ml.timeSeriesExplorer.timeSeriesChart.modelBoundsNotAvailableLabel',
              defaultMessage: 'Model bounds are not available',
            })
          );

        modelPlotLabel.attr('x', fcsWidth - (modelPlotLabel.node().getBBox().width + 10));
      }

      const chartElement = d3.select(this.rootNode);
      chartElement.selectAll('.focus-zoom a').on('click', function() {
        d3.event.preventDefault();
        setZoomInterval(d3.select(this).attr('data-ms'));
      });
    }

    drawContextElements(cxtGroup, cxtWidth, cxtChartHeight, swlHeight) {
      const { contextChartData, contextForecastData, modelPlotEnabled, timefilter } = this.props;

      const data = contextChartData;

      this.contextXScale = d3.time
        .scale()
        .range([0, cxtWidth])
        .domain(this.calculateContextXAxisDomain());

      const combinedData =
        contextForecastData === undefined ? data : data.concat(contextForecastData);
      const valuesRange = { min: Number.MAX_VALUE, max: Number.MIN_VALUE };
      _.each(combinedData, item => {
        valuesRange.min = Math.min(item.value, valuesRange.min);
        valuesRange.max = Math.max(item.value, valuesRange.max);
      });
      let dataMin = valuesRange.min;
      let dataMax = valuesRange.max;
      const chartLimits = { min: dataMin, max: dataMax };

      if (
        modelPlotEnabled === true ||
        (contextForecastData !== undefined && contextForecastData.length > 0)
      ) {
        const boundsRange = { min: Number.MAX_VALUE, max: Number.MIN_VALUE };
        _.each(combinedData, item => {
          boundsRange.min = Math.min(item.lower, boundsRange.min);
          boundsRange.max = Math.max(item.upper, boundsRange.max);
        });
        dataMin = Math.min(dataMin, boundsRange.min);
        dataMax = Math.max(dataMax, boundsRange.max);

        // Set the y axis domain so that the range of actual values takes up at least 50% of the full range.
        if (valuesRange.max - valuesRange.min < 0.5 * (dataMax - dataMin)) {
          if (valuesRange.min > dataMin) {
            chartLimits.min = valuesRange.min - 0.5 * (valuesRange.max - valuesRange.min);
          }

          if (valuesRange.max < dataMax) {
            chartLimits.max = valuesRange.max + 0.5 * (valuesRange.max - valuesRange.min);
          }
        }
      }

      this.contextYScale = d3.scale
        .linear()
        .range([cxtChartHeight, contextChartLineTopMargin])
        .domain([chartLimits.min, chartLimits.max]);

      const borders = cxtGroup.append('g').attr('class', 'axis');

      // Add borders left and right.
      borders
        .append('line')
        .attr('x1', 0)
        .attr('y1', 0)
        .attr('x2', 0)
        .attr('y2', cxtChartHeight + swlHeight);
      borders
        .append('line')
        .attr('x1', cxtWidth)
        .attr('y1', 0)
        .attr('x2', cxtWidth)
        .attr('y2', cxtChartHeight + swlHeight);

      // Add x axis.
      const bounds = timefilter.getActiveBounds();
      const timeBuckets = new TimeBuckets();
      timeBuckets.setInterval('auto');
      timeBuckets.setBounds(bounds);
      const xAxisTickFormat = timeBuckets.getScaledDateFormat();
      const xAxis = d3.svg
        .axis()
        .scale(this.contextXScale)
        .orient('top')
        .innerTickSize(-cxtChartHeight)
        .outerTickSize(0)
        .tickPadding(0)
        .ticks(numTicksForDateFormat(cxtWidth, xAxisTickFormat))
        .tickFormat(d => {
          return moment(d).format(xAxisTickFormat);
        });

      cxtGroup.datum(data);

      const contextBoundsArea = d3.svg
        .area()
        .x(d => {
          return this.contextXScale(d.date);
        })
        .y0(d => {
          return this.contextYScale(Math.min(chartLimits.max, Math.max(d.lower, chartLimits.min)));
        })
        .y1(d => {
          return this.contextYScale(Math.max(chartLimits.min, Math.min(d.upper, chartLimits.max)));
        })
        .defined(d => d.lower !== null && d.upper !== null);

      if (modelPlotEnabled === true) {
        cxtGroup
          .append('path')
          .datum(data)
          .attr('class', 'area context')
          .attr('d', contextBoundsArea);
      }

      const contextValuesLine = d3.svg
        .line()
        .x(d => {
          return this.contextXScale(d.date);
        })
        .y(d => {
          return this.contextYScale(d.value);
        })
        .defined(d => d.value !== null);

      cxtGroup
        .append('path')
        .datum(data)
        .attr('class', 'values-line')
        .attr('d', contextValuesLine);
      drawLineChartDots(data, cxtGroup, contextValuesLine, 1);

      // Create the path elements for the forecast value line and bounds area.
      if (contextForecastData !== undefined) {
        cxtGroup
          .append('path')
          .datum(contextForecastData)
          .attr('class', 'area forecast')
          .attr('d', contextBoundsArea);
        cxtGroup
          .append('path')
          .datum(contextForecastData)
          .attr('class', 'values-line forecast')
          .attr('d', contextValuesLine);
      }

      // Create and draw the anomaly swimlane.
      const swimlane = cxtGroup
        .append('g')
        .attr('class', 'swimlane')
        .attr('transform', 'translate(0,' + cxtChartHeight + ')');

      this.drawSwimlane(swimlane, cxtWidth, swlHeight);

      // Draw a mask over the sections of the context chart and swimlane
      // which fall outside of the zoom brush selection area.
      this.mask = new ContextChartMask(cxtGroup, contextChartData, modelPlotEnabled, swlHeight)
        .x(this.contextXScale)
        .y(this.contextYScale);

      // Draw the x axis on top of the mask so that the labels are visible.
      cxtGroup
        .append('g')
        .attr('class', 'x axis context-chart-axis')
        .call(xAxis);

      // Move the x axis labels up so that they are inside the contact chart area.
      cxtGroup.selectAll('.x.context-chart-axis text').attr('dy', cxtChartHeight - 5);

      filterAxisLabels(cxtGroup.selectAll('.x.context-chart-axis'), cxtWidth);

      this.drawContextBrush(cxtGroup);
    }

    drawContextBrush = contextGroup => {
      const { contextChartSelected } = this.props;

      const brush = this.brush;
      const contextXScale = this.contextXScale;
      const mask = this.mask;

      // Create the brush for zooming in to the focus area of interest.
      brush
        .x(contextXScale)
        .on('brush', brushing)
        .on('brushend', brushed);

      contextGroup
        .append('g')
        .attr('class', 'x brush')
        .call(brush)
        .selectAll('rect')
        .attr('y', -1)
        .attr('height', contextChartHeight + swimlaneHeight + 1);

      // move the left and right resize areas over to
      // be under the handles
      contextGroup
        .selectAll('.w rect')
        .attr('x', -10)
        .attr('width', 10);

      contextGroup
        .selectAll('.e rect')
        .attr('x', 0)
        .attr('width', 10);

      const handleBrushExtent = brush.extent();

      const topBorder = contextGroup
        .append('rect')
        .attr('class', 'top-border')
        .attr('y', -2)
        .attr('height', contextChartLineTopMargin);

      // Draw the brush handles using SVG foreignObject elements.
      // Note these are not supported on IE11 and below, so will not appear in IE.
      const leftHandle = contextGroup
        .append('foreignObject')
        .attr('width', 10)
        .attr('height', 90)
        .attr('class', 'brush-handle')
        .attr('x', contextXScale(handleBrushExtent[0]) - 10)
        .html(
          '<div class="brush-handle-inner brush-handle-inner-left"><i class="fa fa-caret-left"></i></div>'
        );
      const rightHandle = contextGroup
        .append('foreignObject')
        .attr('width', 10)
        .attr('height', 90)
        .attr('class', 'brush-handle')
        .attr('x', contextXScale(handleBrushExtent[1]) + 0)
        .html(
          '<div class="brush-handle-inner brush-handle-inner-right"><i class="fa fa-caret-right"></i></div>'
        );

      const showBrush = show => {
        if (show === true) {
          const brushExtent = brush.extent();
          mask.reveal(brushExtent);
          leftHandle.attr('x', contextXScale(brushExtent[0]) - 10);
          rightHandle.attr('x', contextXScale(brushExtent[1]) + 0);

          topBorder.attr('x', contextXScale(brushExtent[0]) + 1);
          // Use Math.max(0, ...) to make sure we don't end up
          // with a negative width which would cause an SVG error.
          topBorder.attr(
            'width',
            Math.max(0, contextXScale(brushExtent[1]) - contextXScale(brushExtent[0]) - 2)
          );
        }

        this.setBrushVisibility(show);
      };

      showBrush(!brush.empty());

      function brushing() {
        const isEmpty = brush.empty();
        showBrush(!isEmpty);
      }

      const that = this;
      function brushed() {
        const isEmpty = brush.empty();

        const selectedBounds = isEmpty ? contextXScale.domain() : brush.extent();
        const selectionMin = selectedBounds[0].getTime();
        const selectionMax = selectedBounds[1].getTime();

        // Avoid triggering an update if bounds haven't changed
        if (
          that.selectedBounds !== undefined &&
          that.selectedBounds.min.valueOf() === selectionMin &&
          that.selectedBounds.max.valueOf() === selectionMax
        ) {
          return;
        }

        showBrush(!isEmpty);

        // Set the color of the swimlane cells according to whether they are inside the selection.
        contextGroup.selectAll('.swimlane-cell').style('fill', d => {
          const cellMs = d.date.getTime();
          if (cellMs < selectionMin || cellMs > selectionMax) {
            return anomalyGrayScale(d.score);
          } else {
            return anomalyColorScale(d.score);
          }
        });

        that.selectedBounds = { min: moment(selectionMin), max: moment(selectionMax) };
        contextChartSelected({ from: selectedBounds[0], to: selectedBounds[1] });
      }
    };

    setBrushVisibility = show => {
      const mask = this.mask;

      if (mask !== undefined) {
        const visibility = show ? 'visible' : 'hidden';
        mask.style('visibility', visibility);

        d3.selectAll('.brush').style('visibility', visibility);

        const brushHandles = d3.selectAll('.brush-handle-inner');
        brushHandles.style('visibility', visibility);

        const topBorder = d3.selectAll('.top-border');
        topBorder.style('visibility', visibility);

        const border = d3.selectAll('.chart-border-highlight');
        border.style('visibility', visibility);
      }
    };

    drawSwimlane = (swlGroup, swlWidth, swlHeight) => {
      const { contextAggregationInterval, swimlaneData } = this.props;

      const data = swimlaneData;

      if (typeof data === 'undefined') {
        return;
      }

      // Calculate the x axis domain.
      // Elasticsearch aggregation returns points at start of bucket, so set the
      // x-axis min to the start of the aggregation interval.
      // Need to use the min(earliest) and max(earliest) of the context chart
      // aggregation to align the axes of the chart and swimlane elements.
      const xAxisDomain = this.calculateContextXAxisDomain();
      const x = d3.time
        .scale()
        .range([0, swlWidth])
        .domain(xAxisDomain);

      const y = d3.scale
        .linear()
        .range([swlHeight, 0])
        .domain([0, swlHeight]);

      const xAxis = d3.svg
        .axis()
        .scale(x)
        .orient('bottom')
        .innerTickSize(-swlHeight)
        .outerTickSize(0);

      const yAxis = d3.svg
        .axis()
        .scale(y)
        .orient('left')
        .tickValues(y.domain())
        .innerTickSize(-swlWidth)
        .outerTickSize(0);

      const axes = swlGroup.append('g');

      axes
        .append('g')
        .attr('class', 'x axis')
        .attr('transform', 'translate(0,' + swlHeight + ')')
        .call(xAxis);

      axes
        .append('g')
        .attr('class', 'y axis')
        .call(yAxis);

      const earliest = xAxisDomain[0].getTime();
      const latest = xAxisDomain[1].getTime();
      const swimlaneAggMs = contextAggregationInterval.asMilliseconds();
      let cellWidth = swlWidth / ((latest - earliest) / swimlaneAggMs);
      if (cellWidth < 1) {
        cellWidth = 1;
      }

      const cells = swlGroup
        .append('g')
        .attr('class', 'swimlane-cells')
        .selectAll('rect')
        .data(data);

      cells
        .enter()
        .append('rect')
        .attr('x', d => {
          return x(d.date);
        })
        .attr('y', 0)
        .attr('rx', 0)
        .attr('ry', 0)
        .attr('class', d => {
          return d.score > 0 ? 'swimlane-cell' : 'swimlane-cell-hidden';
        })
        .attr('width', cellWidth)
        .attr('height', swlHeight)
        .style('fill', d => {
          return anomalyColorScale(d.score);
        });
    };

    calculateContextXAxisDomain = () => {
      const { contextAggregationInterval, swimlaneData, timefilter } = this.props;
      // Calculates the x axis domain for the context elements.
      // Elasticsearch aggregation returns points at start of bucket,
      // so set the x-axis min to the start of the first aggregation interval,
      // and the x-axis max to the end of the last aggregation interval.
      // Context chart and swimlane use the same aggregation interval.
      const bounds = timefilter.getActiveBounds();
      let earliest = bounds.min.valueOf();

      if (swimlaneData !== undefined && swimlaneData.length > 0) {
        // Adjust the earliest back to the time of the first swimlane point
        // if this is before the time filter minimum.
        earliest = Math.min(_.first(swimlaneData).date.getTime(), bounds.min.valueOf());
      }

      const contextAggMs = contextAggregationInterval.asMilliseconds();
      const earliestMs = Math.floor(earliest / contextAggMs) * contextAggMs;
      const latestMs = Math.ceil(bounds.max.valueOf() / contextAggMs) * contextAggMs;

      return [new Date(earliestMs), new Date(latestMs)];
    };

    // Sets the extent of the brush on the context chart to the
    // supplied from and to Date objects.
    setContextBrushExtent = (from, to, fireEvent) => {
      const brush = this.brush;
      const brushExtent = brush.extent();

      const newExtent = [from, to];
      if (
        newExtent[0].getTime() === brushExtent[0].getTime() &&
        newExtent[1].getTime() === brushExtent[1].getTime()
      ) {
        fireEvent = false;
      }

      brush.extent(newExtent);
      brush(d3.select('.brush'));
      if (fireEvent) {
        brush.event(d3.select('.brush'));
      }
    };

    setZoomInterval(ms) {
      const { timefilter, zoomTo } = this.props;

      const bounds = timefilter.getActiveBounds();
      const minBoundsMs = bounds.min.valueOf();
      const maxBoundsMs = bounds.max.valueOf();

      // Attempt to retain the same zoom end time.
      // If not, go back to the bounds start and add on the required millis.
      const millis = +ms;
      let to = zoomTo.getTime();
      let from = to - millis;
      if (from < minBoundsMs) {
        from = minBoundsMs;
        to = Math.min(minBoundsMs + millis, maxBoundsMs);
      }

      this.setContextBrushExtent(new Date(from), new Date(to), true);
    }

    showFocusChartTooltip(marker, circle) {
      const { modelPlotEnabled, intl } = this.props;

      const fieldFormat = this.fieldFormat;
      const seriesKey = 'single_metric_viewer';

      // Show the time and metric values in the tooltip.
      // Uses date, value, upper, lower and anomalyScore (optional) marker properties.
      const formattedDate = formatHumanReadableDateTimeSeconds(marker.date);
      const tooltipData = [{ name: formattedDate }];

      if (_.has(marker, 'anomalyScore')) {
        const score = parseInt(marker.anomalyScore);
        const displayScore = score > 0 ? score : '< 1';
        tooltipData.push({
          name: intl.formatMessage({
            id: 'xpack.ml.timeSeriesExplorer.timeSeriesChart.anomalyScoreLabel',
            defaultMessage: 'anomaly score',
          }),
          value: displayScore,
          color: anomalyColorScale(score),
          seriesKey,
          yAccessor: 'anomaly_score',
        });

        if (showMultiBucketAnomalyTooltip(marker) === true) {
          tooltipData.push({
            name: intl.formatMessage({
              id: 'xpack.ml.timeSeriesExplorer.timeSeriesChart.multiBucketImpactLabel',
              defaultMessage: 'multi-bucket impact',
            }),
            value: getMultiBucketImpactLabel(marker.multiBucketImpact),
            seriesKey,
            yAccessor: 'multi_bucket_impact',
          });
        }

        if (modelPlotEnabled === false) {
          // Show actual/typical when available except for rare detectors.
          // Rare detectors always have 1 as actual and the probability as typical.
          // Exposing those values in the tooltip with actual/typical labels might irritate users.
          if (_.has(marker, 'actual') && marker.function !== 'rare') {
            // Display the record actual in preference to the chart value, which may be
            // different depending on the aggregation interval of the chart.
            tooltipData.push({
              name: intl.formatMessage({
                id: 'xpack.ml.timeSeriesExplorer.timeSeriesChart.actualLabel',
                defaultMessage: 'actual',
              }),
              value: formatValue(marker.actual, marker.function, fieldFormat),
              seriesKey,
              yAccessor: 'actual',
            });
            tooltipData.push({
              name: intl.formatMessage({
                id: 'xpack.ml.timeSeriesExplorer.timeSeriesChart.typicalLabel',
                defaultMessage: 'typical',
              }),
              value: formatValue(marker.typical, marker.function, fieldFormat),
              seriesKey,
              yAccessor: 'typical',
            });
          } else {
            tooltipData.push({
              name: intl.formatMessage({
                id: 'xpack.ml.timeSeriesExplorer.timeSeriesChart.valueLabel',
                defaultMessage: 'value',
              }),
              value: formatValue(marker.value, marker.function, fieldFormat),
              seriesKey,
              yAccessor: 'value',
            });
            if (_.has(marker, 'byFieldName') && _.has(marker, 'numberOfCauses')) {
              const numberOfCauses = marker.numberOfCauses;
              // If numberOfCauses === 1, won't go into this block as actual/typical copied to top level fields.
              const byFieldName = mlEscape(marker.byFieldName);
              tooltipData.push({
                name: intl.formatMessage(
                  {
                    id:
                      'xpack.ml.timeSeriesExplorer.timeSeriesChart.moreThanOneUnusualByFieldValuesLabel',
                    defaultMessage: '{numberOfCauses}{plusSign} unusual {byFieldName} values',
                  },
                  {
                    numberOfCauses,
                    byFieldName,
                    // Maximum of 10 causes are stored in the record, so '10' may mean more than 10.
                    plusSign: numberOfCauses < 10 ? '' : '+',
                  }
                ),
                seriesKey,
                yAccessor: 'numberOfCauses',
              });
            }
          }
        } else {
          tooltipData.push({
            name: intl.formatMessage({
              id: 'xpack.ml.timeSeriesExplorer.timeSeriesChart.modelPlotEnabled.valueLabel',
              defaultMessage: 'value',
            }),
            value: formatValue(marker.value, marker.function, fieldFormat),
            seriesKey,
            yAccessor: 'value',
          });
          tooltipData.push({
            name: intl.formatMessage({
              id: 'xpack.ml.timeSeriesExplorer.timeSeriesChart.modelPlotEnabled.upperBoundsLabel',
              defaultMessage: 'upper bounds',
            }),
            value: formatValue(marker.upper, marker.function, fieldFormat),
            seriesKey,
            yAccessor: 'upper_bounds',
          });
          tooltipData.push({
            name: intl.formatMessage({
              id: 'xpack.ml.timeSeriesExplorer.timeSeriesChart.modelPlotEnabled.lowerBoundsLabel',
              defaultMessage: 'lower bounds',
            }),
            value: formatValue(marker.lower, marker.function, fieldFormat),
            seriesKey,
            yAccessor: 'lower_bounds',
          });
        }
      } else {
        // TODO - need better formatting for small decimals.
        if (_.get(marker, 'isForecast', false) === true) {
          tooltipData.push({
            name: intl.formatMessage({
              id: 'xpack.ml.timeSeriesExplorer.timeSeriesChart.withoutAnomalyScore.predictionLabel',
              defaultMessage: 'prediction',
            }),
            value: formatValue(marker.value, marker.function, fieldFormat),
            seriesKey,
            yAccessor: 'prediction',
          });
        } else {
          tooltipData.push({
            name: intl.formatMessage({
              id: 'xpack.ml.timeSeriesExplorer.timeSeriesChart.withoutAnomalyScore.valueLabel',
              defaultMessage: 'value',
            }),
            value: formatValue(marker.value, marker.function, fieldFormat),
            seriesKey,
            yAccessor: 'value',
          });
        }

        if (modelPlotEnabled === true) {
          tooltipData.push({
            name: intl.formatMessage({
              id:
                'xpack.ml.timeSeriesExplorer.timeSeriesChart.withoutAnomalyScoreAndModelPlotEnabled.upperBoundsLabel',
              defaultMessage: 'upper bounds',
            }),
            value: formatValue(marker.upper, marker.function, fieldFormat),
            seriesKey,
            yAccessor: 'upper_bounds',
          });
          tooltipData.push({
            name: intl.formatMessage({
              id:
                'xpack.ml.timeSeriesExplorer.timeSeriesChart.withoutAnomalyScoreAndModelPlotEnabled.lowerBoundsLabel',
              defaultMessage: 'lower bounds',
            }),
            value: formatValue(marker.lower, marker.function, fieldFormat),
            seriesKey,
            yAccessor: 'lower_bounds',
          });
        }
      }

      if (_.has(marker, 'scheduledEvents')) {
        marker.scheduledEvents.forEach((scheduledEvent, i) => {
          tooltipData.push({
            name: intl.formatMessage(
              {
                id: 'xpack.ml.timeSeriesExplorer.timeSeriesChart.scheduledEventsLabel',
                defaultMessage: 'scheduled event{counter}',
              },
              { counter: marker.scheduledEvents.length > 1 ? ` #${i + 1}` : '' }
            ),
            value: scheduledEvent,
            seriesKey,
            yAccessor: `scheduled_events_${i + 1}`,
          });
        });
      }

      if (mlAnnotationsEnabled && _.has(marker, 'annotation')) {
        tooltipData.length = 0;
        tooltipData.push({
          name: marker.annotation,
        });
        let timespan = moment(marker.timestamp).format('MMMM Do YYYY, HH:mm');

        if (typeof marker.end_timestamp !== 'undefined') {
          timespan += ` - ${moment(marker.end_timestamp).format('MMMM Do YYYY, HH:mm')}`;
        }
        tooltipData.push({
          name: timespan,
        });
      }

      mlChartTooltipService.show(tooltipData, circle, {
        x: LINE_CHART_ANOMALY_RADIUS * 2,
        y: 0,
      });
    }

    highlightFocusChartAnomaly(record) {
      // Highlights the anomaly marker in the focus chart corresponding to the specified record.

      const { focusChartData, focusAggregationInterval } = this.props;

      const focusXScale = this.focusXScale;
      const focusYScale = this.focusYScale;
      const showFocusChartTooltip = this.showFocusChartTooltip.bind(this);

      // Find the anomaly marker which corresponds to the time of the anomaly record.
      // Depending on the way the chart is aggregated, there may not be
      // a point at exactly the same time as the record being highlighted.
      const anomalyTime = record.source.timestamp;
      const markerToSelect = findChartPointForAnomalyTime(
        focusChartData,
        anomalyTime,
        focusAggregationInterval
      );

      // Render an additional highlighted anomaly marker on the focus chart.
      // TODO - plot anomaly markers for cases where there is an anomaly due
      // to the absence of data and model plot is enabled.
      if (markerToSelect !== undefined) {
        const selectedMarker = d3
          .select('.focus-chart-markers')
          .selectAll('.focus-chart-highlighted-marker')
          .data([markerToSelect]);
        if (showMultiBucketAnomalyMarker(markerToSelect) === true) {
          selectedMarker
            .enter()
            .append('path')
            .attr(
              'd',
              d3.svg
                .symbol()
                .size(MULTI_BUCKET_SYMBOL_SIZE)
                .type('cross')
            )
            .attr('transform', d => `translate(${focusXScale(d.date)}, ${focusYScale(d.value)})`)
            .attr(
              'class',
              d =>
                `anomaly-marker multi-bucket ${getSeverityWithLow(d.anomalyScore).id} highlighted`
            );
        } else {
          selectedMarker
            .enter()
            .append('circle')
            .attr('r', LINE_CHART_ANOMALY_RADIUS)
            .attr('cx', d => focusXScale(d.date))
            .attr('cy', d => focusYScale(d.value))
            .attr(
              'class',
              d =>
                `anomaly-marker metric-value ${getSeverityWithLow(d.anomalyScore).id} highlighted`
            );
        }

        // Display the chart tooltip for this marker.
        // Note the values of the record and marker may differ depending on the levels of aggregation.
        const chartElement = d3.select(this.rootNode);
        const anomalyMarker = chartElement.selectAll(
          '.focus-chart-markers .anomaly-marker.highlighted'
        );
        if (anomalyMarker.length) {
          showFocusChartTooltip(markerToSelect, anomalyMarker[0][0]);
        }
      }
    }

    unhighlightFocusChartAnomaly() {
      d3.select('.focus-chart-markers')
        .selectAll('.anomaly-marker.highlighted')
        .remove();
      mlChartTooltipService.hide();
    }

    shouldComponentUpdate() {
      return true;
    }

    setRef(componentNode) {
      this.rootNode = componentNode;
    }

    render() {
      return <div className="ml-timeseries-chart-react" ref={this.setRef.bind(this)} />;
    }
  }
);

export const TimeseriesChart = injectObservablesAsProps(
  { annotation: annotation$ },
  TimeseriesChartIntl
);
