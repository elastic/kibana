/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import * as api from './api';
import { useToasts } from '../common/lib/kibana/hooks';
import { useFindCasesByObservable } from './use_find_cases_by_observable';
import { basicCase } from './mock';
import { TestProviders } from '../common/mock';

jest.mock('./api');
jest.mock('../common/lib/kibana/hooks');

const params = {
  owner: 'securitySolution',
  typeKey: 'observable-type-ipv4',
  value: '10.0.0.8',
  excludeCaseId: 'case-1',
  perPage: 0,
};

describe('useFindCasesByObservable', () => {
  const addError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useToasts as jest.Mock).mockReturnValue({ addSuccess: jest.fn(), addError });
  });

  it('finds the cases holding the observable', async () => {
    const response = { cases: [basicCase], page: 1, perPage: 0, total: 4 };
    const spy = jest.spyOn(api, 'findCasesByObservable').mockResolvedValue(response);

    const { result } = renderHook(() => useFindCasesByObservable(params), {
      wrapper: TestProviders,
    });

    await waitFor(() => expect(result.current.data).toEqual(response));
    expect(spy).toHaveBeenCalledWith(params, expect.any(AbortSignal));
  });

  it('does not fetch when disabled', async () => {
    const spy = jest.spyOn(api, 'findCasesByObservable');

    renderHook(() => useFindCasesByObservable(params, { enabled: false }), {
      wrapper: TestProviders,
    });

    expect(spy).not.toHaveBeenCalled();
  });

  it('shows an error toast when the request fails', async () => {
    jest.spyOn(api, 'findCasesByObservable').mockRejectedValue(new Error('boom'));

    renderHook(() => useFindCasesByObservable(params), { wrapper: TestProviders });

    await waitFor(() => expect(addError).toHaveBeenCalled());
  });
});
