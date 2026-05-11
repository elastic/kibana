/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Subject } from 'rxjs';
import {
  type Observable,
  type Subscription,
  EMPTY,
  debounceTime,
  map,
  switchMap,
  tap,
  withLatestFrom,
} from 'rxjs';

export interface ContextChartSelection {
  from: Date;
  to: Date;
}

export interface ContextChartZoomChartState {
  contextChartData?: unknown[];
  contextForecastData?: unknown[];
  focusChartData?: unknown;
  zoomFromFocusLoaded?: Date;
  zoomToFocusLoaded?: Date;
}

export interface ContextChartZoomHandlers<TFocus = unknown, TTable = unknown> {
  includeAnomaliesTable: boolean;
  /** First tap: update brush preview (zoomFrom/zoomTo). */
  onZoomPreview: (selection: ContextChartSelection) => void;
  /** Read mutable chart + focus state (typically React state snapshot). */
  getChartState: () => ContextChartZoomChartState;
  /** True when init needs focus load or brush range changed vs last loaded focus. */
  shouldTriggerFocusLoad: (
    selection: ContextChartSelection,
    state: ContextChartZoomChartState
  ) => boolean;
  /** Set loading before focus queries (fullRefresh false, loading true). */
  onFocusLoadStart: () => void;
  /** Mark init flag true when entering focus load path (legacy contextChartSelectedInitCallDone). */
  onFocusLoadInit: () => void;
  /**
   * Pipeline for the brushed range after debounce.
   * - When `includeAnomaliesTable` is **true**, return `forkJoin([focus$, table$])` (one emission: `[TFocus, TTable]`).
   * - When **false**, return **only** the focus observable; the factory merges `{ tableData: undefined }` so
   *   `onFocusPipelineResult` keeps the same tuple shape without running a table request.
   */
  getFocusPipeline$: (
    selection: ContextChartSelection
  ) => Observable<[TFocus, TTable] | TFocus> | null;
  /** Merge focus + optional table payload into component state. */
  onFocusPipelineResult: (data: [TFocus, TTable], selection: ContextChartSelection) => void;
}

function hasContextChartData(state: ContextChartZoomChartState): boolean {
  const ctx = state.contextChartData;
  const fc = state.contextForecastData;
  const hasCtx = Array.isArray(ctx) && ctx.length > 0;
  const hasFc = Array.isArray(fc) && fc.length > 0;
  return hasCtx || hasFc;
}

/**
 * Shared debounced brush → focus pipeline used by SMV page and embeddable chart.
 *
 * Chart-only mode (`includeAnomaliesTable: false`): callers return **only** `getFocusData$` from
 * `getFocusPipeline$`; this factory appends `{ tableData: undefined }` so `onFocusPipelineResult` stays unchanged.
 */
export function createContextChartZoomSubscription<TFocus = unknown, TTable = unknown>(
  contextChart$: Subject<ContextChartSelection>,
  handlers: ContextChartZoomHandlers<TFocus, TTable>
): Subscription {
  return contextChart$
    .pipe(
      tap((selection) => {
        handlers.onZoomPreview(selection);
      }),
      debounceTime(500),
      tap((selection) => {
        const state = handlers.getChartState();
        if (!hasContextChartData(state)) {
          return;
        }
        if (handlers.shouldTriggerFocusLoad(selection, state)) {
          handlers.onFocusLoadInit();
          handlers.onFocusLoadStart();
        }
      }),
      switchMap((selection) => {
        const pipeline$ = handlers.getFocusPipeline$(selection);
        if (pipeline$ === null) {
          return EMPTY;
        }
        if (handlers.includeAnomaliesTable) {
          return pipeline$ as Observable<[TFocus, TTable]>;
        }
        return pipeline$.pipe(
          map((emission) => {
            if (Array.isArray(emission)) {
              return emission as [TFocus, TTable];
            }
            return [emission as TFocus, { tableData: undefined } as TTable];
          })
        );
      }),
      withLatestFrom(contextChart$)
    )
    .subscribe(([data, selection]) => {
      if (data === undefined) {
        return;
      }
      handlers.onFocusPipelineResult(data as [TFocus, TTable], selection);
    });
}
