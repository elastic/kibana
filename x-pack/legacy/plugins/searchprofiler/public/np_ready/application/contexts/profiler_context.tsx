/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext, createContext, Dispatch } from 'react';
import { useStore, State, Action } from '../store';

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
