/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { waitFor, renderHook } from '@testing-library/react';
import { useToasts } from '../common/lib/kibana';
import { useGetFeatureIds } from './use_get_feature_ids';
import * as api from './api';
import { TestProviders } from '../common/mock';

vi.mock('./api');
vi.mock('../common/lib/kibana');

describe('useGetFeaturesIds', () => {
  const addSuccess = vi.fn();
  const addError = vi.fn();

  (useToasts as Mock).mockReturnValue({ addSuccess, addError });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the features ids correctly', async () => {
    const spy = vi.spyOn(api, 'getFeatureIds').mockRejectedValue([]);

    renderHook(() => useGetFeatureIds(['alert-id-1'], true), {
      wrapper: TestProviders,
    });

    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith({
        query: {
          ids: {
            values: ['alert-id-1'],
          },
        },
        signal: expect.any(AbortSignal),
      });
    });
  });

  it('never call API if disable', async () => {
    const spyMock = vi.spyOn(api, 'getFeatureIds');

    renderHook(() => useGetFeatureIds(['alert-id-1'], false), {
      wrapper: TestProviders,
    });

    expect(spyMock).toHaveBeenCalledTimes(0);
  });

  it('shows a toast error when the api return an error', async () => {
    (useToasts as Mock).mockReturnValue({ addError });

    const spy = vi.spyOn(api, 'getFeatureIds').mockRejectedValue(new Error('Something went wrong'));

    renderHook(() => useGetFeatureIds(['alert-id-1'], true), {
      wrapper: TestProviders,
    });

    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith({
        query: {
          ids: {
            values: ['alert-id-1'],
          },
        },
        signal: expect.any(AbortSignal),
      });
    });

    expect(addError).toHaveBeenCalled();
  });
});
