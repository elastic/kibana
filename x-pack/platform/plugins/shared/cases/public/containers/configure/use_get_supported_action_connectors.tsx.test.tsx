/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock, Mocked } from 'vitest';

import React from 'react';
import { waitFor, renderHook } from '@testing-library/react';
import * as api from './api';
import { noConnectorsCasePermission, TestProviders } from '../../common/mock';
import { useApplicationCapabilities, useToasts } from '../../common/lib/kibana';
import { useGetSupportedActionConnectors } from './use_get_supported_action_connectors';

const useApplicationCapabilitiesMock = useApplicationCapabilities as Mocked<
  typeof useApplicationCapabilities
>;

vi.mock('../../common/lib/kibana');
vi.mock('./api');

describe('useConnectors', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches connectors', async () => {
    const spy = vi.spyOn(api, 'getSupportedActionConnectors');
    renderHook(() => useGetSupportedActionConnectors(), {
      wrapper: TestProviders,
    });

    await waitFor(() => expect(spy).toHaveBeenCalledWith({ signal: expect.any(AbortSignal) }));
  });

  it('shows a toast error when the API returns error', async () => {
    const addError = vi.fn();
    (useToasts as Mock).mockReturnValue({ addError });

    const spyOnfetchConnectors = vi.spyOn(api, 'getSupportedActionConnectors');
    spyOnfetchConnectors.mockImplementation(() => {
      throw new Error('Something went wrong');
    });

    renderHook(() => useGetSupportedActionConnectors(), {
      wrapper: TestProviders,
    });

    await waitFor(() => expect(addError).toHaveBeenCalled());
  });

  it('does not fetch connectors when the user does not has access to actions', async () => {
    const spyOnFetchConnectors = vi.spyOn(api, 'getSupportedActionConnectors');
    useApplicationCapabilitiesMock().actions = { crud: false, read: false };

    const { result } = renderHook(() => useGetSupportedActionConnectors(), {
      wrapper: TestProviders,
    });

    await waitFor(() => {
      expect(spyOnFetchConnectors).not.toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(result.current.data).toEqual([]);
    });
  });

  it('does not fetch connectors when the user does not has access to connectors', async () => {
    const spyOnFetchConnectors = vi.spyOn(api, 'getSupportedActionConnectors');
    useApplicationCapabilitiesMock().actions = { crud: true, read: true };

    const { result } = renderHook(() => useGetSupportedActionConnectors(), {
      wrapper: (props) => <TestProviders {...props} permissions={noConnectorsCasePermission()} />,
    });

    await waitFor(() => {
      expect(spyOnFetchConnectors).not.toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(result.current.data).toEqual([]);
    });
  });
});
