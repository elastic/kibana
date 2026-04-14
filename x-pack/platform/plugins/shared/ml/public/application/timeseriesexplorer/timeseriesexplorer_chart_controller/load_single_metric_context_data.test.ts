/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { NEVER, of, throwError } from 'rxjs';

import type { CombinedJob } from '../../../../common/types/anomaly_detection_jobs';
import {
  getForecastAggTypeForContextLoad,
  loadSingleMetricContextData,
} from './load_single_metric_context_data';

describe('getForecastAggTypeForContextLoad', () => {
  it('overrides to sum when model plot is off and ES agg is sum', () => {
    expect(getForecastAggTypeForContextLoad(false, { function: 'sum' })).toEqual({
      avg: 'sum',
      max: 'sum',
      min: 'sum',
    });
  });

  it('returns undefined when model plot is on', () => {
    expect(getForecastAggTypeForContextLoad(true, { function: 'sum' })).toBeUndefined();
  });
});

describe('loadSingleMetricContextData', () => {
  const bounds = { min: moment(0), max: moment(1) };

  const selectedJob = {
    job_id: 'job-1',
    analysis_config: {
      detectors: [{ function: 'mean', field_name: 'response' }],
    },
  } as unknown as CombinedJob;

  const baseDeps = {
    mlTimeSeriesSearchService: {
      getMetricData: () => of({ results: [] }),
      getChartDetails: async () => ({
        results: { functionLabel: 'mean response', entityData: { entities: [] } },
      }),
    },
    mlResultsService: {
      getRecordMaxScoreByTime: async () => ({ results: [] }),
    },
    mlForecastService: {
      getForecastData: () => of({ results: [] }),
    },
    mlTimeSeriesExplorer: {
      calculateAggregationInterval: () => moment.duration(15, 'minutes'),
      processMetricPlotResults: () => [{}, {}],
      processRecordScoreResults: () => [],
      processForecastResults: () => [],
      calculateInitialFocusRange: () => undefined,
      calculateDefaultFocusRange: () => [new Date(1000), new Date(2000)] as [Date, Date],
    },
    getBoundsRoundedToInterval: () => ({
      min: moment(0),
      max: moment(1),
    }),
  };

  it('calls displayError and returns null when metric query fails', async () => {
    const displayError = jest.fn();
    const result = await loadSingleMetricContextData({
      bounds,
      selectedJob,
      detectorIndex: 0,
      entityControls: [{ fieldName: 'host', fieldValue: 'h1' }],
      modelPlotEnabled: true,
      selectedForecastId: undefined,
      functionToPlotByIfMetric: undefined,
      functionDescription: undefined,
      zoom: undefined,
      previousSelectedForecastId: undefined,
      autoZoomDuration: 1000,
      arePartitioningFieldsProvided: true,
      criteriaFields: [],
      displayError,
      errorMessages: {
        metric: 'metric-err',
        swimlane: 'swim-err',
        details: 'details-err',
        forecast: 'fc-err',
      },
      deps: {
        ...baseDeps,
        mlTimeSeriesSearchService: {
          ...baseDeps.mlTimeSeriesSearchService,
          getMetricData: () => throwError(() => new Error('metric down')),
        },
      },
    });

    expect(result).toBeNull();
    expect(displayError).toHaveBeenCalledWith(expect.any(Error), 'metric-err');
  });

  it('returns null when signal is already aborted (skips work)', async () => {
    const ac = new AbortController();
    ac.abort();
    const displayError = jest.fn();
    const result = await loadSingleMetricContextData({
      signal: ac.signal,
      bounds,
      selectedJob,
      detectorIndex: 0,
      entityControls: [{ fieldName: 'host', fieldValue: 'h1' }],
      modelPlotEnabled: true,
      selectedForecastId: undefined,
      functionToPlotByIfMetric: undefined,
      functionDescription: undefined,
      zoom: undefined,
      previousSelectedForecastId: undefined,
      autoZoomDuration: 1000,
      arePartitioningFieldsProvided: true,
      criteriaFields: [],
      displayError,
      errorMessages: {
        metric: 'metric-err',
        swimlane: 'swim-err',
        details: 'details-err',
        forecast: 'fc-err',
      },
      deps: baseDeps,
    });
    expect(result).toBeNull();
    expect(displayError).not.toHaveBeenCalled();
  });

  it('returns null when aborted while metric request never completes', async () => {
    const ac = new AbortController();
    const displayError = jest.fn();
    const p = loadSingleMetricContextData({
      signal: ac.signal,
      bounds,
      selectedJob,
      detectorIndex: 0,
      entityControls: [{ fieldName: 'host', fieldValue: 'h1' }],
      modelPlotEnabled: true,
      selectedForecastId: undefined,
      functionToPlotByIfMetric: undefined,
      functionDescription: undefined,
      zoom: undefined,
      previousSelectedForecastId: undefined,
      autoZoomDuration: 1000,
      arePartitioningFieldsProvided: true,
      criteriaFields: [],
      displayError,
      errorMessages: {
        metric: 'metric-err',
        swimlane: 'swim-err',
        details: 'details-err',
        forecast: 'fc-err',
      },
      deps: {
        ...baseDeps,
        mlTimeSeriesSearchService: {
          ...baseDeps.mlTimeSeriesSearchService,
          getMetricData: () => NEVER,
        },
      },
    });
    ac.abort();
    const result = await p;
    expect(result).toBeNull();
    expect(displayError).not.toHaveBeenCalled();
  });

  it('returns zoomSelection when partitioning is satisfied and default range applies', async () => {
    const displayError = jest.fn();
    const result = await loadSingleMetricContextData({
      bounds,
      selectedJob,
      detectorIndex: 0,
      entityControls: [{ fieldName: 'host', fieldValue: 'h1' }],
      modelPlotEnabled: true,
      selectedForecastId: undefined,
      functionToPlotByIfMetric: undefined,
      functionDescription: undefined,
      zoom: undefined,
      previousSelectedForecastId: undefined,
      autoZoomDuration: 1000,
      arePartitioningFieldsProvided: true,
      criteriaFields: [],
      displayError,
      errorMessages: {
        metric: 'metric-err',
        swimlane: 'swim-err',
        details: 'details-err',
        forecast: 'fc-err',
      },
      deps: baseDeps,
    });

    expect(displayError).not.toHaveBeenCalled();
    expect(result?.zoomSelection).toEqual({ from: new Date(1000), to: new Date(2000) });
    expect(result?.shouldUpdatePreviousSelectedForecastId).toBe(true);
  });
});
