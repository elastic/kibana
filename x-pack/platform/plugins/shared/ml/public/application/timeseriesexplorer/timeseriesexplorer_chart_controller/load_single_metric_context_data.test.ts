/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { NEVER, of, throwError } from 'rxjs';

import type { CombinedJob } from '@kbn/ml-common-types/anomaly_detection_jobs/combined_job';
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
      getMetricData: () => of({ results: {} }),
      getChartDetails: async () => ({
        success: true,
        results: { functionLabel: 'mean response', entityData: { entities: [] } },
      }),
    },
    mlResultsService: {
      getRecordMaxScoreByTime: async () => ({ results: {} }),
    },
    mlForecastService: {
      getForecastData: () => of({ results: {} }),
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
        entityCounts: 'details-err',
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

  it('calls displayError for every failing query, not just the first', async () => {
    const displayError = jest.fn();
    const result = await loadSingleMetricContextData({
      bounds,
      selectedJob,
      detectorIndex: 0,
      entityControls: [],
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
        entityCounts: 'details-err',
        forecast: 'fc-err',
      },
      deps: {
        ...baseDeps,
        mlTimeSeriesSearchService: {
          ...baseDeps.mlTimeSeriesSearchService,
          getMetricData: () => throwError(() => new Error('metric down')),
          getChartDetails: async () => Promise.reject(new Error('details down')),
        },
        mlResultsService: {
          getRecordMaxScoreByTime: async () => Promise.reject(new Error('swimlane down')),
        },
      },
    });

    expect(result).toBeNull();
    expect(displayError).toHaveBeenCalledTimes(3);
    expect(displayError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'metric down' }),
      'metric-err'
    );
    expect(displayError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'swimlane down' }),
      'swim-err'
    );
    expect(displayError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'details down' }),
      'details-err'
    );
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
        entityCounts: 'details-err',
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
        entityCounts: 'details-err',
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
        entityCounts: 'details-err',
        forecast: 'fc-err',
      },
      deps: baseDeps,
    });

    expect(displayError).not.toHaveBeenCalled();
    expect(result?.zoomSelection).toEqual({ from: new Date(1000), to: new Date(2000) });
    expect(result?.shouldUpdatePreviousSelectedForecastId).toBe(true);
  });

  it('calls displayError with swimlane message and returns null when swimlane rejects but metric succeeds', async () => {
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
        entityCounts: 'details-err',
        forecast: 'fc-err',
      },
      deps: {
        ...baseDeps,
        mlResultsService: {
          getRecordMaxScoreByTime: async () => {
            throw new Error('swimlane down');
          },
        },
      },
    });

    expect(result).toBeNull();
    expect(displayError).toHaveBeenCalledWith(expect.any(Error), 'swim-err');
  });

  it('calls displayError with entityCounts message and returns null when chart details rejects', async () => {
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
        entityCounts: 'details-err',
        forecast: 'fc-err',
      },
      deps: {
        ...baseDeps,
        mlTimeSeriesSearchService: {
          ...baseDeps.mlTimeSeriesSearchService,
          getChartDetails: async () => {
            throw new Error('details down');
          },
        },
      },
    });

    expect(result).toBeNull();
    expect(displayError).toHaveBeenCalledWith(expect.any(Error), 'details-err');
  });

  it('calls displayError with forecast message and returns null when forecast load rejects', async () => {
    const displayError = jest.fn();
    const result = await loadSingleMetricContextData({
      bounds,
      selectedJob,
      detectorIndex: 0,
      entityControls: [{ fieldName: 'host', fieldValue: 'h1' }],
      modelPlotEnabled: true,
      selectedForecastId: 'forecast-1',
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
        entityCounts: 'details-err',
        forecast: 'fc-err',
      },
      deps: {
        ...baseDeps,
        mlForecastService: {
          getForecastData: () => throwError(() => new Error('forecast down')),
        },
      },
    });

    expect(result).toBeNull();
    expect(displayError).toHaveBeenCalledWith(expect.any(Error), 'fc-err');
  });

  it('rejects when detectorIndex is out of range and a forecast id is set', async () => {
    const displayError = jest.fn();
    await expect(
      loadSingleMetricContextData({
        bounds,
        selectedJob,
        detectorIndex: 1,
        entityControls: [{ fieldName: 'host', fieldValue: 'h1' }],
        modelPlotEnabled: true,
        selectedForecastId: 'forecast-1',
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
          entityCounts: 'details-err',
          forecast: 'fc-err',
        },
        deps: baseDeps,
      })
    ).rejects.toThrow();
    expect(displayError).not.toHaveBeenCalled();
  });
});
