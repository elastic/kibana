/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import { useAddEndpoint } from './use_add_endpoint';
import { useMLModelNotificationToasts } from '../../hooks/use_ml_model_status_toasts';
import { createInferenceEndpoint } from '../services';

jest.mock('../services', () => ({
  createInferenceEndpoint: jest.fn(),
}));

jest.mock('../../hooks/use_ml_model_status_toasts', () => ({
  useMLModelNotificationToasts: jest.fn(),
}));

const mockOnSuccess = jest.fn();
const mockOnError = jest.fn();
const mockShowErrorToast = jest.fn();
const mockShowSuccessToast = jest.fn();

describe('useAddEndpoint', () => {
  const mockConfig: any = {
    provider: 'elasticsearch',
    taskType: 'text_embedding',
    inferenceId: 'es-endpoint-1',
    providerConfig: {
      num_allocations: 1,
      num_threads: 2,
      model_id: '.multilingual-e5-small',
    },
  };
  const mockSecrets: any = { providerSecrets: {} };

  const mockInferenceEndpoint = {
    config: mockConfig,
    secrets: mockSecrets,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useMLModelNotificationToasts as jest.Mock).mockReturnValue({
      showInferenceCreationErrorToasts: mockShowErrorToast,
      showInferenceSuccessToast: mockShowSuccessToast,
    });
  });

  it('calls onSuccess and shows success toast on successful endpoint creation', async () => {
    (createInferenceEndpoint as jest.Mock).mockResolvedValueOnce({ error: null });

    const { result } = renderHook(() => useAddEndpoint(mockOnSuccess, mockOnError));

    await act(async () => {
      await result.current.addInferenceEndpoint(mockInferenceEndpoint);
    });

    expect(createInferenceEndpoint).toHaveBeenCalledWith(
      'text_embedding',
      'es-endpoint-1',
      mockInferenceEndpoint
    );
    expect(mockShowSuccessToast).toHaveBeenCalledTimes(1);
    expect(mockShowErrorToast).not.toHaveBeenCalled();
    expect(mockOnSuccess).toHaveBeenCalledTimes(1);
    expect(mockOnError).not.toHaveBeenCalled();
  });

  it('calls onError and shows error toast on endpoint creation failure', async () => {
    const mockError = new Error('Endpoint creation failed');
    (createInferenceEndpoint as jest.Mock).mockResolvedValueOnce({ error: mockError });

    const { result } = renderHook(() => useAddEndpoint(mockOnSuccess, mockOnError));

    await act(async () => {
      await result.current.addInferenceEndpoint(mockInferenceEndpoint);
    });

    expect(createInferenceEndpoint).toHaveBeenCalledWith(
      'text_embedding',
      'es-endpoint-1',
      mockInferenceEndpoint
    );
    expect(mockShowErrorToast).toHaveBeenCalledWith('Endpoint creation failed');
    expect(mockShowSuccessToast).not.toHaveBeenCalled();
    expect(mockOnError).toHaveBeenCalledTimes(1);
    expect(mockOnSuccess).not.toHaveBeenCalled();
  });
});
