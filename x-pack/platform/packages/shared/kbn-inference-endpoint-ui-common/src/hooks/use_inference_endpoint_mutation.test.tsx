/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InferenceInferenceEndpointInfo } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { useInferenceEndpointMutation } from './use_inference_endpoint_mutation';
import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { notificationServiceMock } from '@kbn/core-notifications-browser-mocks';

jest.mock('./use_inference_endpoint_mutation', () => ({
  ...jest.requireActual('./use_inference_endpoint_mutation'),
  addInferenceEndpoint: jest.fn(),
  updateInferenceEndpoint: jest.fn(),
}));

const httpMock = httpServiceMock.createStartContract();
const mockToasts = notificationServiceMock.createStartContract().toasts;

const mockOnSuccessCallback = jest.fn();

const mockConfig: any = {
  provider: 'test-provider',
  taskType: 'text_embedding',
  inferenceId: 'test-id',
  providerConfig: {
    num_allocations: 1,
    num_threads: 2,
    model_id: 'test-model',
  },
};
const mockSecrets: any = { providerSecrets: {} };

const mockInferenceEndpoint = {
  config: mockConfig,
  secrets: mockSecrets,
};

const mockResponse: InferenceInferenceEndpointInfo = {
  inference_id: 'test-id',
  task_type: 'text_embedding',
  service: 'test-provider',
  service_settings: {
    num_allocations: 1,
    num_threads: 2,
    model_id: 'test-model',
  },
};

describe('useInferenceEndpointMutation', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => {
    const queryClient = new QueryClient();
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };

  describe('Add Endpoint', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should handle successful endpoint creation', async () => {
      httpMock.post.mockImplementation(() => Promise.resolve(mockResponse));
      const { result } = renderHook(
        () => useInferenceEndpointMutation(httpMock, mockToasts, mockOnSuccessCallback),
        { wrapper }
      );

      await act(async () => {
        result.current.mutate(mockInferenceEndpoint, false);
      });

      expect(httpMock.post).toHaveBeenCalledWith('/internal/_inference/_add', {
        body: JSON.stringify(mockInferenceEndpoint),
        version: expect.any(String),
      });
      expect(mockToasts.addSuccess).toHaveBeenCalledWith({
        title: expect.any(String),
      });

      expect(mockOnSuccessCallback).toHaveBeenCalledWith('test-id');
    });

    it('should handle endpoint creation error', async () => {
      const errorMessage = 'Creation failed';
      const error = { body: { message: errorMessage } };
      httpMock.post.mockImplementation(() => Promise.reject(error));

      const { result } = renderHook(
        () => useInferenceEndpointMutation(httpMock, mockToasts, mockOnSuccessCallback),
        { wrapper }
      );

      await act(async () => {
        result.current.mutate(mockInferenceEndpoint, false);
      });

      expect(mockToasts.addError).toHaveBeenCalledWith(new Error(errorMessage), {
        title: expect.any(String),
        toastMessage: errorMessage,
      });

      expect(mockOnSuccessCallback).not.toHaveBeenCalled();
    });
  });

  describe('Update Endpoint', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should handle successful endpoint update', async () => {
      httpMock.put.mockImplementation(() => Promise.resolve(mockResponse));
      const { result } = renderHook(
        () => useInferenceEndpointMutation(httpMock, mockToasts, mockOnSuccessCallback),
        { wrapper }
      );

      await act(async () => {
        result.current.mutate(mockInferenceEndpoint, true);
      });

      expect(httpMock.put).toHaveBeenCalledWith('/internal/_inference/_update', {
        body: JSON.stringify(mockInferenceEndpoint),
        version: expect.any(String),
      });
      expect(mockToasts.addSuccess).toHaveBeenCalledWith({
        title: expect.any(String),
      });

      expect(mockOnSuccessCallback).toHaveBeenCalledWith('test-id');
    });

    it('should handle endpoint creation error', async () => {
      const errorMessage = 'Creation failed';
      const error = { body: { message: errorMessage } };
      httpMock.put.mockImplementation(() => Promise.reject(error));

      const { result } = renderHook(
        () => useInferenceEndpointMutation(httpMock, mockToasts, mockOnSuccessCallback),
        { wrapper }
      );

      await act(async () => {
        result.current.mutate(mockInferenceEndpoint, true);
      });

      expect(mockToasts.addError).toHaveBeenCalledWith(new Error(errorMessage), {
        title: expect.any(String),
        toastMessage: errorMessage,
      });

      expect(mockOnSuccessCallback).not.toHaveBeenCalled();
    });
  });
});
