/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import type { ActionPolicyResponse } from '@kbn/alerting-v2-schemas';
import { useActionPolicyForm } from './use_action_policy_form';
import { DEFAULT_FORM_STATE } from './constants';

jest.mock('@kbn/alerting-v2-rule-form', () => ({
  isActionValid: (action: {
    source: 'existing' | 'inline';
    workflowId?: string | null;
    connectorId?: string | null;
    params?: string;
  }) =>
    action.source === 'existing'
      ? Boolean(action.workflowId)
      : action.connectorId != null && (action.params ?? '').trim() !== '',
}));

const EXISTING_POLICY: ActionPolicyResponse = {
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
  createdAt: '2026-03-01T10:00:00.000Z',
  updatedBy: 'elastic',
  updatedAt: '2026-03-01T10:00:00.000Z',
  auth: {
    owner: 'elastic',
    createdByUser: true,
  },
};

describe('useActionPolicyForm', () => {
  describe('create mode (no initialValues)', () => {
    it('returns isEditMode as false', () => {
      const { result } = renderHook(() =>
        useActionPolicyForm({
          onSubmitCreate: jest.fn(),
          onSubmitUpdate: jest.fn(),
        })
      );

      expect(result.current.isEditMode).toBe(false);
    });

    it('initializes form with DEFAULT_FORM_STATE', () => {
      const { result } = renderHook(() =>
        useActionPolicyForm({
          onSubmitCreate: jest.fn(),
          onSubmitUpdate: jest.fn(),
        })
      );

      expect(result.current.methods.getValues()).toEqual(DEFAULT_FORM_STATE);
    });

    it('calls onSubmitCreate with the raw form values on submit', async () => {
      const onSubmitCreate = jest.fn();
      const { result } = renderHook(() =>
        useActionPolicyForm({
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
        tags: [],
        matcher: '',
        groupingMode: 'per_episode',
        groupBy: [],
        throttleStrategy: 'on_status_change',
        throttleInterval: '',
        destinations: [],
        inlineActions: [],
      });
    });
  });

  describe('submit gating (isSubmitEnabled)', () => {
    it('is disabled without a name or destination', () => {
      const { result } = renderHook(() =>
        useActionPolicyForm({ onSubmitCreate: jest.fn(), onSubmitUpdate: jest.fn() })
      );

      expect(result.current.isSubmitEnabled).toBe(false);
    });

    it('is enabled with only a valid inline action and no existing destinations', async () => {
      const { result } = renderHook(() =>
        useActionPolicyForm({ onSubmitCreate: jest.fn(), onSubmitUpdate: jest.fn() })
      );

      await act(async () => {
        result.current.methods.setValue('name', 'Inline only');
        result.current.methods.setValue('inlineActions', [
          {
            id: 'draft-1',
            source: 'inline',
            stepType: 'slack2.sendMessage',
            connectorId: 'connector-1',
            params: 'message: hi',
          },
        ]);
      });

      expect(result.current.isSubmitEnabled).toBe(true);
    });

    it('is disabled when an inline action is incomplete', async () => {
      const { result } = renderHook(() =>
        useActionPolicyForm({ onSubmitCreate: jest.fn(), onSubmitUpdate: jest.fn() })
      );

      await act(async () => {
        result.current.methods.setValue('name', 'Inline only');
        result.current.methods.setValue('inlineActions', [
          {
            id: 'draft-1',
            source: 'inline',
            stepType: 'slack2.sendMessage',
            connectorId: null,
            params: 'message: ""',
          },
        ]);
      });

      expect(result.current.isSubmitEnabled).toBe(false);
    });
  });

  describe('edit mode (with initialValues)', () => {
    it('returns isEditMode as true', () => {
      const { result } = renderHook(() =>
        useActionPolicyForm({
          initialValues: EXISTING_POLICY,
          onSubmitCreate: jest.fn(),
          onSubmitUpdate: jest.fn(),
        })
      );

      expect(result.current.isEditMode).toBe(true);
    });

    it('initializes form with values derived from the existing policy', () => {
      const { result } = renderHook(() =>
        useActionPolicyForm({
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
        inlineActions: [],
      });
    });

    it('maps default strategy when no throttle is present', () => {
      const policyWithoutThrottle: ActionPolicyResponse = {
        ...EXISTING_POLICY,
        groupingMode: null,
        throttle: null,
      };
      const { result } = renderHook(() =>
        useActionPolicyForm({
          initialValues: policyWithoutThrottle,
          onSubmitCreate: jest.fn(),
          onSubmitUpdate: jest.fn(),
        })
      );

      expect(result.current.methods.getValues().groupingMode).toBe('per_episode');
      expect(result.current.methods.getValues().throttleStrategy).toBe('on_status_change');
    });

    it('calls onSubmitUpdate with id, raw form values, and version on submit', async () => {
      const onSubmitUpdate = jest.fn();
      const { result } = renderHook(() =>
        useActionPolicyForm({
          initialValues: EXISTING_POLICY,
          onSubmitCreate: jest.fn(),
          onSubmitUpdate,
        })
      );

      await act(async () => {
        await result.current.handleSubmit();
      });

      expect(onSubmitUpdate).toHaveBeenCalledTimes(1);
      expect(onSubmitUpdate).toHaveBeenCalledWith(
        'policy-1',
        {
          name: 'Critical production alerts',
          description: 'Routes critical alerts',
          groupingMode: 'per_field',
          tags: ['production'],
          matcher: 'data.severity : "critical"',
          groupBy: ['host.name', 'service.name'],
          throttleStrategy: 'time_interval',
          throttleInterval: '5m',
          destinations: [{ type: 'workflow', id: 'workflow-2' }],
          inlineActions: [],
        },
        'WzEsMV0='
      );
    });

    it('does not call onSubmitCreate in edit mode', async () => {
      const onSubmitCreate = jest.fn();
      const { result } = renderHook(() =>
        useActionPolicyForm({
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
