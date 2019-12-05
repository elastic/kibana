/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { BehaviorSubject } from 'rxjs';

type Reducer<TState, TAction> = (state: TState, action: TAction) => TState;

export type Pipable<T> = Pick<BehaviorSubject<T>, 'pipe' | 'subscribe'>;

export type Dispatcher<T> = (action: T) => void;

export type StateSetter<T> = (setter: (state: T) => T) => void;

export interface StateManager<T> {
  state$: Pipable<T>;
  getState: () => T;
  setState: StateSetter<T>;
}

export interface ReducerStateManager<TState, TAction> extends StateManager<TState> {
  dispatch: Dispatcher<TAction>;
}

export function basicStateManager<T>(initialState: T): StateManager<T> {
  const state$ = new BehaviorSubject<T>(initialState);
  let currentState = initialState;

  return {
    state$,

    getState() {
      return currentState;
    },

    setState(setter) {
      currentState = setter(currentState);
      state$.next(currentState);
    },
  };
}

export function reducerStateManager<TState, TAction>(
  initialState: TState,
  reducer: Reducer<TState, TAction>
): ReducerStateManager<TState, TAction> {
  const manager = basicStateManager(initialState);

  return {
    ...manager,

    dispatch(action: TAction) {
      manager.setState(s => reducer(s, action));
    },
  };
}
