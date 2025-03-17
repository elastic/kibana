/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { waitFor, renderHook } from '@testing-library/react';
import { useFindCaseUserActions } from './use_find_case_user_actions';
import type { CaseUserActionTypeWithAll } from '../../common/ui/types';
import { basicCase, findCaseUserActionsResponse } from './mock';
import * as api from './api';
import { useToasts } from '../common/lib/kibana';
import { TestProviders } from '../common/mock';

jest.mock('./api');
jest.mock('../common/lib/kibana');

const initialData = {
  data: undefined,
  isError: false,
  isLoading: true,
};

describe('UseFindCaseUserActions', () => {
  const filterActionType: CaseUserActionTypeWithAll = 'all';
  const sortOrder: 'asc' | 'desc' = 'asc';
  const params = {
    type: filterActionType,
    sortOrder,
    page: 1,
    perPage: 10,
  };

  const isEnabled = true;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns proper state on findCaseUserActions', async () => {
    const { result } = renderHook(() => useFindCaseUserActions(basicCase.id, params, isEnabled), {
      wrapper: TestProviders,
    });

    await waitFor(() =>
      expect(result.current).toEqual(
        expect.objectContaining({
          ...initialData,
          data: {
            latestAttachments: [],
            userActions: [...findCaseUserActionsResponse.userActions],
            total: 30,
            perPage: 10,
            page: 1,
          },
          isError: false,
          isLoading: false,
          isFetching: false,
        })
      )
    );
  });

  it('calls the API with correct parameters', async () => {
    const spy = jest.spyOn(api, 'findCaseUserActions').mockRejectedValue(initialData);

    renderHook(
      () =>
        useFindCaseUserActions(
          basicCase.id,
          {
            type: 'user',
            sortOrder: 'desc',
            page: 1,
            perPage: 5,
          },
          isEnabled
        ),
      { wrapper: TestProviders }
    );

    await waitFor(() =>
      expect(spy).toHaveBeenCalledWith(
        basicCase.id,
        { type: 'user', sortOrder: 'desc', page: 1, perPage: 5 },
        expect.any(AbortSignal)
      )
    );
  });

  it('does not call API when not enabled', async () => {
    const spy = jest.spyOn(api, 'findCaseUserActions').mockRejectedValue(initialData);

    renderHook(
      () =>
        useFindCaseUserActions(
          basicCase.id,
          {
            type: 'user',
            sortOrder: 'desc',
            page: 1,
            perPage: 5,
          },
          false
        ),
      { wrapper: TestProviders }
    );

    expect(spy).not.toHaveBeenCalled();
  });

  it('shows a toast error when the API returns an error', async () => {
    const addError = jest.fn();
    (useToasts as jest.Mock).mockReturnValue({ addError });

    renderHook(() => useFindCaseUserActions(basicCase.id, params, isEnabled), {
      wrapper: TestProviders,
    });

    await waitFor(() => {
      expect(addError).toHaveBeenCalled();
    });
  });
});
