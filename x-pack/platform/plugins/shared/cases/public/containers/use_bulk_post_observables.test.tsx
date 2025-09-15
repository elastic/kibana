/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, waitFor, renderHook } from '@testing-library/react';
import { useBulkPostObservables } from './use_bulk_post_observables';
import { mockCase, mockObservables } from './mock';
import { useCasesToast } from '../common/use_cases_toast';
import * as api from './api';
import { casesQueriesKeys } from './constants';
import { TestProviders, createTestQueryClient } from '../common/mock';

jest.mock('./api');
jest.mock('../common/lib/kibana');
jest.mock('../common/use_cases_toast');

const showErrorToast = jest.fn();
const showSuccessToast = jest.fn();

describe('useBulkPostObservables', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (useCasesToast as jest.Mock).mockReturnValue({ showErrorToast, showSuccessToast });
  });

  it('calls the api when invoked with the correct parameters', async () => {
    const spy = jest.spyOn(api, 'bulkPostObservables');
    const { result } = renderHook(() => useBulkPostObservables(mockCase.id), {
      wrapper: TestProviders,
    });

    act(() => {
      result.current.mutate({ observables: mockObservables });
    });

    await waitFor(() =>
      expect(spy).toHaveBeenCalledWith({ observables: mockObservables }, mockCase.id)
    );
  });

  it('invalidates the queries correctly', async () => {
    const queryClient = createTestQueryClient();
    const queryClientSpy = jest.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useBulkPostObservables(mockCase.id), {
      wrapper: (props) => <TestProviders {...props} queryClient={queryClient} />,
    });

    act(() => {
      result.current.mutate({ observables: mockObservables });
    });

    await waitFor(() => expect(queryClientSpy).toHaveBeenCalledWith(casesQueriesKeys.caseView()));
  });

  it('shows a success toaster when the api call is successful', async () => {
    const { result } = renderHook(() => useBulkPostObservables(mockCase.id), {
      wrapper: TestProviders,
    });

    act(() => {
      result.current.mutate({ observables: mockObservables });
    });

    await waitFor(() => expect(showSuccessToast).toHaveBeenCalled());
  });

  it('shows a toast error when the api return an error', async () => {
    jest
      .spyOn(api, 'bulkPostObservables')
      .mockRejectedValue(new Error('useBulkPostObservables: Test error'));

    const { result } = renderHook(() => useBulkPostObservables(mockCase.id), {
      wrapper: TestProviders,
    });

    act(() => {
      result.current.mutate({ observables: mockObservables });
    });

    await waitFor(() => expect(showErrorToast).toHaveBeenCalled());
  });
});
