/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { forkJoin, Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import chrome from 'ui/chrome';
import { ml } from '../../services/ml_api_service';
import {
  ANNOTATIONS_TABLE_DEFAULT_QUERY_SIZE,
  ANOMALIES_TABLE_DEFAULT_QUERY_SIZE,
} from '../../../../common/constants/search';
import { mlTimeSeriesSearchService } from '../timeseries_search_service';
import { mlResultsService, CriteriaField } from '../../services/results_service';
import { Job } from '../../jobs/new_job/common/job_creator/configs';
import { MAX_SCHEDULED_EVENTS, TIME_FIELD_NAME } from '../timeseriesexplorer_constants';
import {
  processDataForFocusAnomalies,
  processForecastResults,
  processMetricPlotResults,
  processScheduledEventsForChart,
} from './timeseriesexplorer_utils';
import { mlForecastService } from '../../services/forecast_service';
import { mlFunctionToESAggregation } from '../../../../common/util/job_utils';
import { Annotation } from '../../../../common/types/annotations';

const mlAnnotationsEnabled = chrome.getInjected('mlAnnotationsEnabled', false);

export interface Interval {
  asMilliseconds: () => number;
  expression: string;
}

export interface FocusData {
  focusChartData: any;
  anomalyRecords: any;
  scheduledEvents: any;
  showForecastCheckbox?: any;
  focusAnnotationData?: any;
  focusForecastData?: any;
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
    mlTimeSeriesSearchService.getMetricData(
      selectedJob,
      detectorIndex,
      nonBlankEntities,
      searchBounds.min.valueOf(),
      searchBounds.max.valueOf(),
      focusAggregationInterval.expression
    ),
    // Query 2 - load all the records across selected time range for the chart anomaly markers.
    mlResultsService.getRecordsForCriteria(
      [selectedJob.job_id],
      criteriaFields,
      0,
      searchBounds.min.valueOf(),
      searchBounds.max.valueOf(),
      ANOMALIES_TABLE_DEFAULT_QUERY_SIZE
    ),
    // Query 3 - load any scheduled events for the selected job.
    mlResultsService.getScheduledEventsByBucket(
      [selectedJob.job_id],
      searchBounds.min.valueOf(),
      searchBounds.max.valueOf(),
      focusAggregationInterval.expression,
      1,
      MAX_SCHEDULED_EVENTS
    ),
    // Query 4 - load any annotations for the selected job.
    mlAnnotationsEnabled
      ? ml.annotations
          .getAnnotations({
            jobIds: [selectedJob.job_id],
            earliestMs: searchBounds.min.valueOf(),
            latestMs: searchBounds.max.valueOf(),
            maxAnnotations: ANNOTATIONS_TABLE_DEFAULT_QUERY_SIZE,
          })
          .pipe(
            catchError(() => {
              // silent fail
              return of({ annotations: {} as Record<string, Annotation[]> });
            })
          )
      : of(null),
    // Plus query for forecast data if there is a forecastId stored in the appState.
    forecastId !== undefined
      ? (() => {
          let aggType;
          const detector = selectedJob.analysis_config.detectors[detectorIndex];
          const esAgg = mlFunctionToESAggregation(detector.function);
          if (!modelPlotEnabled && (esAgg === 'sum' || esAgg === 'count')) {
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
      // Sort in descending time order before storing in scope.
      const anomalyRecords = recordsForCriteria.records
        .sort((a, b) => a[TIME_FIELD_NAME] - b[TIME_FIELD_NAME])
        .reverse();

      const scheduledEvents = scheduledEventsByBucket.events[selectedJob.job_id];

      let focusChartData = processMetricPlotResults(metricData.results, modelPlotEnabled);
      // Tell the results container directives to render the focus chart.
      focusChartData = processDataForFocusAnomalies(
        focusChartData,
        anomalyRecords,
        focusAggregationInterval,
        modelPlotEnabled
      );
      focusChartData = processScheduledEventsForChart(focusChartData, scheduledEvents);

      const refreshFocusData: FocusData = {
        scheduledEvents,
        anomalyRecords,
        focusChartData,
      };

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

      return refreshFocusData;
    })
  );
}
