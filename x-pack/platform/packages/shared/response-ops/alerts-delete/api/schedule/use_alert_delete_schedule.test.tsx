/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { useAlertDeleteSchedule } from './use_alert_delete_schedule';
import { createAlertDeleteSchedule } from './create_alert_delete_schedule';
import type { IHttpFetchError, ResponseErrorBody } from '@kbn/core-http-browser';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { httpServiceMock } from '@kbn/core/public/mocks';
import type { AlertDeleteParams } from '@kbn/alerting-types';

const http = httpServiceMock.createStartContract();

jest.mock('./create_alert_delete_schedule');

describe('useAlertDeleteSchedule', () => {
  const mockOnSuccess = jest.fn();
  const mockOnError = jest.fn();
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call onSuccess when the mutation succeeds', async () => {
    const mockRequestBody: AlertDeleteParams = {
      activeAlertDeleteThreshold: 10,
      inactiveAlertDeleteThreshold: 10,
      categoryIds: ['management'],
    };
    (createAlertDeleteSchedule as jest.Mock).mockResolvedValueOnce({ success: true });

    const { result } = renderHook(
      () =>
        useAlertDeleteSchedule({
          services: { http },
          onSuccess: mockOnSuccess,
          onError: mockOnError,
        }),
      { wrapper }
    );

    await act(async () => {
      await result.current.mutateAsync(mockRequestBody);
    });

    expect(createAlertDeleteSchedule).toHaveBeenCalledWith({
      services: { http },
      requestBody: mockRequestBody,
    });
    expect(mockOnSuccess).toHaveBeenCalled();
    expect(mockOnError).not.toHaveBeenCalled();
  });
});

describe('useAlertDeleteSchedule with muted console.errors', () => {
  const mockOnSuccess = jest.fn();
  const mockOnError = jest.fn();
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
    logger: {
      // eslint-disable-next-line no-console
      log: console.log,
      // eslint-disable-next-line no-console
      warn: console.warn,
      error: () => {},
    },
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call onError when the mutation fails', async () => {
    const mockRequestBody: AlertDeleteParams = {
      activeAlertDeleteThreshold: 10,
      inactiveAlertDeleteThreshold: 10,
      categoryIds: ['management'],
    };
    const mockError: IHttpFetchError<ResponseErrorBody> = {
      body: {
        message: 'Request failed',
        statusCode: 500,
      },
      name: 'Error',
      request: {} as unknown as Request,
      message: 'Internal Server Error',
    };
    (createAlertDeleteSchedule as jest.Mock).mockRejectedValueOnce(mockError);

    const { result } = renderHook(
      () =>
        useAlertDeleteSchedule({
          services: { http },
          onSuccess: mockOnSuccess,
          onError: mockOnError,
        }),
      { wrapper }
    );

    await act(async () => {
      try {
        await result.current.mutateAsync(mockRequestBody);
      } catch (e) {
        // Expected error
      }
    });

    expect(createAlertDeleteSchedule).toHaveBeenCalledWith({
      services: { http },
      requestBody: mockRequestBody,
    });
    expect(mockOnError.mock.calls[0][0]).toEqual(mockError);
    expect(mockOnError.mock.calls[0][1]).toEqual({
      activeAlertDeleteThreshold: 10,
      inactiveAlertDeleteThreshold: 10,
      categoryIds: ['management'],
    });

    expect(mockOnSuccess).not.toHaveBeenCalled();
  });
});
