/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useSetupRuleNotifications } from './use_setup_rule_notifications';
import { useService, CoreStart } from '@kbn/core-di-browser';
import { WorkflowApi } from '@kbn/workflows-ui';
import { ActionPoliciesApi } from '../services/action_policies_api';
import type { RuleApiResponse } from '../services/rules_api';

jest.mock('@kbn/core-di-browser');
jest.mock('@kbn/workflows-ui');
jest.mock('../services/action_policies_api');
jest.mock('@kbn/alerting-v2-rule-form', () => ({
  buildInlineWorkflowYaml: jest.fn().mockReturnValue('workflow: yaml'),
}));

const mockUseService = useService as jest.MockedFunction<typeof useService>;
const mockCoreStart = CoreStart as jest.MockedFunction<typeof CoreStart>;

const mockRule = {
  id: 'rule-1',
  metadata: { name: 'My Test Rule', description: '', tags: [] },
} as unknown as RuleApiResponse;

const emailAction = {
  id: 'action-email',
  source: 'inline' as const,
  stepType: 'email' as const,
  connectorId: 'connector-1',
  params: '{}',
};

const slackAction = {
  id: 'action-slack',
  source: 'inline' as const,
  stepType: 'slack' as const,
  connectorId: 'connector-2',
  params: 'message: ""',
};

