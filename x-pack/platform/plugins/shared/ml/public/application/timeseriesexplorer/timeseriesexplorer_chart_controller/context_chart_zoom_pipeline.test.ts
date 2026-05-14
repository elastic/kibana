/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Subject, forkJoin, of } from 'rxjs';

import { createContextChartZoomSubscription } from './context_chart_zoom_pipeline';

describe('createContextChartZoomSubscription', () => {
  const selection = {
    from: new Date('2020-01-01T00:00:00Z'),
    to: new Date('2020-01-02T00:00:00Z'),
  };

  const baseHandlers = {
    onZoomPreview: jest.fn(),
    getChartState: () => ({
      contextChartData: [{}],
      contextForecastData: undefined,
      focusChartData: undefined,
      zoomFromFocusLoaded: undefined as Date | undefined,
      zoomToFocusLoaded: undefined as Date | undefined,
    }),
    shouldTriggerFocusLoad: () => true,
    onFocusLoadInit: jest.fn(),
    onFocusLoadStart: jest.fn(),
  };

  afterEach(() => {
    jest.useRealTimers();
  });

  it('with includeAnomaliesTable false, maps focus-only observable to [focus, empty table]', () => {
    jest.useFakeTimers();
    const contextChart$ = new Subject<typeof selection>();
    const onFocusPipelineResult = jest.fn();

    const sub = createContextChartZoomSubscription(contextChart$, {
      ...baseHandlers,
      includeAnomaliesTable: false,
      getFocusPipeline$: () => of({ focusOnly: true }),
      onFocusPipelineResult,
    });

    contextChart$.next(selection);
    jest.advanceTimersByTime(500);

    expect(onFocusPipelineResult).toHaveBeenCalledTimes(1);
    const [tuple, sel] = onFocusPipelineResult.mock.calls[0];
    expect(tuple).toEqual([{ focusOnly: true }, { tableData: undefined }]);
    expect(sel).toEqual(selection);

    sub.unsubscribe();
  });

  it('with includeAnomaliesTable true, passes through forkJoin tuple', () => {
    jest.useFakeTimers();
    const contextChart$ = new Subject<typeof selection>();
    const onFocusPipelineResult = jest.fn();

    const sub = createContextChartZoomSubscription(contextChart$, {
      ...baseHandlers,
      includeAnomaliesTable: true,
      getFocusPipeline$: () => forkJoin([of({ focus: 1 }), of({ tableData: { rows: [] } })]),
      onFocusPipelineResult,
    });

    contextChart$.next(selection);
    jest.advanceTimersByTime(500);

    expect(onFocusPipelineResult).toHaveBeenCalledWith(
      [{ focus: 1 }, { tableData: { rows: [] } }],
      selection
    );

    sub.unsubscribe();
  });

  it('does not call onFocusPipelineResult when getFocusPipeline returns null', () => {
    jest.useFakeTimers();
    const contextChart$ = new Subject<typeof selection>();
    const onFocusPipelineResult = jest.fn();

    const sub = createContextChartZoomSubscription(contextChart$, {
      ...baseHandlers,
      includeAnomaliesTable: true,
      getFocusPipeline$: () => null,
      onFocusPipelineResult,
    });

    contextChart$.next(selection);
    jest.advanceTimersByTime(500);

    expect(onFocusPipelineResult).not.toHaveBeenCalled();

    sub.unsubscribe();
  });
});
