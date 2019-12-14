/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import d3 from 'd3';
import { calculateTextWidth } from '../util/string_utils';
import { MULTI_BUCKET_IMPACT } from '../../common/constants/multi_bucket_impact';
import moment from 'moment';
import rison from 'rison-node';

import chrome from 'ui/chrome';
import { timefilter } from 'ui/timefilter';

import { CHART_TYPE } from '../explorer/explorer_constants';

export const LINE_CHART_ANOMALY_RADIUS = 7;
export const MULTI_BUCKET_SYMBOL_SIZE = 100; // In square pixels for use with d3 symbol.size
export const SCHEDULED_EVENT_SYMBOL_HEIGHT = 5;

const MAX_LABEL_WIDTH = 100;

export function chartLimits(data = []) {
  const domain = d3.extent(data, d => {
    let metricValue = d.value;
    if (metricValue === null && d.anomalyScore !== undefined && d.actual !== undefined) {
      // If an anomaly coincides with a gap in the data, use the anomaly actual value.
      metricValue = Array.isArray(d.actual) ? d.actual[0] : d.actual;
    }
    return metricValue;
  });
  const limits = { max: domain[1], min: domain[0] };

  if (limits.max === limits.min) {
    limits.max = d3.max(data, d => {
      if (d.typical) {
        return Math.max(d.value, d.typical);
      } else {
        // If analysis with by and over field, and more than one cause,
        // there will be no actual and typical value.
        // TODO - produce a better visual for population analyses.
        return d.value;
      }
    });
    limits.min = d3.min(data, d => {
      if (d.typical) {
        return Math.min(d.value, d.typical);
      } else {
        // If analysis with by and over field, and more than one cause,
        // there will be no actual and typical value.
        // TODO - produce a better visual for population analyses.
        return d.value;
      }
    });
  }

  // add padding of 5% of the difference between max and min
  // if we ended up with the same value for both of them
  if (limits.max === limits.min) {
    const padding = limits.max * 0.05;
    limits.max += padding;
    limits.min -= padding;
  }

  return limits;
}

export function drawLineChartDots(data, lineChartGroup, lineChartValuesLine, radius = 1.5) {
  // We need to do this because when creating a line for a chart which has data gaps,
  // if there are single datapoints without any valid data before and after them,
  // the lines created by using d3...defined() do not contain these data points.
  // So this function adds additional circle elements to display the single
  // datapoints in additional to the line created for the chart.

  // first reduce the dataset to data points
  // where the previous and next one don't contain any data
  const dotsData = data.reduce((p, c, i) => {
    const previous = data[i - 1];
    const next = data[i + 1];
    if (
      (typeof previous === 'undefined' || (previous && previous.value === null)) &&
      c.value !== null &&
      (typeof next === 'undefined' || (next && next.value === null))
    ) {
      p.push(c);
    }
    return p;
  }, []);

  // check if `g.values-dots` already exists, if not create it
  // in both cases assign the element to `dotGroup`
  const dotGroup = lineChartGroup.select('.values-dots').empty()
    ? lineChartGroup.append('g').classed('values-dots', true)
    : lineChartGroup.select('.values-dots');

  // use d3's enter/update/exit pattern to render the dots
  const dots = dotGroup.selectAll('circle').data(dotsData);

  dots
    .enter()
    .append('circle')
    .attr('r', radius);

  dots.attr('cx', lineChartValuesLine.x()).attr('cy', lineChartValuesLine.y());

  dots.exit().remove();
}

// this replicates Kibana's filterAxisLabels() behavior
// which can be found in ui/vislib/lib/axis/axis_labels.js
// axis labels which overflow the chart's boundaries will be removed
export function filterAxisLabels(selection, chartWidth) {
  if (selection === undefined || selection.selectAll === undefined) {
    throw new Error('Missing selection parameter');
  }

  selection
    .selectAll('.tick text')
    // don't refactor this to an arrow function because
    // we depend on using `this` here.
    .text(function() {
      const parent = d3.select(this.parentNode);
      const labelWidth = parent.node().getBBox().width;
      const labelXPos = d3.transform(parent.attr('transform')).translate[0];
      const minThreshold = labelXPos - labelWidth / 2;
      const maxThreshold = labelXPos + labelWidth / 2;
      if (minThreshold >= 0 && maxThreshold <= chartWidth) {
        return this.textContent;
      } else {
        parent.remove();
      }
    });
}

// feature flags for chart types
const EVENT_DISTRIBUTION_ENABLED = true;
const POPULATION_DISTRIBUTION_ENABLED = true;

