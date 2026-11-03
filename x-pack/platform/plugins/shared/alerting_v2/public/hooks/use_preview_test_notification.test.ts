/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { useService } from '@kbn/core-di-browser';
import { ActionPoliciesApi } from '../services/action_policies_api';
import { createHookTestProviders } from '../test_utils/test_providers';
import { usePreviewTestNotification } from './use_preview_test_notification';

jest.mock('@kbn/core-di-browser');

const mockUseService = useService as jest.MockedFunction<typeof useService>;

const createPreview = (seed: number) => ({ seed, groups: [{ seed }], destinations: [] });

describe('usePreviewTestNotification', () => {
  const api = { previewTestNotification: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseService.mockImplementation((service: unknown) => {
      if (service === ActionPoliciesApi) {
        return api as never;
      }
      return undefined as never;
    });
  });

  it('builds a new preview with a new seed on reload', async () => {
    let resolveSecondPreview: (preview: ReturnType<typeof createPreview>) => void = () => {};
    api.previewTestNotification.mockResolvedValueOnce(createPreview(1)).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveSecondPreview = resolve;
      })
    );
    const { result } = renderHook(() => usePreviewTestNotification('policy-1'), {
      wrapper: createHookTestProviders(),
    });

    await waitFor(() => expect(result.current.data?.seed).toBe(1));

    act(() => {
      result.current.reload();
    });

    await waitFor(() => expect(result.current.data).toBeUndefined());
    expect(result.current.isLoading).toBe(true);

    act(() => {
      resolveSecondPreview(createPreview(2));
    });

    await waitFor(() => expect(result.current.data?.seed).toBe(2));
    expect(api.previewTestNotification).toHaveBeenCalledTimes(2);
    expect(api.previewTestNotification).toHaveBeenLastCalledWith('policy-1');
  });
});
