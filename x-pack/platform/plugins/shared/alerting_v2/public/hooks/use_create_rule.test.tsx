/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type { HttpStart, NotificationsStart } from '@kbn/core/public';
import type { FormValues } from '@kbn/alerting-v2-rule-form';
import { useCreateRule } from './use_create_rule';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const createMockHttp = (response: unknown = { id: 'rule-123', name: 'Test Rule' }) => ({
  post: jest.fn().mockResolvedValue(response),
});

const createMockNotifications = () => ({
  toasts: {
    addSuccess: jest.fn(),
    addDanger: jest.fn(),
  },
});

describe('useCreateRule', () => {
  const validFormData: FormValues = {
    kind: 'signal',
    name: 'Test Rule',
    description: 'Test Description',
    tags: ['tag1', 'tag2'],
    schedule: { custom: '5m' },
    enabled: true,
    query: 'FROM logs | LIMIT 10',
    timeField: '@timestamp',
    lookbackWindow: '15m',
    groupingKey: ['host.name'],
  };

  it('calls the correct API endpoint', async () => {
    const http = createMockHttp();
    const notifications = createMockNotifications();
    const onSuccess = jest.fn();

    const { result } = renderHook(
      () =>
        useCreateRule({
          http: http as unknown as HttpStart,
          notifications: notifications as unknown as NotificationsStart,
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
    const http = createMockHttp();
    const notifications = createMockNotifications();
    const onSuccess = jest.fn();

    const { result } = renderHook(
      () =>
        useCreateRule({
          http: http as unknown as HttpStart,
          notifications: notifications as unknown as NotificationsStart,
          onSuccess,
        }),
      { wrapper: createWrapper() }
    );

    await act(async () => {
      result.current.createRule(validFormData);
    });

    await waitFor(() => {
      expect(http.post).toHaveBeenCalledWith('/internal/alerting/v2/rule', {
        body: JSON.stringify(validFormData),
      });
    });
  });

  it('shows success toast and calls onSuccess callback on successful creation', async () => {
    const http = createMockHttp({ id: 'rule-123', name: 'My New Rule' });
    const notifications = createMockNotifications();
    const onSuccess = jest.fn();

    const { result } = renderHook(
      () =>
        useCreateRule({
          http: http as unknown as HttpStart,
          notifications: notifications as unknown as NotificationsStart,
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
    const http = {
      post: jest.fn().mockRejectedValue({
        body: { message: 'Network error' },
        message: 'Network error',
      }),
    };
    const notifications = createMockNotifications();
    const onSuccess = jest.fn();

    const { result } = renderHook(
      () =>
        useCreateRule({
          http: http as unknown as HttpStart,
          notifications: notifications as unknown as NotificationsStart,
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
    const http = createMockHttp();
    const notifications = createMockNotifications();
    const onSuccess = jest.fn();

    const { result } = renderHook(
      () =>
        useCreateRule({
          http: http as unknown as HttpStart,
          notifications: notifications as unknown as NotificationsStart,
          onSuccess,
        }),
      { wrapper: createWrapper() }
    );

    const formData: FormValues = {
      name: 'Complex Rule',
      kind: 'signal',
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
      const callBody = JSON.parse(http.post.mock.calls[0][1].body);
      expect(callBody).toEqual({
        name: 'Complex Rule',
        kind: 'signal',
        description: 'Complex Rule Description',
        tags: ['production', 'critical'],
        schedule: { custom: '1m' },
        enabled: false,
        query: 'FROM metrics | WHERE cpu > 90',
        timeField: 'event.timestamp',
        lookbackWindow: '30m',
        groupingKey: ['host.name', 'service.name'],
      });
    });
  });
});
