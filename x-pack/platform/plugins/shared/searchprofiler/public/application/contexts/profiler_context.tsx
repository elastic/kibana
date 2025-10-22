/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Dispatch } from 'react';
import React, { useContext, createContext } from 'react';
import type { State, Action } from '../store';
import { useStore } from '../store';

const ProfilerReadContext = createContext<State>(null as any);
const ProfilerActionContext = createContext<Dispatch<Action>>(null as any);

export const ProfileContextProvider = ({ children }: { children: React.ReactNode }) => {
  const { dispatch, state } = useStore();
  return (
    <ProfilerReadContext.Provider value={state}>
      <ProfilerActionContext.Provider value={dispatch}>{children}</ProfilerActionContext.Provider>
    </ProfilerReadContext.Provider>
  );
};

export const useProfilerReadContext = () => {
  const ctx = useContext(ProfilerReadContext);
  if (ctx == null) {
    throw new Error(`useProfilerReadContext must be called inside ProfilerReadContext`);
  }
  return ctx;
};

export const useProfilerActionContext = () => {
  const ctx = useContext(ProfilerActionContext);
  if (ctx == null) {
    throw new Error(`useProfilerActionContext must be called inside ProfilerActionContext`);
  }
  return ctx;
};
