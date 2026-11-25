/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useMemo, type PropsWithChildren } from 'react';
import type { BuilderState } from './types';

/** `origin: 'init'` marks a programmatic seed. Dirty-tracking callers must not treat it as a user edit. */
export interface BuilderStateUpdateOptions {
  origin?: 'init';
}

interface BuilderStateContextValue {
  builderState: BuilderState;
  setBuilderState: (state: BuilderState, options?: BuilderStateUpdateOptions) => void;
  initBuilderState: (state: BuilderState) => void;
}

interface BuilderStateProviderProps {
  builderState: BuilderState;
  setBuilderState: (state: BuilderState, options?: BuilderStateUpdateOptions) => void;
  /**
   * Seeds builder state without the caller's dirty-tracking wrapper.
   * Defaults to `setBuilderState` when the caller does not track dirty state.
   */
  initBuilderState?: (state: BuilderState) => void;
}

const BuilderStateContext = createContext<BuilderStateContextValue | null>(null);

export const BuilderStateProvider: React.FC<PropsWithChildren<BuilderStateProviderProps>> = ({
  builderState,
  setBuilderState,
  initBuilderState,
  children,
}) => {
  const init = initBuilderState ?? setBuilderState;
  const value = useMemo<BuilderStateContextValue>(
    () => ({ builderState, setBuilderState, initBuilderState: init }),
    [builderState, setBuilderState, init]
  );

  return <BuilderStateContext.Provider value={value}>{children}</BuilderStateContext.Provider>;
};

export const useBuilderState = <T,>(): {
  state: T;
  setState: (s: T, options?: BuilderStateUpdateOptions) => void;
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
    setState: ctx.setBuilderState as (s: T, options?: BuilderStateUpdateOptions) => void,
    initStateOnMount: ctx.initBuilderState as (s: T) => void,
  };
};
