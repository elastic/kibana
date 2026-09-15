/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';

import { resolveContextFinishFocusRange } from './resolve_context_finish_focus_range';

const bounds = { min: moment('2016-01-01'), max: moment('2016-02-01') } as const;

describe('resolveContextFinishFocusRange', () => {
  const defaultRange: [Date, Date] = [new Date('2016-01-10'), new Date('2016-01-20')];
  const urlRange: [Date, Date] = [new Date('2016-01-05'), new Date('2016-01-15')];
  const contextAggregationInterval = moment.duration(1, 'h');

  it('uses URL range when zoom is set, initial range is valid, and forecast unchanged', () => {
    const result = resolveContextFinishFocusRange({
      zoom: { from: '2016-01-05T00:00:00.000Z', to: '2016-01-15T00:00:00.000Z' },
      contextAggregationInterval,
      bounds,
      selectedForecastId: 'f1',
      previousSelectedForecastId: 'f1',
      autoZoomDuration: 1000,
      contextChartData: [{}],
      contextForecastData: [],
      calculateInitialFocusRange: () => urlRange,
      calculateDefaultFocusRange: () => defaultRange,
    });
    expect(result.focusRange).toEqual(urlRange);
    expect(result.shouldUpdatePreviousSelectedForecastId).toBe(false);
  });

  it('uses default when zoom is undefined', () => {
    const result = resolveContextFinishFocusRange({
      zoom: undefined,
      contextAggregationInterval,
      bounds,
      selectedForecastId: undefined,
      previousSelectedForecastId: undefined,
      autoZoomDuration: 1000,
      contextChartData: [{}],
      contextForecastData: [],
      calculateInitialFocusRange: () => undefined,
      calculateDefaultFocusRange: () => defaultRange,
    });
    expect(result.focusRange).toEqual(defaultRange);
    expect(result.shouldUpdatePreviousSelectedForecastId).toBe(true);
  });

  it('uses default when forecast id changes even if URL zoom exists', () => {
    const result = resolveContextFinishFocusRange({
      zoom: { from: 'x', to: 'y' },
      contextAggregationInterval,
      bounds,
      selectedForecastId: 'f2',
      previousSelectedForecastId: 'f1',
      autoZoomDuration: 1000,
      contextChartData: [{}],
      contextForecastData: [],
      calculateInitialFocusRange: () => urlRange,
      calculateDefaultFocusRange: () => defaultRange,
    });
    expect(result.focusRange).toEqual(defaultRange);
    expect(result.shouldUpdatePreviousSelectedForecastId).toBe(true);
  });

  it('keeps URL focus on first hydrate when forecast is in URL but previous forecast was never set', () => {
    const result = resolveContextFinishFocusRange({
      zoom: { from: '2016-01-05T00:00:00.000Z', to: '2016-01-15T00:00:00.000Z' },
      contextAggregationInterval,
      bounds,
      selectedForecastId: 'f1',
      previousSelectedForecastId: undefined,
      autoZoomDuration: 1000,
      contextChartData: [{}],
      contextForecastData: [],
      calculateInitialFocusRange: () => urlRange,
      calculateDefaultFocusRange: () => defaultRange,
    });
    expect(result.focusRange).toEqual(urlRange);
    expect(result.shouldUpdatePreviousSelectedForecastId).toBe(false);
  });

  it('uses default when initial focus range is undefined', () => {
    const result = resolveContextFinishFocusRange({
      zoom: { from: 'x', to: 'y' },
      contextAggregationInterval,
      bounds,
      selectedForecastId: 'f1',
      previousSelectedForecastId: 'f1',
      autoZoomDuration: 1000,
      contextChartData: [{}],
      contextForecastData: [],
      calculateInitialFocusRange: () => undefined,
      calculateDefaultFocusRange: () => defaultRange,
    });
    expect(result.focusRange).toEqual(defaultRange);
    expect(result.shouldUpdatePreviousSelectedForecastId).toBe(true);
  });
});
