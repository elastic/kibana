/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, waitFor, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useUpdateCases } from './use_bulk_update_case';
import { useCasesToast } from '../common/use_cases_toast';
import * as api from './api';
import { casesQueriesKeys } from './constants';
import { basicCaseFixture } from './test_fixtures';

jest.mock('./api', () => ({
  getCase: jest.fn(),
  updateCases: jest.fn(),
}));
jest.mock('../common/use_cases_toast', () => ({
  useCasesToast: jest.fn(),
}));

describe('useUpdateCases', () => {
  const showSuccessToast = jest.fn();
  const showErrorToast = jest.fn();

  (useCasesToast as jest.Mock).mockReturnValue({ showSuccessToast, showErrorToast });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createQueryClient = () =>
    new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

  const getWrapper = (queryClient: QueryClient) =>
    function Wrapper({ children }: React.PropsWithChildren<{}>) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    };

  it('calls the api when invoked with the correct parameters', async () => {
    const spy = jest.spyOn(api, 'updateCases');
    const queryClient = createQueryClient();
    const { result } = renderHook(() => useUpdateCases(), {
      wrapper: getWrapper(queryClient),
    });

    act(() => {
      result.current.mutate({
        cases: [{ id: basicCaseFixture.id, version: basicCaseFixture.version }],
        successToasterTitle: 'Success title',
        originalCases: [basicCaseFixture],
      });
    });

    await waitFor(() =>
      expect(spy).toHaveBeenCalledWith({
        cases: [{ id: basicCaseFixture.id, version: basicCaseFixture.version }],
      })
    );
  });

  it('invalidates the queries correctly', async () => {
    const queryClient = createQueryClient();
    const queryClientSpy = jest.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useUpdateCases(), {
      wrapper: getWrapper(queryClient),
    });

    act(() => {
      result.current.mutate({
        cases: [{ id: basicCaseFixture.id, version: basicCaseFixture.version }],
        successToasterTitle: 'Success title',
        originalCases: [basicCaseFixture],
      });
    });

    await waitFor(() => {
      expect(queryClientSpy).toHaveBeenCalledWith(casesQueriesKeys.casesList());
    });

    expect(queryClientSpy).toHaveBeenCalledWith(casesQueriesKeys.tags());
    expect(queryClientSpy).toHaveBeenCalledWith(casesQueriesKeys.userProfiles());
  });

  it('shows a success toaster', async () => {
    const queryClient = createQueryClient();
    const { result } = renderHook(() => useUpdateCases(), {
      wrapper: getWrapper(queryClient),
    });

    act(() => {
      result.current.mutate({
        cases: [{ id: basicCaseFixture.id, version: basicCaseFixture.version }],
        successToasterTitle: 'Success title',
        originalCases: [basicCaseFixture],
      });
    });

    await waitFor(() => expect(showSuccessToast).toHaveBeenCalledWith('Success title'));
  });

  it('retries once with refreshed versions when only system-managed fields changed', async () => {
    const latestCase = {
      ...basicCaseFixture,
      incrementalId: 42,
      updatedAt: '2024-01-01T00:00:00.000Z',
      version: 'WzQ4LDFd',
    };
    const conflictError = Object.assign(new Error('Conflict'), {
      body: { statusCode: 409 },
    });
    const casesToUpdate = [
      { id: basicCaseFixture.id, version: basicCaseFixture.version, description: 'updated' },
    ];

    const updateCasesSpy = jest
      .spyOn(api, 'updateCases')
      .mockRejectedValueOnce(conflictError)
      .mockResolvedValueOnce([{ ...latestCase, description: 'updated' }]);
    const getCaseSpy = jest.spyOn(api, 'getCase').mockResolvedValue(latestCase);
    const queryClient = createQueryClient();

    const { result } = renderHook(() => useUpdateCases(), {
      wrapper: getWrapper(queryClient),
    });

    act(() => {
      result.current.mutate({
        cases: casesToUpdate,
        successToasterTitle: 'Success title',
        originalCases: [basicCaseFixture],
      });
    });

    await waitFor(() => expect(updateCasesSpy).toHaveBeenCalledTimes(2));

    expect(getCaseSpy).toHaveBeenCalledWith({ caseId: basicCaseFixture.id });
    expect(updateCasesSpy).toHaveBeenNthCalledWith(2, {
      cases: [{ ...casesToUpdate[0], version: latestCase.version }],
    });
  });

  it('shows a toast error when the api return an error', async () => {
    jest.spyOn(api, 'updateCases').mockRejectedValue(new Error('useUpdateCases: Test error'));
    const queryClient = createQueryClient();

    const { result } = renderHook(() => useUpdateCases(), {
      wrapper: getWrapper(queryClient),
    });

    act(() => {
      result.current.mutate({
        cases: [{ id: basicCaseFixture.id, version: basicCaseFixture.version }],
        successToasterTitle: 'Success title',
        originalCases: [basicCaseFixture],
      });
    });

    await waitFor(() => expect(showErrorToast).toHaveBeenCalled());
  });
});
