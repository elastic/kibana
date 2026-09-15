/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useMemo, type PropsWithChildren } from 'react';
import type { BuilderState } from './types';

interface BuilderStateContextValue {
  builderState: BuilderState;
  setBuilderState: (state: BuilderState) => void;
  initBuilderState: (state: BuilderState) => void;
}

interface BuilderStateProviderProps {
  builderState: BuilderState;
  setBuilderState: (state: BuilderState) => void;
  /**
   * Seeds builder state without marking the form dirty. Required so mount-time
   * initialization cannot fall through to `setBuilderState`. Callers that do
   * not track dirty state may pass the same function as `setBuilderState`.
   */
  initBuilderState: (state: BuilderState) => void;
}

/*
 * Fast Refresh re-executes this module (new `createContext`) while step components
 * may keep the previous `useBuilderState` closure. Reuse the first context object
 * in development so Back/remount still sees the provider.
 */
const globalForBuilderStateContext = globalThis as typeof globalThis & {
  __kbnAlertingV2BuilderStateContext?: React.Context<BuilderStateContextValue | null>;
};
const BuilderStateContext =
  (process.env.NODE_ENV !== 'production'
    ? globalForBuilderStateContext.__kbnAlertingV2BuilderStateContext
    : undefined) ?? createContext<BuilderStateContextValue | null>(null);
if (process.env.NODE_ENV !== 'production') {
  globalForBuilderStateContext.__kbnAlertingV2BuilderStateContext = BuilderStateContext;
}

export const BuilderStateProvider: React.FC<PropsWithChildren<BuilderStateProviderProps>> = ({
  builderState,
  setBuilderState,
  initBuilderState,
  children,
}) => {
  const value = useMemo<BuilderStateContextValue>(
    () => ({ builderState, setBuilderState, initBuilderState }),
    [builderState, setBuilderState, initBuilderState]
  );

  return <BuilderStateContext.Provider value={value}>{children}</BuilderStateContext.Provider>;
};

export const useBuilderState = <T,>(): {
  state: T;
  setState: (s: T) => void;
  /**
   * Seeds builder state without marking the flyout dirty. Call only from a
   * mount-time effect — user edits must use `setState`.
   */
  initStateOnMount: (s: T) => void;
} => {
  const ctx = useContext(BuilderStateContext);
  if (!ctx) {
    throw new Error('useBuilderState must be used within a BuilderStateProvider');
  }
  return {
    state: ctx.builderState as T,
    setState: ctx.setBuilderState as (s: T) => void,
    initStateOnMount: ctx.initBuilderState as (s: T) => void,
  };
};
