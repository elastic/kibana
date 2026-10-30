/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { waitFor, renderHook } from '@testing-library/react';
import type { CaseStatusDefinition } from '../../common/types/domain';
import { DEFAULT_CASE_STATUSES } from '../../common/utils/statuses';
import { TestProviders } from '../common/mock';
import { useToasts } from '../common/lib/kibana';
import * as customStatuses from '../common/custom_statuses';
import * as api from './api';
import { useGetCaseStatuses } from './use_get_case_statuses';

jest.mock('./api');
jest.mock('../common/lib/kibana');

const triage: CaseStatusDefinition = {
  key: 'triage',
  label: 'Triage',
  color: 'accent',
  category: 'not_started',
  order: 3,
  isDefault: false,
  disabled: false,
};

describe('useGetCaseStatuses', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('returns the default statuses without calling the server when custom statuses are off', async () => {
    jest.spyOn(customStatuses, 'isCustomStatusesEnabled').mockReturnValue(false);
    const spy = jest.spyOn(api, 'getCaseStatuses');

    const { result } = renderHook(() => useGetCaseStatuses(), { wrapper: TestProviders });

    expect(result.current.data).toEqual(DEFAULT_CASE_STATUSES);
    expect(result.current.isLoading).toBe(false);
    expect(spy).not.toHaveBeenCalled();
  });

  it('returns the statuses of the space when custom statuses are on', async () => {
    jest.spyOn(customStatuses, 'isCustomStatusesEnabled').mockReturnValue(true);
    const statuses = [...DEFAULT_CASE_STATUSES, triage];
    const spy = jest.spyOn(api, 'getCaseStatuses').mockResolvedValue(statuses);

    const { result } = renderHook(() => useGetCaseStatuses(), { wrapper: TestProviders });

    await waitFor(() => expect(result.current.data).toEqual(statuses));
    expect(spy).toHaveBeenCalledWith({ signal: expect.any(AbortSignal) });
  });

  it('shows an error toast when the statuses cannot be loaded', async () => {
    jest.spyOn(customStatuses, 'isCustomStatusesEnabled').mockReturnValue(true);
    jest.spyOn(api, 'getCaseStatuses').mockRejectedValue(new Error('Something went wrong'));
    const addError = jest.fn();
    (useToasts as jest.Mock).mockReturnValue({ addError });

    const { result } = renderHook(() => useGetCaseStatuses(), { wrapper: TestProviders });

    await waitFor(() => expect(addError).toHaveBeenCalled());
    expect(result.current.data).toEqual(DEFAULT_CASE_STATUSES);
  });
});
