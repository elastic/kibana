/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { reducer, initialState } from './api';
import { API_STATUS } from '../../constants';
import { apiRequestStart, apiRequestEnd, setApiError } from '../actions';

jest.mock('ui/new_platform');
jest.mock('../../constants', () => ({
  API_STATUS: {
    IDLE: 'idle',
    LOADING: 'loading',
  },
  SECTIONS: {
    AUTO_FOLLOW_PATTERN: 'autoFollowPattern',
    FOLLOWER_INDEX: 'followerIndex',
  },
}));

describe('CCR Api reducers', () => {
  const scope = 'testSection';

  it('API_REQUEST_START should set the Api status to "loading" on scope', () => {
    const result = reducer(initialState, apiRequestStart({ scope }));

    expect(result.status[scope]).toEqual(API_STATUS.LOADING);
  });

  it('API_END should set the Api status to "idle" on scope', () => {
    const updatedState = reducer(initialState, apiRequestStart({ scope }));
    const result = reducer(updatedState, apiRequestEnd({ scope }));

    expect(result.status[scope]).toEqual(API_STATUS.IDLE);
  });

  it('API_ERROR_SET should set the Api error on scope', () => {
    const error = { foo: 'bar' };
    const result = reducer(initialState, setApiError({ error, scope }));

    expect(result.error[scope]).toBe(error);
  });
});
