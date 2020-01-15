/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { useState, useLayoutEffect } from 'react';
import { BehaviorSubject } from 'rxjs';

type Reducer<T, A> = (prevState: T, action: A) => T;

interface Store<T, A> {
  get(): T;
  set(newState: T): void;
  subscribe(subscriber: (value: T) => void): () => void;
  dispatch(action: A): void;
}

export interface DispatchedAction<T, P> {
  type: T;
  payload: P;
}

export const createActionFactory = <ActionEnum>() => <T extends ActionEnum, P>(
  type: T,
  payload: P
): DispatchedAction<T, P> => ({
  type,
  payload,
});

export const createStore = <State, Action>(
  initialState: State,
  reducer: Reducer<State, Action>
): Store<State, Action> => {
  const state$ = new BehaviorSubject(initialState);
  return {
    get: () => state$.value,
    set: (value: State) => state$.next(value),
    subscribe: listener => {
      const subscription = state$.subscribe(listener);
      return () => subscription.unsubscribe();
    },
    dispatch: (action: Action) => {
      const nextState = reducer(state$.value, action);
      state$.next(nextState);
    },
  };
};

export const useStore = <State, Action>(store: Store<State, Action>) => {
  const [state, setState] = useState(store.get());

  useLayoutEffect(() => {
    return store.subscribe(setState);
  }, [store]);

  return { state, dispatch: store.dispatch };
};
