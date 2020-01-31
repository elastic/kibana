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
import moment from 'moment-timezone';

import {
  ANNOTATIONS_TABLE_DEFAULT_QUERY_SIZE,
  ANOMALIES_TABLE_DEFAULT_QUERY_SIZE,
} from '../../common/constants/search';
import { isTimeSeriesViewJob, mlFunctionToESAggregation } from '../../common/util/job_utils';
import { parseInterval } from '../../common/util/parse_interval';

import { ml } from '../services/ml_api_service';
import { mlForecastService } from '../services/forecast_service';
import { mlResultsService } from '../services/results_service';
import { TimeBuckets, getBoundsRoundedToInterval } from '../util/time_buckets';

import { mlTimeSeriesSearchService } from './timeseries_search_service';

import {
  CHARTS_POINT_TARGET,
  MAX_SCHEDULED_EVENTS,
  TIME_FIELD_NAME,
} from './timeseriesexplorer_constants';

import chrome from 'ui/chrome';
const mlAnnotationsEnabled = chrome.getInjected('mlAnnotationsEnabled', false);

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
      bucketSpanSeconds: bucketSpan.asSeconds(),
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
        upper: dataForTime.modelUpper,
      });
    });
  } else {
    _.each(metricPlotData, (dataForTime, time) => {
      metricPlotChartData.push({
        date: new Date(+time),
        value: dataForTime.actual,
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
      upper: dataForTime.forecastUpper,
    });
  });

  return forecastPlotChartData;
}

