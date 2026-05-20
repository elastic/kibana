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
export declare function stringReducer(state: ReducerState<StringReducer>, payload: ReducerAction<StringReducer>): ReducerState<StringReducer>;
export {};
