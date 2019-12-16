/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { bindActionCreators, Dispatch } from 'redux';

/**
 * Selectors
 */
export type Selector<State, Value> = (state: State) => Value;

export interface Selectors<State = any, Value = any> {
  [selectorName: string]: Selector<State, Value>;
}

export type GlobalSelectors<GlobalState, LocalSelectors extends Selectors> = {
  [selectorName in keyof LocalSelectors]: Selector<
    GlobalState,
    ReturnType<LocalSelectors[selectorName]>
  >;
};

export const globalizeSelector = <
  GlobalState,
  LocalSelector extends Selector<LocalState, Value>,
  LocalState = any,
  Value = any
>(
  globalizer: Selector<GlobalState, LocalState>,
  selector: LocalSelector
): Selector<GlobalState, Value> => (globalState: GlobalState) => selector(globalizer(globalState));

export const globalizeSelectors = <
  GlobalState,
  LocalSelectors extends Selectors<LocalState>,
  LocalState = any
>(
  globalizer: (globalState: GlobalState) => LocalState,
  selectors: LocalSelectors
): GlobalSelectors<GlobalState, LocalSelectors> => {
  const globalSelectors = {} as GlobalSelectors<GlobalState, LocalSelectors>;
  for (const s in selectors) {
    if (selectors.hasOwnProperty(s)) {
      globalSelectors[s] = globalizeSelector(globalizer, selectors[s]);
    }
  }
  return globalSelectors;
};

/**
 * Action Creators
 */
interface ActionCreators {
  [key: string]: (arg: any) => any;
}

type PlainActionCreator<WrappedActionCreator> = WrappedActionCreator extends () => infer R
  ? () => R
  : WrappedActionCreator extends (payload: void) => infer R
  ? () => R
  : WrappedActionCreator extends (payload: infer A) => infer R
  ? (payload: A) => R
  : never;

export const bindPlainActionCreators = <WrappedActionCreators extends ActionCreators>(
  actionCreators: WrappedActionCreators
) => (dispatch: Dispatch) =>
  (bindActionCreators(actionCreators, dispatch) as unknown) as {
    [P in keyof WrappedActionCreators]: PlainActionCreator<WrappedActionCreators[P]>;
  };
