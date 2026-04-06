/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, waitFor, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useUpdateCase } from './use_update_case';
import * as api from './api';
import type { UpdateKey } from './types';
import { useToasts } from '../common/lib/kibana';
import { useCasesToast } from '../common/use_cases_toast';
import { casesQueriesKeys } from './constants';
import { basicCaseFixture } from './test_fixtures';

jest.mock('./api', () => ({
  getCase: jest.fn(),
  patchCase: jest.fn(),
}));
jest.mock('../common/lib/kibana', () => ({
  useToasts: jest.fn(),
}));
jest.mock('../common/use_cases_toast', () => ({
  useCasesToast: jest.fn(),
}));
jest.mock('./utils', () => ({
  createUpdateSuccessToaster: jest.fn().mockReturnValue({
    title: 'Updated "Another horrible breach!!"',
    className: 'eui-textBreakWord',
  }),
}));

describe('useUpdateCase', () => {
  const updateKey: UpdateKey = 'description';

  const addSuccess = jest.fn();
  const addError = jest.fn();
  (useToasts as jest.Mock).mockReturnValue({ addSuccess, addError });
  const showErrorToast = jest.fn();
  (useCasesToast as jest.Mock).mockReturnValue({ showErrorToast });

  beforeEach(() => {
    jest.clearAllMocks();
    (api.patchCase as jest.Mock).mockResolvedValue([basicCaseFixture]);
    (api.getCase as jest.Mock).mockResolvedValue(basicCaseFixture);
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

  const sampleUpdate = {
    updateKey,
    updateValue: 'updated description',
    caseData: basicCaseFixture,
  };

  it('patch case and refresh the case page', async () => {
    const queryClient = createQueryClient();
    const queryClientSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useUpdateCase(), {
      wrapper: getWrapper(queryClient),
    });

    act(() => {
      result.current.mutate(sampleUpdate);
    });

    await waitFor(() => {
      expect(queryClientSpy).toHaveBeenCalledWith(casesQueriesKeys.caseView());
    });

    expect(queryClientSpy).toHaveBeenCalledWith(casesQueriesKeys.tags());
  });

  it('calls the api when invoked with the correct parameters', async () => {
    const patchCaseSpy = jest.spyOn(api, 'patchCase');
    const queryClient = createQueryClient();
    const { result } = renderHook(() => useUpdateCase(), {
      wrapper: getWrapper(queryClient),
    });

    act(() => {
      result.current.mutate(sampleUpdate);
    });

    await waitFor(() =>
      expect(patchCaseSpy).toHaveBeenCalledWith({
        caseId: basicCaseFixture.id,
        updatedCase: { description: 'updated description' },
        version: basicCaseFixture.version,
      })
    );
  });

  it('shows a success toaster', async () => {
    const queryClient = createQueryClient();
    const { result } = renderHook(() => useUpdateCase(), {
      wrapper: getWrapper(queryClient),
    });

    act(() => {
      result.current.mutate(sampleUpdate);
    });

    await waitFor(() =>
      expect(addSuccess).toHaveBeenCalledWith({
        title: 'Updated "Another horrible breach!!"',
        className: 'eui-textBreakWord',
      })
    );
  });

  it('retries once with the latest version when only system-managed fields changed', async () => {
    const latestCase = {
      ...basicCaseFixture,
      incrementalId: 42,
      updatedAt: '2024-01-01T00:00:00.000Z',
      version: 'WzQ4LDFd',
    };
    const conflictError = Object.assign(new Error('Conflict'), {
      body: { statusCode: 409 },
    });

    const patchCaseSpy = jest
      .spyOn(api, 'patchCase')
      .mockRejectedValueOnce(conflictError)
      .mockResolvedValueOnce([{ ...latestCase, description: sampleUpdate.updateValue }]);
    const getCaseSpy = jest.spyOn(api, 'getCase').mockResolvedValue(latestCase);
    const queryClient = createQueryClient();

    const { result } = renderHook(() => useUpdateCase(), {
      wrapper: getWrapper(queryClient),
    });

    act(() => {
      result.current.mutate(sampleUpdate);
    });

    await waitFor(() => expect(patchCaseSpy).toHaveBeenCalledTimes(2));

    expect(getCaseSpy).toHaveBeenCalledWith({ caseId: basicCaseFixture.id });
    expect(patchCaseSpy).toHaveBeenNthCalledWith(2, {
      caseId: basicCaseFixture.id,
      updatedCase: { description: 'updated description' },
      version: latestCase.version,
    });
  });

  it('shows a toast error when the api return an error', async () => {
    jest.spyOn(api, 'patchCase').mockRejectedValue(new Error('useUpdateCase: Test error'));
    const queryClient = createQueryClient();

    const { result } = renderHook(() => useUpdateCase(), {
      wrapper: getWrapper(queryClient),
    });

    act(() => {
      result.current.mutate(sampleUpdate);
    });

    await waitFor(() => expect(showErrorToast).toHaveBeenCalled());
  });
});
