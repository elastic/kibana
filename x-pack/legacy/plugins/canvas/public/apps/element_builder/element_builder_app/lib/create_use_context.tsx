/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Context, useContext, createContext, useReducer, Dispatch, Reducer } from 'react';

function create<T>(context: Context<T>, name: string) {
  return () => {
    const ctx = useContext(context);
    if (!ctx) {
      throw new Error(`${name} should be used inside of ${name}Provider!`);
    }
    return ctx;
  };
}

export function createUseContext<State, Action>(
  reducer: Reducer<State, Action>,
  initialState: State,
  prefix: string
) {
  const ReadContext = createContext<State>(null as any);
  const ActionContext = createContext<Dispatch<Action>>(null as any);

  const Provider = ({ children }: { children: React.ReactNode }) => {
    const [state, dispatch] = useReducer(reducer, initialState);
    return (
      <ReadContext.Provider value={state}>
        <ActionContext.Provider value={dispatch}>{children}</ActionContext.Provider>
      </ReadContext.Provider>
    );
  };

  const useRead = create(ReadContext, prefix + 'Context');
  const useActions = create(ActionContext, prefix + 'ActionContext');

  return { Provider, useRead, useActions };
}
