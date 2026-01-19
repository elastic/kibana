/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { Subject } from 'rxjs';
import { TestProviders } from './mock/test_providers';
import { useCasesLocalStorage } from './use_cases_local_storage';
import React from 'react';
import { coreMock } from '@kbn/core/public/mocks';

describe('useCasesLocalStorage', () => {
  const initialValue = { foo: 'bar' };

  beforeEach(() => {
    localStorage.clear();
  });

  describe('owner', () => {
    const lsKey = 'myKey';
    const ownerLSKey = `securitySolution.${lsKey}`;

    it('initialize the local storage correctly', async () => {
      const { result } = renderHook(() => useCasesLocalStorage(lsKey, initialValue), {
        wrapper: TestProviders,
      });

      expect(result.current[0]).toEqual(initialValue);
      expect(localStorage.getItem(ownerLSKey)).toEqual('{"foo":"bar"}');
    });

    it('initialize with an existing value in the local storage correctly', async () => {
      localStorage.setItem(ownerLSKey, '{"foo":"new value"}');

      const { result } = renderHook(() => useCasesLocalStorage(lsKey, initialValue), {
        wrapper: TestProviders,
      });

      expect(result.current[0]).toEqual({ foo: 'new value' });
      expect(localStorage.getItem(ownerLSKey)).toEqual('{"foo":"new value"}');
    });

    it('persists to the local storage correctly', async () => {
      const { result } = renderHook(() => useCasesLocalStorage(lsKey, initialValue), {
        wrapper: TestProviders,
      });

      act(() => {
        result.current[1]({ foo: 'test' });
      });

      expect(result.current[0]).toEqual({ foo: 'test' });
      expect(localStorage.getItem(ownerLSKey)).toEqual('{"foo":"test"}');
    });

    it('returns the initial value in case of parsing errors', async () => {
      localStorage.setItem(ownerLSKey, 'test');

      const { result } = renderHook(() => useCasesLocalStorage(lsKey, initialValue), {
        wrapper: TestProviders,
      });

      expect(result.current[0]).toEqual(initialValue);
      expect(localStorage.getItem(ownerLSKey)).toEqual('{"foo":"bar"}');
    });

    it('supports multiple owners correctly', async () => {
      const { result } = renderHook(() => useCasesLocalStorage(lsKey, initialValue), {
        wrapper: (props) => (
          <TestProviders {...props} owner={['securitySolution', 'observability']} />
        ),
      });

      expect(result.current[0]).toEqual(initialValue);
      expect(localStorage.getItem('securitySolution.observability.myKey')).toEqual('{"foo":"bar"}');
    });
  });

  describe('appId', () => {
    const lsKey = 'myKey';
    const ownerLSKey = `testAppId.${lsKey}`;

    it('initialize the local storage correctly', async () => {
      const { result } = renderHook(() => useCasesLocalStorage(lsKey, initialValue), {
        wrapper: (props) => <TestProviders {...props} owner={[]} />,
      });

      expect(result.current[0]).toEqual(initialValue);
      expect(localStorage.getItem(ownerLSKey)).toEqual('{"foo":"bar"}');
    });

    it('initialize with an existing value in the local storage correctly', async () => {
      localStorage.setItem(ownerLSKey, '{"foo":"new value"}');

      const { result } = renderHook(() => useCasesLocalStorage(lsKey, initialValue), {
        wrapper: (props) => <TestProviders {...props} owner={[]} />,
      });

      expect(result.current[0]).toEqual({ foo: 'new value' });
      expect(localStorage.getItem(ownerLSKey)).toEqual('{"foo":"new value"}');
    });

    it('persists to the local storage correctly', async () => {
      const { result } = renderHook(() => useCasesLocalStorage(lsKey, initialValue), {
        wrapper: (props) => <TestProviders {...props} owner={[]} />,
      });

      act(() => {
        result.current[1]({ foo: 'test' });
      });

      expect(result.current[0]).toEqual({ foo: 'test' });
      expect(localStorage.getItem(ownerLSKey)).toEqual('{"foo":"test"}');
    });

    it('returns the initial value in case of parsing errors', async () => {
      localStorage.setItem(ownerLSKey, 'test');

      const { result } = renderHook(() => useCasesLocalStorage(lsKey, initialValue), {
        wrapper: (props) => <TestProviders {...props} owner={[]} />,
      });

      expect(result.current[0]).toEqual(initialValue);
      expect(localStorage.getItem(ownerLSKey)).toEqual('{"foo":"bar"}');
    });

    it('returns the initial value and not persist to local storage if the appId is not defined', async () => {
      const coreStart = coreMock.createStart();
      coreStart.application.currentAppId$ = new Subject();

      const { result } = renderHook(() => useCasesLocalStorage(lsKey, initialValue), {
        wrapper: (props) => <TestProviders {...props} owner={[]} coreStart={coreStart} />,
      });

      expect(result.current[0]).toEqual(initialValue);
      expect(localStorage.getItem(ownerLSKey)).toEqual(null);
    });
  });
});
