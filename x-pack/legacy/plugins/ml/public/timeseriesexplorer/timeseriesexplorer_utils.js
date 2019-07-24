/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



/*
 * Contains a number of utility functions used for processing
 * the data for exploring a time series in the Single Metric
 * Viewer dashboard.
 */

import _ from 'lodash';

import { parseInterval } from 'ui/utils/parse_interval';
import { isTimeSeriesViewJob } from '../../common/util/job_utils';

// create new job objects based on standard job config objects
// new job objects just contain job id, bucket span in seconds and a selected flag.
// only time series view jobs are allowed
export function createTimeSeriesJobData(jobs) {
  const singleTimeSeriesJobs = jobs.filter(isTimeSeriesViewJob);
  return singleTimeSeriesJobs.map(job => {
    const bucketSpan = parseInterval(job.analysis_config.bucket_span);
    return {
      id: job.job_id,
      selected: false,
      bucketSpanSeconds: bucketSpan.asSeconds()
    };
  });
}

// Return dataset in format used by the single metric chart.
// i.e. array of Objects with keys date (JavaScript date) and value,
// plus lower and upper keys if model plot is enabled for the series.
export function processMetricPlotResults(metricPlotData, modelPlotEnabled) {
  const metricPlotChartData = [];
  if (modelPlotEnabled === true) {
    _.each(metricPlotData, (dataForTime, time) => {
      metricPlotChartData.push({
        date: new Date(+time),
        lower: dataForTime.modelLower,
        value: dataForTime.actual,
        upper: dataForTime.modelUpper
      });
    });
  } else {
    _.each(metricPlotData, (dataForTime, time) => {
      metricPlotChartData.push({
        date: new Date(+time),
        value: dataForTime.actual
      });
    });
  }

  return metricPlotChartData;
}

// Returns forecast dataset in format used by the single metric chart.
// i.e. array of Objects with keys date (JavaScript date), isForecast,
// value, lower and upper keys.
export function processForecastResults(forecastData) {
  const forecastPlotChartData = [];
  _.each(forecastData, (dataForTime, time) => {
    forecastPlotChartData.push({
      date: new Date(+time),
      isForecast: true,
      lower: dataForTime.forecastLower,
      value: dataForTime.prediction,
      upper: dataForTime.forecastUpper
    });
  });

  return forecastPlotChartData;
}

// Return dataset in format used by the swimlane.
// i.e. array of Objects with keys date (JavaScript date) and score.
export function processRecordScoreResults(scoreData) {
  const bucketScoreData = [];
  _.each(scoreData, (dataForTime, time) => {
    bucketScoreData.push(
      {
        date: new Date(+time),
        score: dataForTime.score,
      });
  });

  return bucketScoreData;
}

