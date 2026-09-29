/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import * as api from './api';
import { useToasts } from '../common/lib/kibana';
import { usePostObservable } from './use_post_observables';
import { casesQueriesKeys } from './constants';
import { mockCase } from './mock';
import type { AddObservableRequest } from '../../common/types/api';
import { TestProviders, createTestQueryClient } from '../common/mock';

vi.mock('./api');
vi.mock('../common/lib/kibana');

const observableMock: AddObservableRequest = {
  observable: {
    typeKey: '80a3cc9b-500a-45fa-909a-b4f78751726c',
    value: 'test_value',
    description: '',
  },
};

describe('usePostObservables', () => {
  const addSuccess = vi.fn();
  const addError = vi.fn();

  (useToasts as Mock).mockReturnValue({ addSuccess, addError });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls the api when invoked with the correct parameters', async () => {
    const spy = vi.spyOn(api, 'postObservable');
    const { result } = renderHook(() => usePostObservable(mockCase.id), {
      wrapper: TestProviders,
    });

    act(() => {
      result.current.mutate(observableMock);
    });

    await waitFor(() =>
      expect(spy).toHaveBeenCalledWith({ observable: observableMock.observable }, mockCase.id)
    );
  });

  it('invalidates the queries correctly', async () => {
    const queryClient = createTestQueryClient();
    const queryClientSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => usePostObservable(mockCase.id), {
      wrapper: (props) => <TestProviders {...props} queryClient={queryClient} />,
    });

    act(() => {
      result.current.mutate(observableMock);
    });

    await waitFor(() => expect(queryClientSpy).toHaveBeenCalledWith(casesQueriesKeys.caseView()));
  });

  it('does shows a success toaster', async () => {
    const { result } = renderHook(() => usePostObservable(mockCase.id), {
      wrapper: TestProviders,
    });

    act(() => {
      result.current.mutate(observableMock);
    });

    await waitFor(() => expect(addSuccess).toHaveBeenCalled());
  });

  it('shows a toast error when the api return an error', async () => {
    vi.spyOn(api, 'postObservable').mockRejectedValue(new Error('usePostObservables: Test error'));

    const { result } = renderHook(() => usePostObservable(mockCase.id), {
      wrapper: TestProviders,
    });

    act(() => {
      result.current.mutate(observableMock);
    });

    await waitFor(() => expect(addError).toHaveBeenCalled());
  });
});
