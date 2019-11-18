/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { forkJoin, Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import chrome from 'ui/chrome';
import { ml } from '../services/ml_api_service';
import {
  ANNOTATIONS_TABLE_DEFAULT_QUERY_SIZE,
  ANOMALIES_TABLE_DEFAULT_QUERY_SIZE,
} from '../../common/constants/search';
import { mlTimeSeriesSearchService } from './timeseries_search_service';
import { mlResultsServiceRx } from '../services/result_service_rx';
import { Job } from '../jobs/new_job_new/common/job_creator/configs';
import { MAX_SCHEDULED_EVENTS, TIME_FIELD_NAME } from './timeseriesexplorer_constants';
// @ts-ignore
import {
  processMetricPlotResults,
  processDataForFocusAnomalies,
  processScheduledEventsForChart,
  processForecastResults,
} from './timeseriesexplorer_utils';
import { CriteriaField } from '../services/results_service';
import { mlForecastService } from '../services/forecast_service';
import { mlFunctionToESAggregation } from '../../common/util/job_utils';

const mlAnnotationsEnabled = chrome.getInjected('mlAnnotationsEnabled', false);

export interface Interval {
  asMilliseconds: () => number;
  expression: string;
}

export interface FocusData {
  focusChartData: any;
  anomalyRecords: any;
  scheduledEvents: any;
  showForecastCheckbox: any;
  focusAnnotationData: any;
  focusForecastData: any;
}

export function getFocusData(
  criteriaFields: CriteriaField[],
  detectorIndex: number,
  focusAggregationInterval: Interval,
  forecastId: string,
  modelPlotEnabled: boolean,
  nonBlankEntities: any[],
  searchBounds: any,
  selectedJob: Job
): Observable<FocusData> {
  return forkJoin([
    // Query 1 - load metric data across selected time range.
    mlTimeSeriesSearchService.getMetricDataRx(
      selectedJob,
      detectorIndex,
      nonBlankEntities,
      searchBounds.min.valueOf(),
      searchBounds.max.valueOf(),
      focusAggregationInterval.expression
    ),
    // Query 2 - load all the records across selected time range for the chart anomaly markers.
    mlResultsServiceRx.getRecordsForCriteria(
      [selectedJob.job_id],
      criteriaFields,
      0,
      searchBounds.min.valueOf(),
      searchBounds.max.valueOf(),
      ANOMALIES_TABLE_DEFAULT_QUERY_SIZE
    ),
    // Query 3 - load any scheduled events for the selected job.
    mlResultsServiceRx.getScheduledEventsByBucket(
      [selectedJob.job_id],
      searchBounds.min.valueOf(),
      searchBounds.max.valueOf(),
      focusAggregationInterval.expression,
      1,
      MAX_SCHEDULED_EVENTS
    ),
    // Query 4 - load any annotations for the selected job.
    mlAnnotationsEnabled
      ? ml.annotations.getAnnotationsRx({
          jobIds: [selectedJob.job_id],
          earliestMs: searchBounds.min.valueOf(),
          latestMs: searchBounds.max.valueOf(),
          maxAnnotations: ANNOTATIONS_TABLE_DEFAULT_QUERY_SIZE,
        })
      : of(null),
    // Plus query for forecast data if there is a forecastId stored in the appState.
    forecastId !== undefined
      ? (function() {
          let aggType;
          const detector = selectedJob.analysis_config.detectors[detectorIndex];
          const esAgg = mlFunctionToESAggregation(detector.function);
          if (modelPlotEnabled === false && (esAgg === 'sum' || esAgg === 'count')) {
            aggType = { avg: 'sum', max: 'sum', min: 'sum' };
          }
          return mlForecastService.getForecastData(
            selectedJob,
            detectorIndex,
            forecastId,
            nonBlankEntities,
            searchBounds.min.valueOf(),
            searchBounds.max.valueOf(),
            focusAggregationInterval.expression,
            aggType
          );
        })()
      : of(null),
  ]).pipe(
    map(([metricData, recordsForCriteria, scheduledEventsByBucket, annotations, forecastData]) => {
      const refreshFocusData = {} as FocusData;

      refreshFocusData.focusChartData = processMetricPlotResults(
        metricData.results,
        modelPlotEnabled
      );

      // Sort in descending time order before storing in scope.
      refreshFocusData.anomalyRecords = _.chain(recordsForCriteria.records)
        .sortBy(record => record[TIME_FIELD_NAME])
        .reverse()
        .value();

      refreshFocusData.scheduledEvents = scheduledEventsByBucket.events[selectedJob.job_id];

      if (annotations) {
        refreshFocusData.focusAnnotationData = (annotations.annotations[selectedJob.job_id] ?? [])
          .sort((a, b) => {
            return a.timestamp - b.timestamp;
          })
          .map((d, i) => {
            d.key = String.fromCharCode(65 + i);
            return d;
          });
      }

      if (forecastData) {
        refreshFocusData.focusForecastData = processForecastResults(forecastData.results);
        refreshFocusData.showForecastCheckbox = refreshFocusData.focusForecastData.length > 0;
      }

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

      return refreshFocusData;
    })
  );
}
