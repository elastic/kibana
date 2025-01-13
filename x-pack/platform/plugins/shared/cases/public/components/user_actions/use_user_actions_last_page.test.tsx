/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { waitFor, renderHook } from '@testing-library/react';

import { useLastPageUserActions } from './use_user_actions_last_page';
import type { UserActivityParams } from '../user_actions_activity_bar/types';
import { useFindCaseUserActions } from '../../containers/use_find_case_user_actions';
import { defaultUseFindCaseUserActions } from '../case_view/mocks';
import { basicCase } from '../../containers/mock';

const userActivityQueryParams: UserActivityParams = {
  type: 'all',
  sortOrder: 'asc',
  page: 1,
  perPage: 10,
};

jest.mock('../../containers/use_find_case_user_actions');
jest.mock('../../common/lib/kibana');

const useFindCaseUserActionsMock = useFindCaseUserActions as jest.Mock;

describe('useLastPageUserActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useFindCaseUserActionsMock.mockReturnValue(defaultUseFindCaseUserActions);
  });

  it('renders correctly', async () => {
    const { result } = renderHook(() =>
      useLastPageUserActions({
        lastPage: 5,
        userActivityQueryParams,
        caseId: basicCase.id,
      })
    );

    expect(useFindCaseUserActionsMock).toHaveBeenCalledTimes(1);

    expect(useFindCaseUserActionsMock).toHaveBeenCalledWith(
      basicCase.id,
      { ...userActivityQueryParams, page: 5 },
      true
    );

    await waitFor(() => {
      expect(result.current).toEqual(
        expect.objectContaining({
          isLoadingLastPageUserActions: false,
          lastPageUserActions: defaultUseFindCaseUserActions.data.userActions,
        })
      );
    });
  });

  it('calls find API hook with enabled as false when last page is 1', async () => {
    renderHook(() =>
      useLastPageUserActions({
        lastPage: 1,
        userActivityQueryParams,
        caseId: basicCase.id,
      })
    );

    expect(useFindCaseUserActionsMock).toHaveBeenCalledTimes(1);

    expect(useFindCaseUserActionsMock).toHaveBeenCalledWith(
      basicCase.id,
      { ...userActivityQueryParams, page: 1 },
      false
    );
  });

  it('returns loading state correctly', async () => {
    useFindCaseUserActionsMock.mockReturnValue({ isLoading: true });

    const { result } = renderHook(() =>
      useLastPageUserActions({
        lastPage: 2,
        userActivityQueryParams,
        caseId: basicCase.id,
      })
    );

    expect(useFindCaseUserActionsMock).toHaveBeenCalledWith(
      basicCase.id,
      { ...userActivityQueryParams, page: 2 },
      true
    );

    expect(useFindCaseUserActionsMock).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(result.current).toEqual(
        expect.objectContaining({
          isLoadingLastPageUserActions: true,
          lastPageUserActions: [],
        })
      );
    });
  });

  it('returns empty array when data is undefined', async () => {
    useFindCaseUserActionsMock.mockReturnValue({ isLoading: false, data: undefined });

    const { result } = renderHook(() =>
      useLastPageUserActions({
        lastPage: 2,
        userActivityQueryParams,
        caseId: basicCase.id,
      })
    );

    expect(useFindCaseUserActionsMock).toHaveBeenCalledWith(
      basicCase.id,
      { ...userActivityQueryParams, page: 2 },
      true
    );

    expect(useFindCaseUserActionsMock).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(result.current).toEqual(
        expect.objectContaining({
          isLoadingLastPageUserActions: false,
          lastPageUserActions: [],
        })
      );
    });
  });
});
