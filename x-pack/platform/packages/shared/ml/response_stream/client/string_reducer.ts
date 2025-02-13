/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Reducer, ReducerAction, ReducerState } from 'react';

type StringReducerPayload = string | undefined;
export type StringReducer = Reducer<string, StringReducerPayload>;

/**
 * The `stringReducer` is provided to handle plain string based streams with `streamFactory()`.
 *
 * @param state   - The current state, being the string fetched so far.
 * @param payload — The state update can be a plain string to be added or `undefined` to reset the state.
 * @returns The updated state, a string that combines the previous string and the payload.
 */
export function stringReducer(
  state: ReducerState<StringReducer>,
  payload: ReducerAction<StringReducer>
): ReducerState<StringReducer> {
  if (payload === undefined) {
    return '';
  }

  return `${state}${payload}`;
}