// Uses data from the list of anomaly records to add anomalyScore,
// function, actual and typical properties, plus causes and multi-bucket
// info if applicable, to the chartData entries for anomalous buckets.
export function processDataForFocusAnomalies(
  chartData,
  anomalyRecords,
  timeFieldName,
  aggregationInterval,
  modelPlotEnabled) {

  const timesToAddPointsFor = [];

  // Iterate through the anomaly records making sure we have chart points for each anomaly.
  const intervalMs = aggregationInterval.asMilliseconds();
  let lastChartDataPointTime = undefined;
  if (chartData !== undefined && chartData.length > 0) {
    lastChartDataPointTime = chartData[chartData.length - 1].date.getTime();
  }
  anomalyRecords.forEach((record) => {
    const recordTime = record[timeFieldName];
    const chartPoint = findChartPointForAnomalyTime(chartData, recordTime, aggregationInterval);
    if (chartPoint === undefined) {
      const timeToAdd = (Math.floor(recordTime / intervalMs)) * intervalMs;
      if (timesToAddPointsFor.indexOf(timeToAdd) === -1 && timeToAdd !== lastChartDataPointTime) {
        timesToAddPointsFor.push(timeToAdd);
      }
    }
  });

  timesToAddPointsFor.sort((a, b) => a - b);

  timesToAddPointsFor.forEach((time) => {
    const pointToAdd = {
      date: new Date(time),
      value: null
    };

    if (modelPlotEnabled === true) {
      pointToAdd.upper = null;
      pointToAdd.lower = null;
    }
    chartData.push(pointToAdd);
  });

  // Iterate through the anomaly records adding the
  // various properties required for display.
  anomalyRecords.forEach((record) => {

    // Look for a chart point with the same time as the record.
    // If none found, find closest time in chartData set.
    const recordTime = record[timeFieldName];
    const chartPoint = findChartPointForAnomalyTime(chartData, recordTime, aggregationInterval);
    if (chartPoint !== undefined) {
      // If chart aggregation interval > bucket span, there may be more than
      // one anomaly record in the interval, so use the properties from
      // the record with the highest anomalyScore.
      const recordScore = record.record_score;
      const pointScore = chartPoint.anomalyScore;
      if (pointScore === undefined || pointScore < recordScore) {
        chartPoint.anomalyScore = recordScore;
        chartPoint.function = record.function;

        if (_.has(record, 'actual')) {
          chartPoint.actual = record.actual;
          chartPoint.typical = record.typical;
        } else {
          const causes = _.get(record, 'causes', []);
          if (causes.length > 0) {
            chartPoint.byFieldName = record.by_field_name;
            chartPoint.numberOfCauses = causes.length;
            if (causes.length === 1) {
              // If only a single cause, copy actual and typical values to the top level.
              const cause = _.first(record.causes);
              chartPoint.actual = cause.actual;
              chartPoint.typical = cause.typical;
            }
          }
        }

        if (_.has(record, 'multi_bucket_impact')) {
          chartPoint.multiBucketImpact = record.multi_bucket_impact;
        }
      }
    }

  });

  return chartData;
}

// Adds a scheduledEvents property to any points in the chart data set
// which correspond to times of scheduled events for the job.
export function processScheduledEventsForChart(chartData, scheduledEvents) {
  if (scheduledEvents !== undefined) {
    _.each(scheduledEvents, (events, time) => {
      const chartPoint = findNearestChartPointToTime(chartData, time);
      if (chartPoint !== undefined) {
        // Note if the scheduled event coincides with an absence of the underlying metric data,
        // we don't worry about plotting the event.
        chartPoint.scheduledEvents = events;
      }
    });
  }

  return chartData;
}

// Finds the chart point which is closest in time to the specified time.
export function findNearestChartPointToTime(chartData, time) {
  let chartPoint;
  if(chartData === undefined) {
    return chartPoint;
  }

  for (let i = 0; i < chartData.length; i++) {
    if (chartData[i].date.getTime() === time) {
      chartPoint = chartData[i];
      break;
    }
  }

  if (chartPoint === undefined) {
    // Find nearest point in time.
    // loop through line items until the date is greater than bucketTime
    // grab the current and previous items and compare the time differences
    let foundItem;
    for (let i = 0; i < chartData.length; i++) {
      const itemTime = chartData[i].date.getTime();
      if (itemTime > time) {
        const item = chartData[i];
        const previousItem = chartData[i - 1];

        const diff1 = Math.abs(time - previousItem.date.getTime());
        const diff2 = Math.abs(time - itemTime);

        // foundItem should be the item with a date closest to bucketTime
        if (previousItem === undefined || diff1 > diff2) {
          foundItem = item;
        } else {
          foundItem = previousItem;
        }

        break;
      }
    }

    chartPoint = foundItem;
  }

  return chartPoint;
}

// Finds the chart point which corresponds to an anomaly with the
// specified time.
export function findChartPointForAnomalyTime(chartData, anomalyTime, aggregationInterval) {
  let chartPoint;
  if(chartData === undefined) {
    return chartPoint;
  }

  for (let i = 0; i < chartData.length; i++) {
    if (chartData[i].date.getTime() === anomalyTime) {
      chartPoint = chartData[i];
      break;
    }
  }

  if (chartPoint === undefined) {
    // Find the time of the point which falls immediately before the
    // time of the anomaly. This is the start of the chart 'bucket'
    // which contains the anomalous bucket.
    let foundItem;
    const intervalMs = aggregationInterval.asMilliseconds();
    for (let i = 0; i < chartData.length; i++) {
      const itemTime = chartData[i].date.getTime();
      if (anomalyTime - itemTime < intervalMs) {
        foundItem = chartData[i];
        break;
      }
    }

    chartPoint = foundItem;
  }

  return chartPoint;
}
