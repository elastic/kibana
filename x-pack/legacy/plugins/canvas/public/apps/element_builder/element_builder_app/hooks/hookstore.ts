/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useState, useEffect, Dispatch, Reducer, SetStateAction, useRef, useCallback } from 'react';

export interface DispatchedAction<T, P> {
  type: T;
  payload: P;
}

export interface Store<State, Action> {
  state: State;
  stateFns: Array<Dispatch<SetStateAction<State>>>;
  reducer: Reducer<State, Action>;
  setState: (action: Action) => void;
}

export const createStore = <State, Action>(
  state: State,
  reducer: Reducer<State, Action>
): Store<State, Action> => {
  const store: Store<State, Action> = {
    state,
    reducer,
    stateFns: [],
    setState(action: Action) {
      const newState = this.reducer(this.state, action);

      if (JSON.stringify(newState) !== JSON.stringify(this.state)) {
        this.state = newState;
        this.stateFns.forEach(setter => setter(this.state));
      }
    },
  };
  store.setState = store.setState.bind(store);
  return store;
};

const useStore = <State, Action>(
  store: Store<State, Action>
): { state: State; dispatch: Dispatch<Action> } => {
  const [hookState, setHookState] = useState<State>(store.state);

  const state = useRef(hookState);
  const getState = useCallback(() => state.current, [state]);
  const setState = useCallback(
    newState => {
      state.current = newState;
      setHookState(newState);
    },
    [state, setHookState]
  );

  useEffect(() => {
    if (!store.stateFns.includes(setState)) {
      store.stateFns.push(setState);
    }
    return () => {
      store.stateFns = store.stateFns.filter(setter => setter !== setState);
    };
  }, []);

  const dispatch = useCallback(
    action => {
      return store.setState(action);
    },
    [getState]
  );

  return { state: hookState, dispatch };
};

export const createActionFactory = <ActionEnum>() => <T extends ActionEnum, P>(
  type: T,
  payload: P
): DispatchedAction<T, P> => ({
  type,
  payload,
});

export type ActionHook<Action, Actions> = () => [Dispatch<Action>, Actions];
export type ReadHook<State> = () => State;

export const hookstore = <State, Action, Actions>(
  initialState: State,
  actions: Actions,
  reducer: Reducer<State, Action>
): [ReadHook<State>, ActionHook<Action, Actions>] => {
  const store = createStore(initialState, reducer);

  const useReadHook: ReadHook<State> = () => {
    const { state } = useStore(store);
    return state;
  };

  const useActionHook: ActionHook<Action, Actions> = () => {
    const { dispatch } = useStore(store);
    return [dispatch, actions];
  };

  return [useReadHook, useActionHook];
};
