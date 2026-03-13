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
import { useUpdateRule } from './use_update_rule';
import type { FormValues } from '../types';

describe('useUpdateRule', () => {
  const ruleId = 'rule-abc-123';

  const setupUseUpdateRule = () => {
    const http = httpServiceMock.createStartContract();
    const notifications = notificationServiceMock.createStartContract();
    const onSuccess = jest.fn();
    const hook = renderHook(
      () =>
        useUpdateRule({
          http,
          notifications,
          ruleId,
        }),
      { wrapper: createQueryClientWrapper() }
    );

    return { http, notifications, onSuccess, ...hook };
  };

  const getLastPatchedBody = (http: ReturnType<typeof httpServiceMock.createStartContract>) => {
    const lastCallArgs = http.patch.mock.calls[http.patch.mock.calls.length - 1];
    const requestOptions = lastCallArgs[lastCallArgs.length - 1] as { body: string };
    return JSON.parse(requestOptions.body);
  };

  const validFormData: FormValues = {
    kind: 'signal',
    metadata: {
      name: 'Updated Rule',
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

  it('calls the correct API endpoint with encoded ruleId', async () => {
    const { http, result } = setupUseUpdateRule();

    http.patch.mockResolvedValue({ id: ruleId, metadata: { name: 'Updated Rule' } });

    await act(async () => {
      result.current.updateRule(validFormData);
    });

    await waitFor(() => {
      expect(http.patch).toHaveBeenCalledWith(
        `/internal/alerting/v2/rule/${encodeURIComponent(ruleId)}`,
        expect.any(Object)
      );
    });
  });

  it('does not include kind in the update payload', async () => {
    const { http, result } = setupUseUpdateRule();

    http.patch.mockResolvedValue({ id: ruleId, metadata: { name: 'Updated Rule' } });

    await act(async () => {
      result.current.updateRule(validFormData);
    });

    await waitFor(() => {
      const body = getLastPatchedBody(http);
      expect(body).not.toHaveProperty('kind');
    });
  });

  it('coerces absent optional fields to null for explicit removal', async () => {
    const { http, result } = setupUseUpdateRule();

    http.patch.mockResolvedValue({ id: ruleId, metadata: { name: 'Minimal Rule' } });

    const minimalFormData: FormValues = {
      kind: 'signal',
      metadata: { name: 'Minimal Rule', enabled: true },
      timeField: '@timestamp',
      schedule: { every: '5m', lookback: '1m' },
      evaluation: { query: { base: 'FROM logs | LIMIT 10' } },
    };

    await act(async () => {
      result.current.updateRule(minimalFormData);
    });

    await waitFor(() => {
      const body = getLastPatchedBody(http);
      expect(body.grouping).toBeNull();
      expect(body.recovery_policy).toBeNull();
      expect(body.state_transition).toBeNull();
    });
  });

  it('sends the correctly mapped form data as JSON', async () => {
    const { http, result } = setupUseUpdateRule();

    http.patch.mockResolvedValue({ id: ruleId, metadata: { name: 'Updated Rule' } });

    await act(async () => {
      result.current.updateRule(validFormData);
    });

    // Note: empty condition field is omitted, absent optional fields are null
    const expectedPayload = {
      metadata: { name: 'Updated Rule', labels: ['tag1', 'tag2'] },
      time_field: '@timestamp',
      schedule: { every: '5m', lookback: '1m' },
      evaluation: { query: { base: 'FROM logs | LIMIT 10' } },
      grouping: { fields: ['host.name'] },
      recovery_policy: null,
      state_transition: null,
    };

    await waitFor(() => {
      expect(http.patch).toHaveBeenCalledWith(
        `/internal/alerting/v2/rule/${encodeURIComponent(ruleId)}`,
        { body: JSON.stringify(expectedPayload) }
      );
    });
  });

  it('includes description in the update payload when provided', async () => {
    const { http, result } = setupUseUpdateRule();

    http.patch.mockResolvedValue({ id: ruleId, metadata: { name: 'Updated Rule' } });

    const formDataWithDescription: FormValues = {
      ...validFormData,
      metadata: {
        ...validFormData.metadata,
        description: 'Updated description',
      },
    };

    await act(async () => {
      result.current.updateRule(formDataWithDescription);
    });

    await waitFor(() => {
      const body = getLastPatchedBody(http);
      expect(body.metadata.description).toBe('Updated description');
    });
  });

  it('includes evaluation condition when non-empty', async () => {
    const { http, result } = setupUseUpdateRule();

    http.patch.mockResolvedValue({ id: ruleId, metadata: { name: 'Condition Rule' } });

    const formData: FormValues = {
      ...validFormData,
      evaluation: {
        query: {
          base: 'FROM logs | STATS count() BY host',
          condition: 'WHERE count > 100',
        },
      },
    };

    await act(async () => {
      result.current.updateRule(formData);
    });

    await waitFor(() => {
      const body = getLastPatchedBody(http);
      expect(body.evaluation.query).toEqual({
        base: 'FROM logs | STATS count() BY host',
        condition: 'WHERE count > 100',
      });
    });
  });

  it('includes recovery_policy with condition-only mode using evaluation base', async () => {
    const { http, result } = setupUseUpdateRule();

    http.patch.mockResolvedValue({ id: ruleId, metadata: { name: 'Recovery Rule' } });

    const formData: FormValues = {
      ...validFormData,
      kind: 'alert',
      evaluation: {
        query: {
          base: 'FROM logs | STATS count() BY host',
          condition: 'WHERE count > 100',
        },
      },
      recoveryPolicy: {
        type: 'query',
        query: { condition: 'WHERE count <= 50' },
      },
    };

    await act(async () => {
      result.current.updateRule(formData);
    });

    await waitFor(() => {
      const body = getLastPatchedBody(http);
      expect(body.recovery_policy).toEqual({
        type: 'query',
        query: {
          base: 'FROM logs | STATS count() BY host',
          condition: 'WHERE count <= 50',
        },
      });
    });
  });

  it('includes state_transition for alert kind', async () => {
    const { http, result } = setupUseUpdateRule();

    http.patch.mockResolvedValue({ id: ruleId, metadata: { name: 'Alert Rule' } });

    const formData: FormValues = {
      ...validFormData,
      kind: 'alert',
      stateTransition: { pendingCount: 3, pendingTimeframe: '10m' },
    };

    await act(async () => {
      result.current.updateRule(formData);
    });

    await waitFor(() => {
      const body = getLastPatchedBody(http);
      expect(body.state_transition).toEqual({
        pending_count: 3,
        pending_timeframe: '10m',
      });
    });
  });

  it('nullifies state_transition for signal kind even when stateTransition is provided', async () => {
    const { http, result } = setupUseUpdateRule();

    http.patch.mockResolvedValue({ id: ruleId, metadata: { name: 'Signal Rule' } });

    const formData: FormValues = {
      ...validFormData,
      kind: 'signal',
      stateTransition: { pendingCount: 3, pendingTimeframe: '10m' },
    };

    await act(async () => {
      result.current.updateRule(formData);
    });

    await waitFor(() => {
      const body = getLastPatchedBody(http);
      // signal kind → mapStateTransition returns undefined → coerced to null
      expect(body.state_transition).toBeNull();
    });
  });

  it('shows success toast and calls onSuccess callback on successful update', async () => {
    const { http, notifications, onSuccess, result } = setupUseUpdateRule();

    http.patch.mockResolvedValue({ id: ruleId, metadata: { name: 'My Updated Rule' } });

    await act(async () => {
      result.current.updateRule(validFormData, { onSuccess });
    });

    await waitFor(() => {
      expect(notifications.toasts.addSuccess).toHaveBeenCalledWith(
        "Rule 'My Updated Rule' was updated successfully"
      );
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it('shows error toast on failure and does not call onSuccess', async () => {
    const { http, notifications, onSuccess, result } = setupUseUpdateRule();

    http.patch.mockRejectedValue({
      body: { message: 'Conflict' },
      message: 'Conflict',
    });

    await act(async () => {
      result.current.updateRule(validFormData, { onSuccess });
    });

    await waitFor(() => {
      expect(notifications.toasts.addDanger).toHaveBeenCalledWith('Error updating rule: Conflict');
      expect(onSuccess).not.toHaveBeenCalled();
    });
  });

  it('works without an onSuccess callback', async () => {
    const http = httpServiceMock.createStartContract();
    const notifications = notificationServiceMock.createStartContract();

    http.patch.mockResolvedValue({ id: ruleId, metadata: { name: 'Test Rule' } });

    const { result } = renderHook(
      () =>
        useUpdateRule({
          http,
          notifications,
          ruleId,
        }),
      { wrapper: createQueryClientWrapper() }
    );

    await act(async () => {
      result.current.updateRule(validFormData);
    });

    await waitFor(() => {
      expect(notifications.toasts.addSuccess).toHaveBeenCalled();
      // No onSuccess callback — should not throw
    });
  });
});
