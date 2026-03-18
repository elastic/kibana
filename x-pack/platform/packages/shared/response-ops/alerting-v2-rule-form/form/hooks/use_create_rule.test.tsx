/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { notificationServiceMock } from '@kbn/core-notifications-browser-mocks';
import { createQueryClientWrapper } from '../../test_utils';
import { useCreateRule } from './use_create_rule';
import type { FormValues } from '../types';

describe('useCreateRule', () => {
  const setupUseCreateRule = () => {
    const http = httpServiceMock.createStartContract();
    const notifications = notificationServiceMock.createStartContract();
    const onSuccess = jest.fn();
    const hook = renderHook(
      () =>
        useCreateRule({
          http,
          notifications,
        }),
      { wrapper: createQueryClientWrapper() }
    );

    return { http, notifications, onSuccess, ...hook };
  };

  const getLastPostedBody = (http: ReturnType<typeof httpServiceMock.createStartContract>) => {
    const lastCallArgs = http.post.mock.calls[http.post.mock.calls.length - 1];
    const requestOptions = lastCallArgs[lastCallArgs.length - 1] as { body: string };
    return JSON.parse(requestOptions.body);
  };

  const validFormData: FormValues = {
    kind: 'signal',
    metadata: {
      name: 'Test Rule',
      enabled: true,
      labels: ['tag1', 'tag2'],
    },
    timeField: '@timestamp',
    schedule: { every: '5m', lookback: '1m' },
    evaluation: {
      query: {
        base: 'FROM logs | LIMIT 10',
        condition: '',
      },
    },
    grouping: { fields: ['host.name'] },
  };

  // Expected API payload after mapping FormValues to CreateRuleData
  // Note: timeField in form is mapped to time_field in API
  // Note: empty condition field is omitted from the payload
  const expectedApiPayload = {
    kind: 'signal',
    metadata: {
      name: 'Test Rule',
      labels: ['tag1', 'tag2'],
    },
    time_field: '@timestamp',
    schedule: { every: '5m', lookback: '1m' },
    evaluation: {
      query: {
        base: 'FROM logs | LIMIT 10',
      },
    },
    grouping: { fields: ['host.name'] },
  };

  it('calls the correct API endpoint', async () => {
    const http = httpServiceMock.createStartContract();
    const notifications = notificationServiceMock.createStartContract();

    http.post.mockResolvedValue({ id: 'rule-123', metadata: { name: 'Test Rule' } });

    const { result } = renderHook(
      () =>
        useCreateRule({
          http,
          notifications,
        }),
      { wrapper: createQueryClientWrapper() }
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

    http.post.mockResolvedValue({ id: 'rule-123', metadata: { name: 'Test Rule' } });

    const { result } = renderHook(
      () =>
        useCreateRule({
          http,
          notifications,
        }),
      { wrapper: createQueryClientWrapper() }
    );

    await act(async () => {
      result.current.createRule(validFormData);
    });

    await waitFor(() => {
      expect(http.post).toHaveBeenCalledWith('/internal/alerting/v2/rule', {
        body: JSON.stringify(expectedApiPayload),
      });
    });
  });

  it('shows success toast and calls onSuccess callback on successful creation', async () => {
    const http = httpServiceMock.createStartContract();
    const notifications = notificationServiceMock.createStartContract();
    const onSuccess = jest.fn();

    http.post.mockResolvedValue({ id: 'rule-123', metadata: { name: 'My New Rule' } });

    const { result } = renderHook(
      () =>
        useCreateRule({
          http,
          notifications,
        }),
      { wrapper: createQueryClientWrapper() }
    );

    await act(async () => {
      result.current.createRule(validFormData, { onSuccess });
    });

    await waitFor(() => {
      expect(notifications.toasts.addSuccess).toHaveBeenCalledWith(
        "Rule 'My New Rule' was created successfully"
      );
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it('shows error toast on failure', async () => {
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
        }),
      { wrapper: createQueryClientWrapper() }
    );

    await act(async () => {
      result.current.createRule(validFormData, { onSuccess });
    });

    await waitFor(() => {
      expect(notifications.toasts.addDanger).toHaveBeenCalledWith(
        'Error creating rule: Network error'
      );
      expect(onSuccess).not.toHaveBeenCalled();
    });
  });

  it('includes state_transition in payload when kind is alert with state transition config', async () => {
    const { http, result } = setupUseCreateRule();

    http.post.mockResolvedValue({ id: 'rule-789', metadata: { name: 'Alert Rule' } });

    const formData: FormValues = {
      kind: 'alert',
      metadata: {
        name: 'Alert Rule',
        enabled: true,
      },
      timeField: '@timestamp',
      schedule: { every: '5m', lookback: '1m' },
      evaluation: {
        query: {
          base: 'FROM logs | LIMIT 10',
        },
      },
      stateTransition: {
        pendingCount: 3,
        pendingTimeframe: '10m',
      },
    };

    await act(async () => {
      result.current.createRule(formData);
    });

    await waitFor(() => {
      const body = getLastPostedBody(http);
      expect(body.state_transition).toEqual({
        pending_count: 3,
        pending_timeframe: '10m',
      });
    });
  });

  it('omits state_transition when kind is signal even if state transition is set', async () => {
    const { http, result } = setupUseCreateRule();

    http.post.mockResolvedValue({ id: 'rule-789', metadata: { name: 'Signal Rule' } });

    const formData: FormValues = {
      kind: 'signal',
      metadata: {
        name: 'Signal Rule',
        enabled: true,
      },
      timeField: '@timestamp',
      schedule: { every: '5m', lookback: '1m' },
      evaluation: {
        query: {
          base: 'FROM logs | LIMIT 10',
        },
      },
      stateTransition: {
        pendingCount: 3,
      },
    };

    await act(async () => {
      result.current.createRule(formData);
    });

    await waitFor(() => {
      const body = getLastPostedBody(http);
      expect(body.state_transition).toBeUndefined();
    });
  });

  it('omits state_transition when kind is alert but state transition is empty', async () => {
    const { http, result } = setupUseCreateRule();

    http.post.mockResolvedValue({ id: 'rule-789', metadata: { name: 'Alert Rule' } });

    const formData: FormValues = {
      kind: 'alert',
      metadata: {
        name: 'Alert Rule',
        enabled: true,
      },
      timeField: '@timestamp',
      schedule: { every: '5m', lookback: '1m' },
      evaluation: {
        query: {
          base: 'FROM logs | LIMIT 10',
        },
      },
      stateTransition: {},
    };

    await act(async () => {
      result.current.createRule(formData);
    });

    await waitFor(() => {
      const body = getLastPostedBody(http);
      expect(body.state_transition).toBeUndefined();
    });
  });

  it('includes only pending_count when state transition timeframe is not set', async () => {
    const { http, result } = setupUseCreateRule();

    http.post.mockResolvedValue({ id: 'rule-789', metadata: { name: 'Alert Rule' } });

    const formData: FormValues = {
      kind: 'alert',
      metadata: {
        name: 'Alert Rule',
        enabled: true,
      },
      timeField: '@timestamp',
      schedule: { every: '5m', lookback: '1m' },
      evaluation: {
        query: {
          base: 'FROM logs | LIMIT 10',
        },
      },
      stateTransition: {
        pendingCount: 5,
      },
    };

    await act(async () => {
      result.current.createRule(formData);
    });

    await waitFor(() => {
      const body = getLastPostedBody(http);
      expect(body.state_transition).toEqual({ pending_count: 5 });
    });
  });

  it('includes all form fields in the request payload', async () => {
    const http = httpServiceMock.createStartContract();
    const notifications = notificationServiceMock.createStartContract();

    http.post.mockResolvedValue({ id: 'rule-456', metadata: { name: 'Complex Rule' } });

    const { result } = renderHook(
      () =>
        useCreateRule({
          http,
          notifications,
        }),
      { wrapper: createQueryClientWrapper() }
    );

    const formData: FormValues = {
      kind: 'signal',
      metadata: {
        name: 'Complex Rule',
        enabled: false,
        description: 'A complex rule',
        labels: ['production', 'critical'],
      },
      timeField: 'event.timestamp',
      schedule: { every: '1m', lookback: '1m' },
      evaluation: {
        query: {
          base: 'FROM metrics | WHERE cpu > 90',
          condition: '',
        },
      },
      grouping: { fields: ['host.name', 'service.name'] },
    };

    // Note: timeField in form is mapped to time_field in API
    // Note: empty condition field is omitted from the payload
    const expectedPayload = {
      kind: 'signal',
      metadata: {
        name: 'Complex Rule',
        description: 'A complex rule',
        labels: ['production', 'critical'],
      },
      time_field: 'event.timestamp',
      schedule: { every: '1m', lookback: '1m' },
      evaluation: {
        query: {
          base: 'FROM metrics | WHERE cpu > 90',
        },
      },
      grouping: { fields: ['host.name', 'service.name'] },
    };

    await act(async () => {
      result.current.createRule(formData);
    });

    await waitFor(() => {
      expect(http.post).toHaveBeenCalledWith('/internal/alerting/v2/rule', {
        body: JSON.stringify(expectedPayload),
      });
    });
  });

  it('maps recovery_policy with condition-only mode using evaluation base query', async () => {
    const http = httpServiceMock.createStartContract();
    const notifications = notificationServiceMock.createStartContract();

    http.post.mockResolvedValue({ id: 'rule-789', metadata: { name: 'Recovery Rule' } });

    const { result } = renderHook(() => useCreateRule({ http, notifications }), {
      wrapper: createQueryClientWrapper(),
    });

    const formData: FormValues = {
      kind: 'alert',
      metadata: { name: 'Recovery Rule', enabled: true },
      timeField: '@timestamp',
      schedule: { every: '5m', lookback: '1m' },
      evaluation: {
        query: {
          base: 'FROM logs | STATS count() BY host',
          condition: 'WHERE count > 100',
        },
      },
      recoveryPolicy: {
        type: 'query',
        query: {
          condition: 'WHERE count <= 50',
        },
      },
    };

    await act(async () => {
      result.current.createRule(formData);
    });

    await waitFor(() => {
      const payload = JSON.parse(
        (http.post.mock.calls[0] as unknown as [string, { body: string }])[1].body
      );
      expect(payload.recovery_policy).toEqual({
        type: 'query',
        query: {
          base: 'FROM logs | STATS count() BY host',
          condition: 'WHERE count <= 50',
        },
      });
    });
  });

  it('maps recovery_policy with full base query when no condition is set', async () => {
    const http = httpServiceMock.createStartContract();
    const notifications = notificationServiceMock.createStartContract();

    http.post.mockResolvedValue({ id: 'rule-790', metadata: { name: 'Full Recovery Rule' } });

    const { result } = renderHook(() => useCreateRule({ http, notifications }), {
      wrapper: createQueryClientWrapper(),
    });

    const formData: FormValues = {
      kind: 'alert',
      metadata: { name: 'Full Recovery Rule', enabled: true },
      timeField: '@timestamp',
      schedule: { every: '5m', lookback: '1m' },
      evaluation: {
        query: {
          base: 'FROM logs | STATS count() BY host',
        },
      },
      recoveryPolicy: {
        type: 'query',
        query: {
          base: 'FROM logs | STATS count() BY host | WHERE count <= 10',
        },
      },
    };

    await act(async () => {
      result.current.createRule(formData);
    });

    await waitFor(() => {
      const payload = JSON.parse(
        (http.post.mock.calls[0] as unknown as [string, { body: string }])[1].body
      );
      expect(payload.recovery_policy).toEqual({
        type: 'query',
        query: {
          base: 'FROM logs | STATS count() BY host | WHERE count <= 10',
        },
      });
    });
  });

  it('omits recovery_policy query when type is no_breach', async () => {
    const http = httpServiceMock.createStartContract();
    const notifications = notificationServiceMock.createStartContract();

    http.post.mockResolvedValue({ id: 'rule-791', metadata: { name: 'No Breach Rule' } });

    const { result } = renderHook(() => useCreateRule({ http, notifications }), {
      wrapper: createQueryClientWrapper(),
    });

    const formData: FormValues = {
      kind: 'alert',
      metadata: { name: 'No Breach Rule', enabled: true },
      timeField: '@timestamp',
      schedule: { every: '5m', lookback: '1m' },
      evaluation: {
        query: { base: 'FROM logs | STATS count() BY host' },
      },
      recoveryPolicy: { type: 'no_breach' },
    };

    await act(async () => {
      result.current.createRule(formData);
    });

    await waitFor(() => {
      const payload = JSON.parse(
        (http.post.mock.calls[0] as unknown as [string, { body: string }])[1].body
      );
      expect(payload.recovery_policy).toEqual({ type: 'no_breach' });
      expect(payload.recovery_policy.query).toBeUndefined();
    });
  });
});