// get the chart type based on its configuration
export function getChartType(config) {
  let chartType = CHART_TYPE.SINGLE_METRIC;
  if (
    EVENT_DISTRIBUTION_ENABLED &&
    config.functionDescription === 'rare' &&
    config.entityFields.some(f => f.fieldType === 'over') === false
  ) {
    chartType = CHART_TYPE.EVENT_DISTRIBUTION;
  } else if (
    POPULATION_DISTRIBUTION_ENABLED &&
    config.functionDescription !== 'rare' &&
    config.entityFields.some(f => f.fieldType === 'over') &&
    config.metricFunction !== null // Event distribution chart relies on the ML function mapping to an ES aggregation
  ) {
    chartType = CHART_TYPE.POPULATION_DISTRIBUTION;
  }

  if (
    chartType === CHART_TYPE.EVENT_DISTRIBUTION ||
    chartType === CHART_TYPE.POPULATION_DISTRIBUTION
  ) {
    // Check that the config does not use script fields defined in the datafeed config.
    if (config.datafeedConfig !== undefined && config.datafeedConfig.script_fields !== undefined) {
      const scriptFields = Object.keys(config.datafeedConfig.script_fields);
      const checkFields = config.entityFields.map(entity => entity.fieldName);
      if (config.metricFieldName) {
        checkFields.push(config.metricFieldName);
      }
      const usesScriptFields =
        checkFields.find(fieldName => scriptFields.includes(fieldName)) !== undefined;
      if (usesScriptFields === true) {
        // Only single metric chart type supports query of model plot data.
        chartType = CHART_TYPE.SINGLE_METRIC;
      }
    }
  }

  return chartType;
}

export function getExploreSeriesLink(series) {
  // Open the Single Metric dashboard over the same overall bounds and
  // zoomed in to the same time as the current chart.
  const bounds = timefilter.getActiveBounds();
  const from = bounds.min.toISOString(); // e.g. 2016-02-08T16:00:00.000Z
  const to = bounds.max.toISOString();

  const zoomFrom = moment(series.plotEarliest).toISOString();
  const zoomTo = moment(series.plotLatest).toISOString();

  // Pass the detector index and entity fields (i.e. by, over, partition fields)
  // to identify the particular series to view.
  // Initially pass them in the mlTimeSeriesExplorer part of the AppState.
  // TODO - do we want to pass the entities via the filter?
  const entityCondition = {};
  series.entityFields.forEach(entity => {
    entityCondition[entity.fieldName] = entity.fieldValue;
  });

  // Use rison to build the URL .
  const _g = rison.encode({
    ml: {
      jobIds: [series.jobId],
    },
    refreshInterval: {
      display: 'Off',
      pause: false,
      value: 0,
    },
    time: {
      from: from,
      to: to,
      mode: 'absolute',
    },
  });

  const _a = rison.encode({
    mlTimeSeriesExplorer: {
      zoom: {
        from: zoomFrom,
        to: zoomTo,
      },
      detectorIndex: series.detectorIndex,
      entities: entityCondition,
    },
    query: {
      query_string: {
        analyze_wildcard: true,
        query: '*',
      },
    },
  });

  return `${chrome.getBasePath()}/app/ml#/timeseriesexplorer?_g=${_g}&_a=${encodeURIComponent(_a)}`;
}

export function showMultiBucketAnomalyMarker(point) {
  // TODO - test threshold with real use cases
  return (
    point.multiBucketImpact !== undefined && point.multiBucketImpact >= MULTI_BUCKET_IMPACT.MEDIUM
  );
}

export function showMultiBucketAnomalyTooltip(point) {
  // TODO - test threshold with real use cases
  return (
    point.multiBucketImpact !== undefined && point.multiBucketImpact >= MULTI_BUCKET_IMPACT.LOW
  );
}

export function numTicks(axisWidth) {
  return axisWidth / MAX_LABEL_WIDTH;
}

export function numTicksForDateFormat(axisWidth, dateFormat) {
  // Allow 1.75 times the width of a formatted date per tick for padding.
  const tickWidth = calculateTextWidth(moment().format(dateFormat), false);
  return axisWidth / (1.75 * tickWidth);
}

const TICK_DIRECTION = {
  NEXT: 'next',
  PREVIOUS: 'previous',
};

