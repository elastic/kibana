/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import * as api from './api';
import { useToasts } from '../common/lib/kibana/hooks';
import { useGetObservableMetadata } from './use_get_observable_metadata';
import { TestProviders } from '../common/mock';

jest.mock('./api');
jest.mock('../common/lib/kibana/hooks');

const caseId = 'case-1';
const params = { typeKey: 'observable-type-ipv4', value: '10.0.0.8' };

describe('useGetObservableMetadata', () => {
  const addError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useToasts as jest.Mock).mockReturnValue({ addSuccess: jest.fn(), addError });
  });

  it('gets the metadata of the value', async () => {
    const response = { metadata: { triage: 'confirmed' } };
    const spy = jest.spyOn(api, 'getObservableMetadata').mockResolvedValue(response);

    const { result } = renderHook(() => useGetObservableMetadata(caseId, params), {
      wrapper: TestProviders,
    });

    await waitFor(() => expect(result.current.data).toEqual(response));
    expect(spy).toHaveBeenCalledWith(caseId, params, expect.any(AbortSignal));
  });

  it('does not fetch when disabled', () => {
    const spy = jest.spyOn(api, 'getObservableMetadata');

    renderHook(() => useGetObservableMetadata(caseId, params, { enabled: false }), {
      wrapper: TestProviders,
    });

    expect(spy).not.toHaveBeenCalled();
  });

  it('shows an error toast when the request fails', async () => {
    jest.spyOn(api, 'getObservableMetadata').mockRejectedValue(new Error('boom'));

    renderHook(() => useGetObservableMetadata(caseId, params), { wrapper: TestProviders });

    await waitFor(() => expect(addError).toHaveBeenCalled());
  });
});