const existingWorkflowAction = {
  id: 'action-wf',
  source: 'existing' as const,
  workflowId: 'workflow-existing-1',
};

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('useSetupRuleNotifications', () => {
  const mockCreateWorkflowFn = jest.fn();
  const mockDeleteWorkflowFn = jest.fn();
  const mockCreateActionPolicy = jest.fn();
  const mockAddSuccess = jest.fn();
  const mockAddError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockCoreStart.mockImplementation((key: string) => key as ReturnType<typeof CoreStart>);

    mockUseService.mockImplementation((service: unknown) => {
      if (service === WorkflowApi) {
        return {
          createWorkflow: mockCreateWorkflowFn,
          deleteWorkflow: mockDeleteWorkflowFn,
        } as ReturnType<typeof useService>;
      }
      if (service === ActionPoliciesApi) {
        return { createActionPolicy: mockCreateActionPolicy } as ReturnType<typeof useService>;
      }
      if (service === 'notifications') {
        return { toasts: { addSuccess: mockAddSuccess, addError: mockAddError } } as ReturnType<
          typeof useService
        >;
      }
      return undefined as ReturnType<typeof useService>;
    });
  });

  describe('empty list', () => {
    it('does nothing and shows no toast when actions is empty', async () => {
      const { result } = renderHook(() => useSetupRuleNotifications(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ rule: mockRule, actions: [] });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockCreateWorkflowFn).not.toHaveBeenCalled();
      expect(mockCreateActionPolicy).not.toHaveBeenCalled();
      expect(mockAddSuccess).not.toHaveBeenCalled();
      expect(mockAddError).not.toHaveBeenCalled();
    });
  });

  describe('single action — inline (create) mode', () => {
    it('creates workflow and action policy for an email action, shows success toast', async () => {
      mockCreateWorkflowFn.mockResolvedValue({ id: 'workflow-new-1' });
      mockCreateActionPolicy.mockResolvedValue({});

      const { result } = renderHook(() => useSetupRuleNotifications(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ rule: mockRule, actions: [emailAction] });

      await waitFor(() => {
        expect(mockCreateWorkflowFn).toHaveBeenCalledWith({ yaml: expect.any(String) });
        expect(mockCreateActionPolicy).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'My Test Rule notifications',
            matcher: 'rule.id: "rule-1"',
            destinations: [{ type: 'workflow', id: 'workflow-new-1' }],
          })
        );
        expect(mockAddSuccess).toHaveBeenCalledWith(expect.stringContaining('1'));
      });
    });

    it('also works for the slack step type', async () => {
      mockCreateWorkflowFn.mockResolvedValue({ id: 'workflow-new-2' });
      mockCreateActionPolicy.mockResolvedValue({});

      const { result } = renderHook(() => useSetupRuleNotifications(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ rule: mockRule, actions: [slackAction] });

      await waitFor(() => {
        expect(mockCreateWorkflowFn).toHaveBeenCalledTimes(1);
        expect(mockCreateActionPolicy).toHaveBeenCalledWith(
          expect.objectContaining({ destinations: [{ type: 'workflow', id: 'workflow-new-2' }] })
        );
      });
    });

    it('rolls back by deleting the workflow when action policy creation fails', async () => {
      mockCreateWorkflowFn.mockResolvedValue({ id: 'workflow-new-1' });
      mockCreateActionPolicy.mockRejectedValue(new Error('action policy failed'));
      mockDeleteWorkflowFn.mockResolvedValue(undefined);

      const { result } = renderHook(() => useSetupRuleNotifications(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ rule: mockRule, actions: [emailAction] });

      await waitFor(() => {
        expect(mockDeleteWorkflowFn).toHaveBeenCalledWith('workflow-new-1');
        expect(mockAddError).toHaveBeenCalled();
        expect(mockAddSuccess).not.toHaveBeenCalled();
      });
    });

    it('shows error toast even when rollback workflow deletion also fails', async () => {
      mockCreateWorkflowFn.mockResolvedValue({ id: 'workflow-new-1' });
      mockCreateActionPolicy.mockRejectedValue(new Error('action policy failed'));
      mockDeleteWorkflowFn.mockRejectedValue(new Error('delete also failed'));

      const { result } = renderHook(() => useSetupRuleNotifications(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ rule: mockRule, actions: [emailAction] });

      await waitFor(() => {
        expect(mockDeleteWorkflowFn).toHaveBeenCalledWith('workflow-new-1');
        expect(mockAddError).toHaveBeenCalled();
        expect(mockAddSuccess).not.toHaveBeenCalled();
      });
    });
  });

  describe('single action — existing workflow reference mode', () => {
    it('uses the existing workflow id and creates action policy, shows success toast', async () => {
      mockCreateActionPolicy.mockResolvedValue({});

      const { result } = renderHook(() => useSetupRuleNotifications(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ rule: mockRule, actions: [existingWorkflowAction] });

      await waitFor(() => {
        expect(mockCreateWorkflowFn).not.toHaveBeenCalled();
        expect(mockCreateActionPolicy).toHaveBeenCalledWith(
          expect.objectContaining({
            destinations: [{ type: 'workflow', id: 'workflow-existing-1' }],
          })
        );
        expect(mockAddSuccess).toHaveBeenCalled();
      });
    });

    it('throws and shows error toast when workflowId is null', async () => {
      const { result } = renderHook(() => useSetupRuleNotifications(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        rule: mockRule,
        actions: [{ id: 'action-x', source: 'existing', workflowId: null }],
      });

      await waitFor(() => {
        expect(mockCreateWorkflowFn).not.toHaveBeenCalled();
        expect(mockCreateActionPolicy).not.toHaveBeenCalled();
        expect(mockAddError).toHaveBeenCalled();
        expect(mockAddSuccess).not.toHaveBeenCalled();
      });
    });
  });

  describe('multiple actions — fan-out', () => {
    it('calls createWorkflow + createActionPolicy for each action in parallel', async () => {
      mockCreateWorkflowFn
        .mockResolvedValueOnce({ id: 'wf-a' })
        .mockResolvedValueOnce({ id: 'wf-b' });
      mockCreateActionPolicy.mockResolvedValue({});

      const { result } = renderHook(() => useSetupRuleNotifications(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ rule: mockRule, actions: [emailAction, slackAction] });

      await waitFor(() => {
        expect(mockCreateWorkflowFn).toHaveBeenCalledTimes(2);
        expect(mockCreateActionPolicy).toHaveBeenCalledTimes(2);
        expect(mockAddSuccess).toHaveBeenCalledWith(expect.stringContaining('2'));
      });
    });

    it('succeeds for passing actions and fails for failing actions (partial success)', async () => {
      mockCreateWorkflowFn
        .mockResolvedValueOnce({ id: 'wf-a' })
        .mockRejectedValueOnce(new Error('slack connector unreachable'));
      mockCreateActionPolicy.mockResolvedValue({});

      const { result } = renderHook(() => useSetupRuleNotifications(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ rule: mockRule, actions: [emailAction, slackAction] });

      await waitFor(() => {
        expect(mockCreateActionPolicy).toHaveBeenCalledTimes(1);
        expect(mockAddError).toHaveBeenCalled();
        expect(mockAddSuccess).not.toHaveBeenCalled();
      });
    });

    it('includes an existing workflow action alongside inline actions', async () => {
      mockCreateWorkflowFn.mockResolvedValue({ id: 'wf-new' });
      mockCreateActionPolicy.mockResolvedValue({});

      const { result } = renderHook(() => useSetupRuleNotifications(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ rule: mockRule, actions: [emailAction, existingWorkflowAction] });

      await waitFor(() => {
        expect(mockCreateWorkflowFn).toHaveBeenCalledTimes(1);
        expect(mockCreateActionPolicy).toHaveBeenCalledTimes(2);
        expect(mockAddSuccess).toHaveBeenCalledWith(expect.stringContaining('2'));
      });
    });
  });

  describe('error handling', () => {
    it('calls addError with an Error instance on single failure', async () => {
      mockCreateWorkflowFn.mockResolvedValue({ id: 'workflow-new-1' });
      mockCreateActionPolicy.mockRejectedValue(new Error('generic failure'));
      mockDeleteWorkflowFn.mockResolvedValue(undefined);

      const { result } = renderHook(() => useSetupRuleNotifications(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ rule: mockRule, actions: [emailAction] });

      await waitFor(() => {
        expect(mockAddError).toHaveBeenCalledWith(
          expect.any(Error),
          expect.objectContaining({ title: expect.any(String) })
        );
      });
    });
  });
});
