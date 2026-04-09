/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import type { NotificationPolicyResponse } from '@kbn/alerting-v2-schemas';
import { useNotificationPolicyForm } from './use_notification_policy_form';
import { DEFAULT_FORM_STATE } from './constants';

const EXISTING_POLICY: NotificationPolicyResponse = {
  id: 'policy-1',
  version: 'WzEsMV0=',
  name: 'Critical production alerts',
  description: 'Routes critical alerts',
  enabled: true,
  matcher: 'data.severity : "critical"',
  groupBy: ['host.name', 'service.name'],
  tags: ['production'],
  groupingMode: 'per_field',
  throttle: { strategy: 'time_interval', interval: '5m' },
  snoozedUntil: null,
  destinations: [{ type: 'workflow', id: 'workflow-2' }],
  createdBy: 'elastic',
  createdByUsername: 'elastic',
  createdAt: '2026-03-01T10:00:00.000Z',
  updatedBy: 'elastic',
  updatedByUsername: 'elastic',
  updatedAt: '2026-03-01T10:00:00.000Z',
  auth: {
    owner: 'elastic',
    createdByUser: true,
  },
};

describe('useNotificationPolicyForm', () => {
  describe('create mode (no initialValues)', () => {
    it('returns isEditMode as false', () => {
      const { result } = renderHook(() =>
        useNotificationPolicyForm({
          onSubmitCreate: jest.fn(),
          onSubmitUpdate: jest.fn(),
        })
      );

      expect(result.current.isEditMode).toBe(false);
    });

    it('initializes form with DEFAULT_FORM_STATE', () => {
      const { result } = renderHook(() =>
        useNotificationPolicyForm({
          onSubmitCreate: jest.fn(),
          onSubmitUpdate: jest.fn(),
        })
      );

      expect(result.current.methods.getValues()).toEqual(DEFAULT_FORM_STATE);
    });

    it('calls onSubmitCreate with the create payload on submit', async () => {
      const onSubmitCreate = jest.fn();
      const { result } = renderHook(() =>
        useNotificationPolicyForm({
          onSubmitCreate,
          onSubmitUpdate: jest.fn(),
        })
      );

      await act(async () => {
        result.current.methods.setValue('name', 'My policy');
        result.current.methods.setValue('description', 'A description');
      });

      await act(async () => {
        await result.current.handleSubmit();
      });

      expect(onSubmitCreate).toHaveBeenCalledTimes(1);
      expect(onSubmitCreate).toHaveBeenCalledWith({
        name: 'My policy',
        description: 'A description',
        groupingMode: 'per_episode',
        throttle: { strategy: 'on_status_change' },
        destinations: [],
      });
    });

    it('omits optional empty fields from the create payload', async () => {
      const onSubmitCreate = jest.fn();
      const { result } = renderHook(() =>
        useNotificationPolicyForm({
          onSubmitCreate,
          onSubmitUpdate: jest.fn(),
        })
      );

      await act(async () => {
        result.current.methods.setValue('name', 'Minimal');
        result.current.methods.setValue('description', 'Desc');
        result.current.methods.setValue('matcher', '');
        result.current.methods.setValue('groupBy', []);
      });

      await act(async () => {
        await result.current.handleSubmit();
      });

      const payload = onSubmitCreate.mock.calls[0][0];
      expect(payload).not.toHaveProperty('matcher');
      expect(payload).not.toHaveProperty('groupBy');
      expect(payload.groupingMode).toBe('per_episode');
      expect(payload.throttle).toEqual({ strategy: 'on_status_change' });
    });
  });

  describe('edit mode (with initialValues)', () => {
    it('returns isEditMode as true', () => {
      const { result } = renderHook(() =>
        useNotificationPolicyForm({
          initialValues: EXISTING_POLICY,
          onSubmitCreate: jest.fn(),
          onSubmitUpdate: jest.fn(),
        })
      );

      expect(result.current.isEditMode).toBe(true);
    });

    it('initializes form with values derived from the existing policy', () => {
      const { result } = renderHook(() =>
        useNotificationPolicyForm({
          initialValues: EXISTING_POLICY,
          onSubmitCreate: jest.fn(),
          onSubmitUpdate: jest.fn(),
        })
      );

      expect(result.current.methods.getValues()).toEqual({
        name: 'Critical production alerts',
        description: 'Routes critical alerts',
        tags: ['production'],
        matcher: 'data.severity : "critical"',
        groupingMode: 'per_field',
        groupBy: ['host.name', 'service.name'],
        throttleStrategy: 'time_interval',
        throttleInterval: '5m',
        destinations: [{ type: 'workflow', id: 'workflow-2' }],
      });
    });

    it('maps default strategy when no throttle is present', () => {
      const policyWithoutThrottle: NotificationPolicyResponse = {
        ...EXISTING_POLICY,
        groupingMode: null,
        throttle: null,
      };
      const { result } = renderHook(() =>
        useNotificationPolicyForm({
          initialValues: policyWithoutThrottle,
          onSubmitCreate: jest.fn(),
          onSubmitUpdate: jest.fn(),
        })
      );

      expect(result.current.methods.getValues().groupingMode).toBe('per_episode');
      expect(result.current.methods.getValues().throttleStrategy).toBe('on_status_change');
    });

    it('calls onSubmitUpdate with id, payload, and version on submit', async () => {
      const onSubmitUpdate = jest.fn();
      const { result } = renderHook(() =>
        useNotificationPolicyForm({
          initialValues: EXISTING_POLICY,
          onSubmitCreate: jest.fn(),
          onSubmitUpdate,
        })
      );

      await act(async () => {
        await result.current.handleSubmit();
      });

      expect(onSubmitUpdate).toHaveBeenCalledTimes(1);
      expect(onSubmitUpdate).toHaveBeenCalledWith('policy-1', {
        version: 'WzEsMV0=',
        name: 'Critical production alerts',
        description: 'Routes critical alerts',
        groupingMode: 'per_field',
        tags: ['production'],
        matcher: 'data.severity : "critical"',
        groupBy: ['host.name', 'service.name'],
        throttle: { strategy: 'time_interval', interval: '5m' },
        destinations: [{ type: 'workflow', id: 'workflow-2' }],
      });
    });

    it('does not call onSubmitCreate in edit mode', async () => {
      const onSubmitCreate = jest.fn();
      const { result } = renderHook(() =>
        useNotificationPolicyForm({
          initialValues: EXISTING_POLICY,
          onSubmitCreate,
          onSubmitUpdate: jest.fn(),
        })
      );

      await act(async () => {
        await result.current.handleSubmit();
      });

      expect(onSubmitCreate).not.toHaveBeenCalled();
    });
  });
});
