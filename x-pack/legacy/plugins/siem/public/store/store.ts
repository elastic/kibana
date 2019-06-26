/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Action, applyMiddleware, compose, createStore as createReduxStore, Store } from 'redux';

import { createEpicMiddleware } from 'redux-observable';
import { Observable } from 'rxjs';

import { AppApolloClient } from '../lib/lib';
import { appSelectors } from './app';
import { timelineSelectors } from './timeline';
import { inputsSelectors } from './inputs';
import { State, initialState, reducer } from './reducer';
import { createRootEpic } from './epic';

declare global {
  interface Window {
    __REDUX_DEVTOOLS_EXTENSION_COMPOSE__: typeof compose;
  }
}
let store: Store<State, Action> | null = null;
export const createStore = (
  state: State = initialState,
  apolloClient: Observable<AppApolloClient>
): Store<State, Action> => {
  const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

  const middlewareDependencies = {
    apolloClient$: apolloClient,
    selectNotesByIdSelector: appSelectors.selectNotesByIdSelector,
    timelineByIdSelector: timelineSelectors.timelineByIdSelector,
    timelineTimeRangeSelector: inputsSelectors.timelineTimeRangeSelector,
  };

  const epicMiddleware = createEpicMiddleware<Action, Action, State, typeof middlewareDependencies>(
    {
      dependencies: middlewareDependencies,
    }
  );

  store = createReduxStore(reducer, state, composeEnhancers(applyMiddleware(epicMiddleware)));

  epicMiddleware.run(createRootEpic<State>());

  return store;
};

export const getStore = (): Store<State, Action> | null => store;
