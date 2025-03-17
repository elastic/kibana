/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { waitFor, renderHook } from '@testing-library/react';

import { useToasts } from '../common/lib/kibana';
import { useGetCaseUserActionsStats } from './use_get_case_user_actions_stats';
import { basicCase } from './mock';
import * as api from './api';
import { TestProviders } from '../common/mock';

jest.mock('./api');
jest.mock('../common/lib/kibana');

const initialData = {
  data: undefined,
  isError: false,
  isLoading: true,
};

describe('useGetCaseUserActionsStats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns proper state on getCaseUserActionsStats', async () => {
    const { result } = renderHook(() => useGetCaseUserActionsStats(basicCase.id), {
      wrapper: TestProviders,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current).toEqual(
      expect.objectContaining({
        ...initialData,
        data: {
          total: 20,
          totalComments: 10,
          totalOtherActions: 10,
        },
        isError: false,
        isLoading: false,
        isFetching: false,
      })
    );
  });

  it('calls getCaseUserActionsStats correctly', async () => {
    const spy = jest
      .spyOn(api, 'getCaseUserActionsStats')
      .mockRejectedValue(new Error("C'est la vie"));

    renderHook(() => useGetCaseUserActionsStats(basicCase.id), {
      wrapper: TestProviders,
    });

    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith(basicCase.id, expect.any(AbortSignal));
    });
  });

  it('shows a toast error when the API returns an error', async () => {
    const addError = jest.fn();
    (useToasts as jest.Mock).mockReturnValue({ addError });

    renderHook(() => useGetCaseUserActionsStats(basicCase.id), {
      wrapper: TestProviders,
    });

    await waitFor(() => {
      expect(addError).toHaveBeenCalled();
    });
  });

  it('calls the api when invoked with the correct parameters', async () => {
    const spy = jest.spyOn(api, 'getCaseUserActionsStats');

    renderHook(() => useGetCaseUserActionsStats(basicCase.id), {
      wrapper: TestProviders,
    });

    await waitFor(() => expect(spy).toHaveBeenCalledWith(basicCase.id, expect.any(AbortSignal)));
  });
});
