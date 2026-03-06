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
  matcher: 'data.severity : "critical"',
  group_by: ['host.name', 'service.name'],
  throttle: { interval: '5m' },
  destinations: [{ type: 'workflow', id: 'workflow-2' }],
  createdBy: 'elastic',
  createdAt: '2026-03-01T10:00:00.000Z',
  updatedBy: 'elastic',
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
        destinations: [{ type: 'workflow', id: 'workflow-1' }],
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
      expect(payload).not.toHaveProperty('group_by');
      expect(payload).not.toHaveProperty('throttle');
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
        matcher: 'data.severity : "critical"',
        groupBy: ['host.name', 'service.name'],
        frequency: { type: 'throttle', interval: '5m' },
        destinations: [{ type: 'workflow', id: 'workflow-2' }],
      });
    });

    it('maps immediate frequency when no throttle is present', () => {
      const policyWithoutThrottle: NotificationPolicyResponse = {
        ...EXISTING_POLICY,
        throttle: undefined,
      };
      const { result } = renderHook(() =>
        useNotificationPolicyForm({
          initialValues: policyWithoutThrottle,
          onSubmitCreate: jest.fn(),
          onSubmitUpdate: jest.fn(),
        })
      );

      expect(result.current.methods.getValues().frequency).toEqual({ type: 'immediate' });
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
        matcher: 'data.severity : "critical"',
        group_by: ['host.name', 'service.name'],
        throttle: { interval: '5m' },
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