// Return dataset in format used by the swimlane.
// i.e. array of Objects with keys date (JavaScript date) and score.
export function processRecordScoreResults(scoreData) {
  const bucketScoreData = [];
  _.each(scoreData, (dataForTime, time) => {
    bucketScoreData.push({
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
  aggregationInterval,
  modelPlotEnabled
) {
  const timesToAddPointsFor = [];

  // Iterate through the anomaly records making sure we have chart points for each anomaly.
  const intervalMs = aggregationInterval.asMilliseconds();
  let lastChartDataPointTime = undefined;
  if (chartData !== undefined && chartData.length > 0) {
    lastChartDataPointTime = chartData[chartData.length - 1].date.getTime();
  }
  anomalyRecords.forEach(record => {
    const recordTime = record[TIME_FIELD_NAME];
    const chartPoint = findChartPointForAnomalyTime(chartData, recordTime, aggregationInterval);
    if (chartPoint === undefined) {
      const timeToAdd = Math.floor(recordTime / intervalMs) * intervalMs;
      if (timesToAddPointsFor.indexOf(timeToAdd) === -1 && timeToAdd !== lastChartDataPointTime) {
        timesToAddPointsFor.push(timeToAdd);
      }
    }
  });

  timesToAddPointsFor.sort((a, b) => a - b);

  timesToAddPointsFor.forEach(time => {
    const pointToAdd = {
      date: new Date(time),
      value: null,
    };

    if (modelPlotEnabled === true) {
      pointToAdd.upper = null;
      pointToAdd.lower = null;
    }
    chartData.push(pointToAdd);
  });

  // Iterate through the anomaly records adding the
  // various properties required for display.
  anomalyRecords.forEach(record => {
    // Look for a chart point with the same time as the record.
    // If none found, find closest time in chartData set.
    const recordTime = record[TIME_FIELD_NAME];
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
  if (chartData === undefined) {
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
  if (chartData === undefined) {
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

export const getFocusData = function(
  criteriaFields,
  detectorIndex,
  focusAggregationInterval,
  forecastId,
  modelPlotEnabled,
  nonBlankEntities,
  searchBounds,
  selectedJob
) {
  return new Promise((resolve, reject) => {
    // Counter to keep track of the queries to populate the chart.
    let awaitingCount = 4;

    // This object is used to store the results of individual remote requests
    // before we transform it into the final data and apply it to $scope. Otherwise
    // we might trigger multiple $digest cycles and depending on how deep $watches
    // listen for changes we could miss updates.
    const refreshFocusData = {};

    // finish() function, called after each data set has been loaded and processed.
    // The last one to call it will trigger the page render.
    function finish() {
      awaitingCount--;
      if (awaitingCount === 0) {
        // Tell the results container directives to render the focus chart.
        refreshFocusData.focusChartData = processDataForFocusAnomalies(
          refreshFocusData.focusChartData,
          refreshFocusData.anomalyRecords,
          focusAggregationInterval,
          modelPlotEnabled
        );

        refreshFocusData.focusChartData = processScheduledEventsForChart(
          refreshFocusData.focusChartData,
          refreshFocusData.scheduledEvents
        );

        resolve(refreshFocusData);
      }
    }

    // Query 1 - load metric data across selected time range.
    mlTimeSeriesSearchService
      .getMetricData(
        selectedJob,
        detectorIndex,
        nonBlankEntities,
        searchBounds.min.valueOf(),
        searchBounds.max.valueOf(),
        focusAggregationInterval.expression
      )
      .then(resp => {
        refreshFocusData.focusChartData = processMetricPlotResults(resp.results, modelPlotEnabled);
        finish();
      })
      .catch(resp => {
        console.log('Time series explorer - error getting metric data from elasticsearch:', resp);
        reject();
      });

    // Query 2 - load all the records across selected time range for the chart anomaly markers.
    mlResultsService
      .getRecordsForCriteria(
        [selectedJob.job_id],
        criteriaFields,
        0,
        searchBounds.min.valueOf(),
        searchBounds.max.valueOf(),
        ANOMALIES_TABLE_DEFAULT_QUERY_SIZE
      )
      .then(resp => {
        // Sort in descending time order before storing in scope.
        refreshFocusData.anomalyRecords = _.chain(resp.records)
          .sortBy(record => record[TIME_FIELD_NAME])
          .reverse()
          .value();
        finish();
      });

    // Query 3 - load any scheduled events for the selected job.
    mlResultsService
      .getScheduledEventsByBucket(
        [selectedJob.job_id],
        searchBounds.min.valueOf(),
        searchBounds.max.valueOf(),
        focusAggregationInterval.expression,
        1,
        MAX_SCHEDULED_EVENTS
      )
      .then(resp => {
        refreshFocusData.scheduledEvents = resp.events[selectedJob.job_id];
        finish();
      })
      .catch(resp => {
        console.log(
          'Time series explorer - error getting scheduled events from elasticsearch:',
          resp
        );
        reject();
      });

    // Query 4 - load any annotations for the selected job.
    if (mlAnnotationsEnabled) {
      ml.annotations
        .getAnnotations({
          jobIds: [selectedJob.job_id],
          earliestMs: searchBounds.min.valueOf(),
          latestMs: searchBounds.max.valueOf(),
          maxAnnotations: ANNOTATIONS_TABLE_DEFAULT_QUERY_SIZE,
        })
        .then(resp => {
          refreshFocusData.focusAnnotationData = resp.annotations[selectedJob.job_id]
            .sort((a, b) => {
              return a.timestamp - b.timestamp;
            })
            .map((d, i) => {
              d.key = String.fromCharCode(65 + i);
              return d;
            });

          finish();
        })
        .catch(() => {
          // silent fail
          refreshFocusData.focusAnnotationData = [];
          finish();
        });
    } else {
      finish();
    }

    // Plus query for forecast data if there is a forecastId stored in the appState.
    if (forecastId !== undefined) {
      awaitingCount++;
      let aggType = undefined;
      const detector = selectedJob.analysis_config.detectors[detectorIndex];
      const esAgg = mlFunctionToESAggregation(detector.function);
      if (modelPlotEnabled === false && (esAgg === 'sum' || esAgg === 'count')) {
        aggType = { avg: 'sum', max: 'sum', min: 'sum' };
      }

      mlForecastService
        .getForecastData(
          selectedJob,
          detectorIndex,
          forecastId,
          nonBlankEntities,
          searchBounds.min.valueOf(),
          searchBounds.max.valueOf(),
          focusAggregationInterval.expression,
          aggType
        )
        .then(resp => {
          refreshFocusData.focusForecastData = processForecastResults(resp.results);
          refreshFocusData.showForecastCheckbox = refreshFocusData.focusForecastData.length > 0;
          finish();
        })
        .catch(resp => {
          console.log(
            `Time series explorer - error loading data for forecast ID ${forecastId}`,
            resp
          );
          reject();
        });
    }
  });
};

export function calculateAggregationInterval(bounds, bucketsTarget, jobs, selectedJob) {
  // Aggregation interval used in queries should be a function of the time span of the chart
  // and the bucket span of the selected job(s).
  const barTarget = bucketsTarget !== undefined ? bucketsTarget : 100;
  // Use a maxBars of 10% greater than the target.
  const maxBars = Math.floor(1.1 * barTarget);
  const buckets = new TimeBuckets();
  buckets.setInterval('auto');
  buckets.setBounds(bounds);
  buckets.setBarTarget(Math.floor(barTarget));
  buckets.setMaxBars(maxBars);

  // Ensure the aggregation interval is always a multiple of the bucket span to avoid strange
  // behaviour such as adjacent chart buckets holding different numbers of job results.
  const bucketSpanSeconds = _.find(jobs, { id: selectedJob.job_id }).bucketSpanSeconds;
  let aggInterval = buckets.getIntervalToNearestMultiple(bucketSpanSeconds);

  // Set the interval back to the job bucket span if the auto interval is smaller.
  const secs = aggInterval.asSeconds();
  if (secs < bucketSpanSeconds) {
    buckets.setInterval(bucketSpanSeconds + 's');
    aggInterval = buckets.getInterval();
  }

  return aggInterval;
}

export function calculateDefaultFocusRange(
  autoZoomDuration,
  contextAggregationInterval,
  contextChartData,
  contextForecastData
) {
  const isForecastData = contextForecastData !== undefined && contextForecastData.length > 0;

  const combinedData =
    isForecastData === false ? contextChartData : contextChartData.concat(contextForecastData);
  const earliestDataDate = _.first(combinedData).date;
  const latestDataDate = _.last(combinedData).date;

  let rangeEarliestMs;
  let rangeLatestMs;

  if (isForecastData === true) {
    // Return a range centred on the start of the forecast range, depending
    // on the time range of the forecast and data.
    const earliestForecastDataDate = _.first(contextForecastData).date;
    const latestForecastDataDate = _.last(contextForecastData).date;

    rangeLatestMs = Math.min(
      earliestForecastDataDate.getTime() + autoZoomDuration / 2,
      latestForecastDataDate.getTime()
    );
    rangeEarliestMs = Math.max(rangeLatestMs - autoZoomDuration, earliestDataDate.getTime());
  } else {
    // Returns the range that shows the most recent data at bucket span granularity.
    rangeLatestMs = latestDataDate.getTime() + contextAggregationInterval.asMilliseconds();
    rangeEarliestMs = Math.max(earliestDataDate.getTime(), rangeLatestMs - autoZoomDuration);
  }

  return [new Date(rangeEarliestMs), new Date(rangeLatestMs)];
}

export function calculateInitialFocusRange(zoomState, contextAggregationInterval, timefilter) {
  if (zoomState !== undefined) {
    // Check that the zoom times are valid.
    // zoomFrom must be at or after context chart search bounds earliest,
    // zoomTo must be at or before context chart search bounds latest.
    const zoomFrom = moment(zoomState.from, 'YYYY-MM-DDTHH:mm:ss.SSSZ', true);
    const zoomTo = moment(zoomState.to, 'YYYY-MM-DDTHH:mm:ss.SSSZ', true);
    const bounds = timefilter.getActiveBounds();
    const searchBounds = getBoundsRoundedToInterval(bounds, contextAggregationInterval, true);
    const earliest = searchBounds.min;
    const latest = searchBounds.max;

    if (
      zoomFrom.isValid() &&
      zoomTo.isValid &&
      zoomTo.isAfter(zoomFrom) &&
      zoomFrom.isBetween(earliest, latest, null, '[]') &&
      zoomTo.isBetween(earliest, latest, null, '[]')
    ) {
      return [zoomFrom.toDate(), zoomTo.toDate()];
    }
  }

  return undefined;
}

export function getAutoZoomDuration(jobs, selectedJob) {
  // Calculate the 'auto' zoom duration which shows data at bucket span granularity.
  // Get the minimum bucket span of selected jobs.
  // TODO - only look at jobs for which data has been returned?
  const bucketSpanSeconds = _.find(jobs, { id: selectedJob.job_id }).bucketSpanSeconds;

  // In most cases the duration can be obtained by simply multiplying the points target
  // Check that this duration returns the bucket span when run back through the
  // TimeBucket interval calculation.
  let autoZoomDuration = bucketSpanSeconds * 1000 * (CHARTS_POINT_TARGET - 1);

  // Use a maxBars of 10% greater than the target.
  const maxBars = Math.floor(1.1 * CHARTS_POINT_TARGET);
  const buckets = new TimeBuckets();
  buckets.setInterval('auto');
  buckets.setBarTarget(Math.floor(CHARTS_POINT_TARGET));
  buckets.setMaxBars(maxBars);

  // Set bounds from 'now' for testing the auto zoom duration.
  const nowMs = new Date().getTime();
  const max = moment(nowMs);
  const min = moment(nowMs - autoZoomDuration);
  buckets.setBounds({ min, max });

  const calculatedInterval = buckets.getIntervalToNearestMultiple(bucketSpanSeconds);
  const calculatedIntervalSecs = calculatedInterval.asSeconds();
  if (calculatedIntervalSecs !== bucketSpanSeconds) {
    // If we haven't got the span back, which may occur depending on the 'auto' ranges
    // used in TimeBuckets and the bucket span of the job, then multiply by the ratio
    // of the bucket span to the calculated interval.
    autoZoomDuration = autoZoomDuration * (bucketSpanSeconds / calculatedIntervalSecs);
  }

  return autoZoomDuration;
}
