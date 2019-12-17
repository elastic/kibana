/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { renderHook } from '@testing-library/react-hooks';
import { act } from 'react-test-renderer';

import { BehaviorSubject } from 'rxjs';

import { initializeAppState, subscribeAppStateToObservable } from './app_state_utils';
import { useUrlState } from './url_state';

// Notes on the test structure:
// - Since useUrlState() is a custom hook, we need to use `renderHook` to get its response.
// - `useUrlState()` uses react-router-dom's `useHistory()` which expects its
//   own context. We can provide this context using `MemoryRouter`.
// - `renderHook` accepts a wrapper which can be used to pass on `MemoryRouter`
//   so the context is available for the text.

const wrapper = ({ children }) => <MemoryRouter>{children}</MemoryRouter>;

describe('ML - initializeAppState', () => {
  it('Throws an error when called without arguments.', () => {
    expect(() => initializeAppState()).toThrow();
  });

  it('Initializes an appstate, gets a test value.', async () => {
    const { result } = renderHook(() => useUrlState('_a'), { wrapper });

    await act(async () => {
      initializeAppState(result.current, 'mlTest', { value: 1 });
    });

    expect(result.current.get('mlTest').value).toBe(1);
  });
});

describe('ML - subscribeAppStateToObservable', () => {
  it('Initializes a custom state store, sets and gets a test value using events.', async done => {
    const o$ = new BehaviorSubject({ value: 2 });

    const { result } = renderHook(() => useUrlState('_a'), { wrapper });
    const urlState = result.current;

    await act(async () => {
      subscribeAppStateToObservable(urlState, 'mlTest', o$);
    });

    o$.subscribe(payload => {
      expect(payload.value).toBe(2);
      expect(urlState.get('mlTest').value).toBe(2);
      done();
    });
  });
});
