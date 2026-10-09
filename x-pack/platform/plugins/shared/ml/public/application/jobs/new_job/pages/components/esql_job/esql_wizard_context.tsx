/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import type { EsqlQueryStepState } from './esql_query_step_state';
import { GOLD_ESQL_DATAFEED_QUERY } from './gold_query';

export interface EsqlHistogramPoint {
  time: number;
  value: number;
}

export type EsqlHistogramStatus = 'idle' | 'loading' | 'success' | 'error';

export interface EsqlWizardState extends EsqlQueryStepState {
  jobId: string;
  jobDescription: string;
  jobGroups: string[];
  queryProbeState: 'idle' | 'loading' | 'error' | 'success';
  /** Elasticsearch error reason surfaced from the last failed columns probe. */
  columnsErrorMessage?: string;
  wizardStart: string;
  wizardEnd: string;
  /**
   * When true (default) the datafeed is started at `wizardStart` with no end
   * (lookback over the picked range, then real time). When false it is started
   * with `end: wizardEnd` (lookback only; the job closes when done).
   */
  continueInRealTime: boolean;
  /** Row-count-per-bucket histogram for the Query & time range step (LEAD DECISION, g2sz.10). */
  histogramStatus: EsqlHistogramStatus;
  histogramTotalRows: number;
  histogramErrorMessage?: string;
  histogramSeries: EsqlHistogramPoint[];
  /**
   * Bumped to re-resolve relative times (`now-15m`) against the current clock:
   * on an explicit refresh and when the user returns to the Query & time range
   * step. The histogram and output preview re-run when it changes (g2sz.28).
   */
  rangeRefreshToken: number;
  /**
   * Row count reported by the step-1 output preview for the current query and
   * range; `undefined` while it has not run, is loading, or failed. Used only to
   * explain why Next is blocked when the histogram is empty.
   */
  outputPreviewRowCount?: number;
}

export interface EsqlWizardContextValue {
  state: EsqlWizardState;
  setJobId: (jobId: string) => void;
  setJobDescription: (jobDescription: string) => void;
  setJobGroups: (jobGroups: string[]) => void;
  setQueryState: (next: Partial<EsqlQueryStepState>) => void;
  setQueryProbeState: (queryProbeState: EsqlWizardState['queryProbeState']) => void;
  setColumnsErrorMessage: (columnsErrorMessage: string | undefined) => void;
  setTimeRange: (range: { start: string; end: string }) => void;
  setContinueInRealTime: (continueInRealTime: boolean) => void;
  refreshTimeRange: () => void;
  setOutputPreviewRowCount: (outputPreviewRowCount: number | undefined) => void;
  setHistogramState: (
    next: Partial<
      Pick<
        EsqlWizardState,
        'histogramStatus' | 'histogramTotalRows' | 'histogramErrorMessage' | 'histogramSeries'
      >
    >
  ) => void;
}

const initialState: EsqlWizardState = {
  jobId: '',
  jobDescription: '',
  jobGroups: [],
  queryProbeState: 'idle',
  columnsErrorMessage: undefined,
  query: GOLD_ESQL_DATAFEED_QUERY,
  sourceTimeField: '@timestamp',
  sourceTimeFieldTouched: false,
  bucketSpan: '1h',
  columns: [],
  emittedTimeField: '',
  detectors: [],
  influencers: [],
  summaryCountFieldName: '',
  delayedDataCheckEnabled: false,
  wizardStart: 'now-15m',
  wizardEnd: 'now',
  continueInRealTime: true,
  histogramStatus: 'idle',
  histogramTotalRows: 0,
  histogramErrorMessage: undefined,
  histogramSeries: [],
  rangeRefreshToken: 0,
};

const EsqlWizardContext = createContext<EsqlWizardContextValue | undefined>(undefined);

export const EsqlWizardProvider = ({ children }: PropsWithChildren) => {
  const [state, setState] = useState<EsqlWizardState>(initialState);
  const setQueryState = useCallback((next: Partial<EsqlQueryStepState>) => {
    setState((current) => ({ ...current, ...next }));
  }, []);
  const setJobId = useCallback((jobId: string) => {
    setState((current) => ({ ...current, jobId }));
  }, []);
  const setJobDescription = useCallback((jobDescription: string) => {
    setState((current) => ({ ...current, jobDescription }));
  }, []);
  const setJobGroups = useCallback((jobGroups: string[]) => {
    setState((current) => ({ ...current, jobGroups }));
  }, []);
  const setQueryProbeState = useCallback((queryProbeState: EsqlWizardState['queryProbeState']) => {
    setState((current) => ({ ...current, queryProbeState }));
  }, []);
  const setColumnsErrorMessage = useCallback((columnsErrorMessage: string | undefined) => {
    setState((current) => ({ ...current, columnsErrorMessage }));
  }, []);
  const setTimeRange = useCallback(({ start, end }: { start: string; end: string }) => {
    if ([start, end].some((value) => value === '' || value === '0' || value === 'MAX')) return;

    setState((current) => ({ ...current, wizardStart: start, wizardEnd: end }));
  }, []);
  const setContinueInRealTime = useCallback((continueInRealTime: boolean) => {
    setState((current) => ({ ...current, continueInRealTime }));
  }, []);
  const refreshTimeRange = useCallback(() => {
    setState((current) => ({ ...current, rangeRefreshToken: current.rangeRefreshToken + 1 }));
  }, []);
  const setOutputPreviewRowCount = useCallback((outputPreviewRowCount: number | undefined) => {
    setState((current) =>
      current.outputPreviewRowCount === outputPreviewRowCount
        ? current
        : { ...current, outputPreviewRowCount }
    );
  }, []);
  const setHistogramState = useCallback(
    (
      next: Partial<
        Pick<
          EsqlWizardState,
          'histogramStatus' | 'histogramTotalRows' | 'histogramErrorMessage' | 'histogramSeries'
        >
      >
    ) => {
      setState((current) => ({ ...current, ...next }));
    },
    []
  );
  const value = useMemo(
    () => ({
      state,
      setJobId,
      setJobDescription,
      setJobGroups,
      setQueryState,
      setQueryProbeState,
      setColumnsErrorMessage,
      setTimeRange,
      setContinueInRealTime,
      refreshTimeRange,
      setOutputPreviewRowCount,
      setHistogramState,
    }),
    [
      refreshTimeRange,
      setColumnsErrorMessage,
      setContinueInRealTime,
      setHistogramState,
      setJobDescription,
      setJobGroups,
      setJobId,
      setOutputPreviewRowCount,
      setQueryProbeState,
      setQueryState,
      setTimeRange,
      state,
    ]
  );

  return <EsqlWizardContext.Provider value={value}>{children}</EsqlWizardContext.Provider>;
};

export const useEsqlWizardContext = (): EsqlWizardContextValue => {
  const context = useContext(EsqlWizardContext);

  if (context === undefined) {
    throw new Error('EsqlWizardContext must be used within EsqlWizardProvider');
  }

  return context;
};

export const useOptionalEsqlWizardContext = (): EsqlWizardContextValue | undefined =>
  useContext(EsqlWizardContext);
