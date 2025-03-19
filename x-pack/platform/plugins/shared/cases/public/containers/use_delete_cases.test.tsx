/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, waitFor, renderHook } from '@testing-library/react';

import { useDeleteCases } from './use_delete_cases';
import * as api from './api';
import { useToasts } from '../common/lib/kibana';
import { casesQueriesKeys } from './constants';
import { TestProviders, createTestQueryClient } from '../common/mock';

jest.mock('./api');
jest.mock('../common/lib/kibana');

describe('useDeleteCases', () => {
  const addSuccess = jest.fn();
  const addError = jest.fn();

  (useToasts as jest.Mock).mockReturnValue({ addSuccess, addError });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls the api when invoked with the correct parameters', async () => {
    const spy = jest.spyOn(api, 'deleteCases');
    const { result } = renderHook(() => useDeleteCases(), {
      wrapper: TestProviders,
    });

    act(() => {
      result.current.mutate({ caseIds: ['1', '2'], successToasterTitle: 'Success title' });
    });

    await waitFor(() => expect(spy).toHaveBeenCalledWith({ caseIds: ['1', '2'] }));
  });

  it('invalidates the queries correctly', async () => {
    const queryClient = createTestQueryClient();
    const queryClientSpy = jest.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useDeleteCases(), {
      wrapper: (props) => <TestProviders {...props} queryClient={queryClient} />,
    });

    act(() => {
      result.current.mutate({ caseIds: ['1', '2'], successToasterTitle: 'Success title' });
    });

    await waitFor(() => {
      expect(queryClientSpy).toHaveBeenCalledWith(casesQueriesKeys.casesList());
    });

    expect(queryClientSpy).toHaveBeenCalledWith(casesQueriesKeys.tags());
    expect(queryClientSpy).toHaveBeenCalledWith(casesQueriesKeys.userProfiles());
  });

  it('shows a success toaster', async () => {
    const { result } = renderHook(() => useDeleteCases(), {
      wrapper: TestProviders,
    });

    act(() => {
      result.current.mutate({ caseIds: ['1', '2'], successToasterTitle: 'Success title' });
    });

    await waitFor(() =>
      expect(addSuccess).toHaveBeenCalledWith({
        title: 'Success title',
        className: 'eui-textBreakWord',
      })
    );
  });

  it('shows a toast error when the api return an error', async () => {
    jest.spyOn(api, 'deleteCases').mockRejectedValue(new Error('useDeleteCases: Test error'));

    const { result } = renderHook(() => useDeleteCases(), {
      wrapper: TestProviders,
    });

    act(() => {
      result.current.mutate({ caseIds: ['1', '2'], successToasterTitle: 'Success title' });
    });

    await waitFor(() => expect(addError).toHaveBeenCalled());
  });
});
