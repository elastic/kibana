/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import * as api from './api';
import { useToasts } from '../common/lib/kibana/hooks';
import { useCountCasesByObservables } from './use_count_cases_by_observables';
import { TestProviders } from '../common/mock';

jest.mock('./api');
jest.mock('../common/lib/kibana/hooks');

const params = {
  owner: 'securitySolution',
  excludeCaseId: 'case-1',
  observables: [{ typeKey: 'observable-type-ipv4', value: '10.0.0.8' }],
};

describe('useCountCasesByObservables', () => {
  const addError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useToasts as jest.Mock).mockReturnValue({ addSuccess: jest.fn(), addError });
  });

  it('counts the cases holding each observable', async () => {
    const response = { counts: [{ ...params.observables[0], total: 2 }] };
    const spy = jest.spyOn(api, 'countCasesByObservables').mockResolvedValue(response);

    const { result } = renderHook(() => useCountCasesByObservables(params), {
      wrapper: TestProviders,
    });

    await waitFor(() => expect(result.current.data).toEqual(response));
    expect(spy).toHaveBeenCalledWith(params, expect.any(AbortSignal));
  });

  it('does not fetch for an empty page', () => {
    const spy = jest.spyOn(api, 'countCasesByObservables');

    renderHook(() => useCountCasesByObservables({ ...params, observables: [] }), {
      wrapper: TestProviders,
    });

    expect(spy).not.toHaveBeenCalled();
  });

  it('shows an error toast when the request fails', async () => {
    jest.spyOn(api, 'countCasesByObservables').mockRejectedValue(new Error('boom'));

    renderHook(() => useCountCasesByObservables(params), { wrapper: TestProviders });

    await waitFor(() => expect(addError).toHaveBeenCalled());
  });
});
