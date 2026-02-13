/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { notificationServiceMock } from '@kbn/core-notifications-browser-mocks';
import { useCreateRule } from './use_create_rule';
import type { FormValues } from '../types';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
    logger: {
      log: () => {},
      warn: () => {},
      error: () => {},
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useCreateRule', () => {
  const validFormData: FormValues = {
    kind: 'signal',
    name: 'Test Rule',
    description: 'Test Rule Description',
    tags: ['tag1', 'tag2'],
    schedule: { custom: '5m' },
    enabled: true,
    query: 'FROM logs | LIMIT 10',
    timeField: '@timestamp',
    lookbackWindow: '15m',
    groupingKey: ['host.name'],
  };

  it('calls the correct API endpoint', async () => {
    const http = httpServiceMock.createStartContract();
    const notifications = notificationServiceMock.createStartContract();
    const onSuccess = jest.fn();

    http.post.mockResolvedValue({ id: 'rule-123', name: 'Test Rule' });

    const { result } = renderHook(
      () =>
        useCreateRule({
          http,
          notifications,
          onSuccess,
        }),
      { wrapper: createWrapper() }
    );

    await act(async () => {
      result.current.createRule(validFormData);
    });

    await waitFor(() => {
      expect(http.post).toHaveBeenCalledWith('/internal/alerting/v2/rule', expect.any(Object));
    });
  });

  it('sends the form data as JSON in the request body', async () => {
    const http = httpServiceMock.createStartContract();
    const notifications = notificationServiceMock.createStartContract();
    const onSuccess = jest.fn();

    http.post.mockResolvedValue({ id: 'rule-123', name: 'Test Rule' });

    const { result } = renderHook(
      () =>
        useCreateRule({
          http,
          notifications,
          onSuccess,
        }),
      { wrapper: createWrapper() }
    );

    await act(async () => {
      result.current.createRule(validFormData);
    });

    await waitFor(() => {
      expect(http.post).toHaveBeenCalledWith('/internal/alerting/v2/rule', {
        body: JSON.stringify({
          kind: 'signal',
          name: 'Test Rule',
          tags: ['tag1', 'tag2'],
          schedule: { custom: '5m' },
          enabled: true,
          query: 'FROM logs | LIMIT 10',
          timeField: '@timestamp',
          lookbackWindow: '15m',
          groupingKey: ['host.name'],
        }),
      });
    });
  });

  it('shows success toast and calls onSuccess callback on successful creation', async () => {
    const http = httpServiceMock.createStartContract();
    const notifications = notificationServiceMock.createStartContract();
    const onSuccess = jest.fn();

    http.post.mockResolvedValue({ id: 'rule-123', name: 'My New Rule' });

    const { result } = renderHook(
      () =>
        useCreateRule({
          http,
          notifications,
          onSuccess,
        }),
      { wrapper: createWrapper() }
    );

    await act(async () => {
      result.current.createRule(validFormData);
    });

    await waitFor(() => {
      expect(notifications.toasts.addSuccess).toHaveBeenCalledWith(
        "Rule 'My New Rule' was created successfully"
      );
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it('shows error toast on failure', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const http = httpServiceMock.createStartContract();
    const notifications = notificationServiceMock.createStartContract();
    const onSuccess = jest.fn();

    http.post.mockRejectedValue({
      body: { message: 'Network error' },
      message: 'Network error',
    });

    const { result } = renderHook(
      () =>
        useCreateRule({
          http,
          notifications,
          onSuccess,
        }),
      { wrapper: createWrapper() }
    );

    await act(async () => {
      result.current.createRule(validFormData);
    });

    await waitFor(() => {
      expect(notifications.toasts.addDanger).toHaveBeenCalledWith(
        'Error creating rule: Network error'
      );
      expect(onSuccess).not.toHaveBeenCalled();
    });
    consoleErrorSpy.mockRestore();
  });

  it('includes all form fields in the request payload', async () => {
    const http = httpServiceMock.createStartContract();
    const notifications = notificationServiceMock.createStartContract();
    const onSuccess = jest.fn();

    http.post.mockResolvedValue({ id: 'rule-456', name: 'Complex Rule' });

    const { result } = renderHook(
      () =>
        useCreateRule({
          http,
          notifications,
          onSuccess,
        }),
      { wrapper: createWrapper() }
    );

    const formData: FormValues = {
      kind: 'signal',
      name: 'Complex Rule',
      description: 'Complex Rule Description',
      tags: ['production', 'critical'],
      schedule: { custom: '1m' },
      enabled: false,
      query: 'FROM metrics | WHERE cpu > 90',
      timeField: 'event.timestamp',
      lookbackWindow: '30m',
      groupingKey: ['host.name', 'service.name'],
    };

    await act(async () => {
      result.current.createRule(formData);
    });

    await waitFor(() => {
      expect(http.post).toHaveBeenCalledWith('/internal/alerting/v2/rule', {
        body: JSON.stringify({
          kind: 'signal',
          name: 'Complex Rule',
          tags: ['production', 'critical'],
          schedule: { custom: '1m' },
          enabled: false,
          query: 'FROM metrics | WHERE cpu > 90',
          timeField: 'event.timestamp',
          lookbackWindow: '30m',
          groupingKey: ['host.name', 'service.name'],
        }),
      });
    });
  });
});
