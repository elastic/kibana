/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { configureCasesReducer, Action, State } from './reducer';
import { initialState, mapping } from './__mock__';

describe('Reducer', () => {
  let reducer: (state: State, action: Action) => State;

  beforeAll(() => {
    reducer = configureCasesReducer();
  });

  test('it should set the correct configuration', () => {
    const action: Action = {
      type: 'setCurrentConfiguration',
      currentConfiguration: { connectorId: '123', closureType: 'close-by-user' },
    };
    const state = reducer(initialState, action);

    expect(state).toEqual({
      ...state,
      currentConfiguration: action.currentConfiguration,
    });
  });

  test('it should set the correct connector id', () => {
    const action: Action = {
      type: 'setConnectorId',
      connectorId: '456',
    };
    const state = reducer(initialState, action);

    expect(state).toEqual({
      ...state,
      connectorId: action.connectorId,
    });
  });

  test('it should set the closure type', () => {
    const action: Action = {
      type: 'setClosureType',
      closureType: 'close-by-pushing',
    };
    const state = reducer(initialState, action);

    expect(state).toEqual({
      ...state,
      closureType: action.closureType,
    });
  });

  test('it should set the mapping', () => {
    const action: Action = {
      type: 'setMapping',
      mapping,
    };
    const state = reducer(initialState, action);

    expect(state).toEqual({
      ...state,
      mapping: action.mapping,
    });
  });
});