// Based on a fixed starting timestamp and an interval, get tick values within
// the bounds of earliest and latest. This is useful for the Anomaly Explorer Charts
// to align axis ticks with the gray area resembling the swimlane cell selection.
export function getTickValues(startTimeMs, tickInterval, earliest, latest) {
  // A tickInterval equal or smaller than 0 would trigger a call stack exception,
  // so we're trying to catch that before it happens.
  if (tickInterval <= 0) {
    throw Error('tickInterval must be larger than 0.');
  }

  const tickValues = [startTimeMs];

  function addTicks(ts, operator) {
    let newTick;
    let addAnotherTick;

    switch (operator) {
      case TICK_DIRECTION.PREVIOUS:
        newTick = ts - tickInterval;
        addAnotherTick = newTick >= earliest;
        break;
      case TICK_DIRECTION.NEXT:
        newTick = ts + tickInterval;
        addAnotherTick = newTick <= latest;
        break;
    }

    if (addAnotherTick) {
      tickValues.push(newTick);
      addTicks(newTick, operator);
    }
  }

  addTicks(startTimeMs, TICK_DIRECTION.PREVIOUS);
  addTicks(startTimeMs, TICK_DIRECTION.NEXT);

  tickValues.sort();

  return tickValues;
}

const LABEL_WRAP_THRESHOLD = 60;

// Checks if the string length of a chart label (detector description
// and entity fields) is above LABEL_WRAP_THRESHOLD.
export function isLabelLengthAboveThreshold({ detectorLabel, entityFields }) {
  const labelLength =
    detectorLabel.length + entityFields.map(d => `${d.fieldName} ${d.fieldValue}`).join(' ').length;
  return labelLength > LABEL_WRAP_THRESHOLD;
}

// To get xTransform it would be nicer to use d3.transform, but that doesn't play well with JSDOM.
// So this uses a regex variant because we definitely want test coverage for the label removal.
// Once JSDOM supports SVGAnimatedTransformList we can use this simpler inline version:
// const xTransform = d3.transform(tick.attr('transform')).translate[0];
export function getXTransform(t) {
  const regexResult = /translate\(\s*([^\s,)]+)([ ,]([^\s,)]+))?\)/.exec(t);
  if (Array.isArray(regexResult) && regexResult.length >= 2) {
    return Number(regexResult[1]);
  }

  // fall back to NaN if regex didn't return any results.
  return NaN;
}

// This removes overlapping x-axis labels by starting off from a specific label
// that is required/wanted to show up. The code then traverses to both sides along the axis
// and decides which labels to keep or remove. All vertical tick lines will be kept visible,
// but those which still have their text label will be emphasized using the ml-tick-emphasis class.
export function removeLabelOverlap(axis, startTimeMs, tickInterval, width) {
  // Put emphasis on all tick lines, will again de-emphasize the
  // ones where we remove the label in the next steps.
  axis
    .selectAll('g.tick')
    .select('line')
    .classed('ml-tick-emphasis', true);

  function getNeighborTickFactory(operator) {
    return function(ts) {
      switch (operator) {
        case TICK_DIRECTION.PREVIOUS:
          return ts - tickInterval;
        case TICK_DIRECTION.NEXT:
          return ts + tickInterval;
      }
    };
  }

  function getTickDataFactory(operator) {
    const getNeighborTick = getNeighborTickFactory(operator);
    const fn = function(ts) {
      const filteredTicks = axis.selectAll('.tick').filter(d => d === ts);

      if (filteredTicks.length === 0 || filteredTicks[0].length === 0) {
        return false;
      }

      const tick = d3.selectAll(filteredTicks[0]);
      const textNode = tick.select('text').node();

      if (textNode === null) {
        return fn(getNeighborTick(ts));
      }

      const tickWidth = textNode.getBBox().width;
      const padding = 15;
      const xTransform = getXTransform(tick.attr('transform'));
      const xMinOffset = xTransform - (tickWidth / 2 + padding);
      const xMaxOffset = xTransform + (tickWidth / 2 + padding);

      return {
        tick,
        ts,
        xMinOffset,
        xMaxOffset,
      };
    };
    return fn;
  }

  function checkTicks(ts, operator) {
    const getTickData = getTickDataFactory(operator);
    const currentTickData = getTickData(ts);

    if (currentTickData === false) {
      return;
    }

    const getNeighborTick = getNeighborTickFactory(operator);
    const newTickData = getTickData(getNeighborTick(ts));

    if (newTickData !== false) {
      if (
        newTickData.xMinOffset < 0 ||
        newTickData.xMaxOffset > width ||
        (newTickData.xMaxOffset > currentTickData.xMinOffset &&
          operator === TICK_DIRECTION.PREVIOUS) ||
        (newTickData.xMinOffset < currentTickData.xMaxOffset && operator === TICK_DIRECTION.NEXT)
      ) {
        newTickData.tick.select('text').remove();
        newTickData.tick.select('line').classed('ml-tick-emphasis', false);
        checkTicks(currentTickData.ts, operator);
      } else {
        checkTicks(newTickData.ts, operator);
      }
    }
  }

  checkTicks(startTimeMs, TICK_DIRECTION.PREVIOUS);
  checkTicks(startTimeMs, TICK_DIRECTION.NEXT);
}
