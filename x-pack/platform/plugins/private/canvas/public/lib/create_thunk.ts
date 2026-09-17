/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Dispatch, Action } from 'redux-v4';
import type { State } from '../../types';

type CreateThunk = <Arguments extends any[]>(
  type: string,
  fn: (
    params: { type: string; dispatch: Dispatch; getState: () => State },
    ...args: Arguments
  ) => void
) => (...args: Arguments) => Action<Arguments>;

// Local implementation of the `createThunk` helper (previously provided by the untyped
// `redux-thunks` package). It builds a thunk action creator compatible with the `redux-thunk`
// middleware and mimics `redux-actions`' `.toString()` behavior so the returned creator
// stringifies to its action type. Keeping it here provides a strongly-typed, single point of
// replacement tied to Canvas State.
const createThunkFn = (
  type: string,
  fn: (params: { type: string; dispatch: Dispatch; getState: () => State }, ...args: any[]) => void
) => {
  const actionCreator =
    (...args: any[]) =>
    (dispatch: Dispatch, getState: () => State) =>
      fn({ dispatch, getState, type }, ...args);

  actionCreator.toString = () => type;

  return actionCreator;
};

// The runtime action creator returns a thunk function for the `redux-thunk` middleware, while
// the public `CreateThunk` contract describes it as an action for consumers; bridge the two.
export const createThunk = createThunkFn as unknown as CreateThunk;
