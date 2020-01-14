/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { reducer } from './reducer';
import { initialState, State } from './store';

describe('Searchprofiler store reducer', () => {
  let state: State;

  beforeEach(() => {
    state = initialState;
  });

  it('profiles as expected', () => {
    const nextState = reducer(state, { type: 'setProfiling', value: true });

    expect(nextState).toEqual({
      ...state,
      pristine: false,
      profiling: true,
    } as State);

    const finalState = reducer(nextState, { type: 'setProfiling', value: false });

    expect(finalState).toEqual({
      ...nextState,
      pristine: false,
      profiling: false,
    } as State);
  });

  it('highlights as expected', () => {
    const op = { children: null } as any;
    const shard = { id: ['a', 'b', 'c'] } as any;
    const nextState = reducer(state, {
      type: 'setHighlightDetails',
      value: { operation: op, indexName: 'test', shard },
    });

    expect(nextState).toEqual({
      ...state,
      highlightDetails: {
        operation: {
          /* .children no longer defined */
        },
        shardName: '[a][c]',
        indexName: 'test',
      },
    });

    const finalState = reducer(state, {
      type: 'setHighlightDetails',
      value: null,
    });

    expect(finalState).toEqual({ ...state, highlightDetails: null });
  });
});
