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
import type { EsqlQueryStepState } from './esql_query_step';
import { GOLD_ESQL_DATAFEED_QUERY } from './gold_query';

export interface EsqlWizardState extends EsqlQueryStepState {
  jobId: string;
  queryProbeState: 'idle' | 'loading' | 'error' | 'success';
  wizardStart: string;
  wizardEnd: string;
}

export interface EsqlWizardContextValue {
  state: EsqlWizardState;
  setJobId: (jobId: string) => void;
  setQueryState: (next: Partial<EsqlQueryStepState>) => void;
  setQueryProbeState: (queryProbeState: EsqlWizardState['queryProbeState']) => void;
  setTimeRange: (range: { start: string; end: string }) => void;
}

const initialState: EsqlWizardState = {
  jobId: '',
  queryProbeState: 'idle',
  query: GOLD_ESQL_DATAFEED_QUERY,
  sourceTimeField: '@timestamp',
  bucketSpan: '1h',
  columns: [],
  emittedTimeField: '',
  detectorFields: [],
  influencers: [],
  wizardStart: 'now-15m',
  wizardEnd: 'now',
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
  const setQueryProbeState = useCallback((queryProbeState: EsqlWizardState['queryProbeState']) => {
    setState((current) => ({ ...current, queryProbeState }));
  }, []);
  const setTimeRange = useCallback(({ start, end }: { start: string; end: string }) => {
    if ([start, end].some((value) => value === '' || value === '0' || value === 'MAX')) return;

    setState((current) => ({ ...current, wizardStart: start, wizardEnd: end }));
  }, []);
  const value = useMemo(
    () => ({ state, setJobId, setQueryState, setQueryProbeState, setTimeRange }),
    [setJobId, setQueryProbeState, setQueryState, setTimeRange, state]
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
