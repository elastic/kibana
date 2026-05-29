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
}

const BuilderStateContext = createContext<BuilderStateContextValue | null>(null);

export const BuilderStateProvider: React.FC<PropsWithChildren<BuilderStateContextValue>> = ({
  builderState,
  setBuilderState,
  children,
}) => {
  const value = useMemo<BuilderStateContextValue>(
    () => ({ builderState, setBuilderState }),
    [builderState, setBuilderState]
  );

  return <BuilderStateContext.Provider value={value}>{children}</BuilderStateContext.Provider>;
};

export const useBuilderState = <T,>(): { state: T; setState: (s: T) => void } => {
  const ctx = useContext(BuilderStateContext);
  if (!ctx) {
    throw new Error('useBuilderState must be used within a BuilderStateProvider');
  }
  return {
    state: ctx.builderState as T,
    setState: ctx.setBuilderState as (s: T) => void,
  };
};
