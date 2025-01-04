/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { useMLModelNotificationToasts } from '../../hooks/use_ml_model_status_toasts';
import { getInferenceServices } from '../services';
import { useProviders } from './use_providers';
import { MockProviders } from '../../services/provider.mock';

jest.mock('../services', () => ({
  getInferenceServices: jest.fn(),
}));

jest.mock('../../hooks/use_ml_model_status_toasts', () => ({
  useMLModelNotificationToasts: jest.fn(),
}));

describe('useProviders', () => {
  const mockShowErrorToasts = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useMLModelNotificationToasts as jest.Mock).mockReturnValue({
      showProviderFetchErrorToasts: mockShowErrorToasts,
    });
  });

  it('fetches inference services successfully', async () => {
    (getInferenceServices as jest.Mock).mockResolvedValueOnce({
      data: MockProviders,
    });

    const { result } = renderHook(() => useProviders());

    let providers;
    await act(async () => {
      providers = await result.current.fetchInferenceServices();
    });

    expect(getInferenceServices).toHaveBeenCalledTimes(1);
    expect(providers).toEqual(MockProviders);
    expect(mockShowErrorToasts).not.toHaveBeenCalled();
  });

  it('shows error toast on API failure', async () => {
    const mockError = new Error('API failure');
    (getInferenceServices as jest.Mock).mockRejectedValueOnce(mockError);

    const { result } = renderHook(() => useProviders());

    await act(async () => {
      const providers = await result.current.fetchInferenceServices();
      expect(providers).toBeUndefined();
    });

    expect(getInferenceServices).toHaveBeenCalledTimes(1);
    expect(mockShowErrorToasts).toHaveBeenCalled();
  });
});
