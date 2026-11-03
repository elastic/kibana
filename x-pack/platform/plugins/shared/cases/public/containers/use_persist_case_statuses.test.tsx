/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, waitFor, renderHook } from '@testing-library/react';
import type { CaseStatusDefinition } from '../../common/types/domain';
import { DEFAULT_CASE_STATUSES } from '../../common/utils/statuses';
import { TestProviders, createTestQueryClient } from '../common/mock';
import { useToasts } from '../common/lib/kibana';
import * as api from './api';
import { casesQueriesKeys } from './constants';
import { usePersistCaseStatuses } from './use_persist_case_statuses';

jest.mock('./api');
jest.mock('../common/lib/kibana');

const statuses: CaseStatusDefinition[] = [
  ...DEFAULT_CASE_STATUSES,
  {
    key: 'triage',
    label: 'Triage',
    color: 'accent',
    category: 'not_started',
    order: 3,
    isDefault: false,
    disabled: false,
  },
];

describe('usePersistCaseStatuses', () => {
  const addError = jest.fn();
  const addSuccess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useToasts as jest.Mock).mockReturnValue({ addError, addSuccess });
  });

  it('saves the statuses, caches them, and shows a success toast', async () => {
    const queryClient = createTestQueryClient();
    const invalidateQueries = jest.spyOn(queryClient, 'invalidateQueries');
    const spy = jest.spyOn(api, 'putCaseStatuses').mockResolvedValue(statuses);

    const { result } = renderHook(() => usePersistCaseStatuses(), {
      wrapper: ({ children }: React.PropsWithChildren) => (
        <TestProviders queryClient={queryClient}>{children}</TestProviders>
      ),
    });

    act(() => {
      result.current.mutate({ statuses });
    });

    await waitFor(() => expect(addSuccess).toHaveBeenCalled());
    expect(spy).toHaveBeenCalledWith({ statuses });
    expect(queryClient.getQueryData(casesQueriesKeys.caseStatusDefinitions())).toEqual(statuses);
    expect(invalidateQueries).toHaveBeenCalledWith(casesQueriesKeys.caseStatusDefinitions());
  });

  it('shows an error toast when saving fails', async () => {
    jest.spyOn(api, 'putCaseStatuses').mockRejectedValue(new Error('Bad statuses'));

    const { result } = renderHook(() => usePersistCaseStatuses(), { wrapper: TestProviders });

    act(() => {
      result.current.mutate({ statuses });
    });

    await waitFor(() => expect(addError).toHaveBeenCalled());
    expect(addSuccess).not.toHaveBeenCalled();
  });
});
