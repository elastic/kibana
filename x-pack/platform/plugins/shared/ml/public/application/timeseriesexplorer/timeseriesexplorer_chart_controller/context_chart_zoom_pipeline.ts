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
  catchError,
  debounceTime,
  defaultIfEmpty,
  filter,
  map,
  switchMap,
  tap,
  withLatestFrom,
} from 'rxjs';

const FOCUS_PIPELINE_EMPTY = Symbol('focusPipelineEmpty');

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
  /**
   * Focus load started but produced no result (null pipeline / empty completion).
   * Opt-in for hosts that defer reporting until focus settles.
   */
  onFocusPipelineEmpty?: (selection: ContextChartSelection) => void;
  /**
   * Focus load started and then failed.
   * Opt-in for hosts that defer reporting until focus settles.
   */
  onFocusPipelineError?: (error: unknown) => void;
}

function hasContextChartData(state: ContextChartZoomChartState): boolean {
  const ctx = state.contextChartData;
  const fc = state.contextForecastData;
  const hasCtx = Array.isArray(ctx) && ctx.length > 0;
  const hasFc = Array.isArray(fc) && fc.length > 0;
  return hasCtx || hasFc;
}

function hasFocusTerminalHandlers<TFocus, TTable>(
  handlers: ContextChartZoomHandlers<TFocus, TTable>
): boolean {
  return handlers.onFocusPipelineEmpty !== undefined || handlers.onFocusPipelineError !== undefined;
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
      map((selection) => {
        const state = handlers.getChartState();
        // Track whether we entered the focus-load path so empty/error can settle that wait later.
        let focusLoadStarted = false;
        if (hasContextChartData(state) && handlers.shouldTriggerFocusLoad(selection, state)) {
          handlers.onFocusLoadInit();
          handlers.onFocusLoadStart();
          focusLoadStarted = true;
        }
        return { selection, focusLoadStarted };
      }),
      switchMap(({ selection, focusLoadStarted }) => {
        const pipeline$ = handlers.getFocusPipeline$(selection);
        if (pipeline$ === null) {
          // Load was promised but there is no observable — treat as empty, not failure.
          if (focusLoadStarted) {
            handlers.onFocusPipelineEmpty?.(selection);
          }
          return EMPTY;
        }

        const normalized$: Observable<[TFocus, TTable]> = handlers.includeAnomaliesTable
          ? (pipeline$ as Observable<[TFocus, TTable]>)
          : pipeline$.pipe(
              map((emission) => {
                if (Array.isArray(emission)) {
                  return emission as [TFocus, TTable];
                }
                return [emission as TFocus, { tableData: undefined } as TTable];
              })
            );

        // Without terminal handlers (full-page SMV), keep the original success-only path.
        if (!focusLoadStarted || !hasFocusTerminalHandlers(handlers)) {
          return normalized$;
        }

        // Ensure every started focus load reaches a terminal: success, empty, or error.
        return normalized$.pipe(
          // Completing with no emission is a valid empty result for reporting.
          defaultIfEmpty(FOCUS_PIPELINE_EMPTY),
          tap((result) => {
            if (result === FOCUS_PIPELINE_EMPTY) {
              handlers.onFocusPipelineEmpty?.(selection);
            }
          }),
          // Drop the sentinel so subscribers only see real focus payloads.
          filter((result): result is [TFocus, TTable] => result !== FOCUS_PIPELINE_EMPTY),
          catchError((error) => {
            // Swallow after notifying the host so the subscription stays alive for later brushes.
            handlers.onFocusPipelineError?.(error);
            return EMPTY;
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
