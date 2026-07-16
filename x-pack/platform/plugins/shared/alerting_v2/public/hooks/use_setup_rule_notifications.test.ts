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
import { selectRuleSimpleActionPolicies } from '@kbn/alerting-v2-rule-form';
import { ActionPoliciesApi } from '../services/action_policies_api';
import type { RuleApiResponse } from '../services/rules_api';

jest.mock('@kbn/core-di-browser');
jest.mock('@kbn/workflows-ui');
jest.mock('../services/action_policies_api');
jest.mock('@kbn/alerting-v2-rule-form', () => ({
  buildInlineWorkflowYaml: jest.fn().mockReturnValue('workflow: yaml'),
  buildRuleScopedMatcher: jest.fn((ruleId: string) => `rule.id: "${ruleId}"`),
  selectRuleSimpleActionPolicies: jest.fn(() => []),
  getRuleNotificationDraftsQueryKey: jest.fn((ruleId?: string) => [
    'ruleNotificationDrafts',
    ruleId,
  ]),
}));

const mockUseService = useService as jest.MockedFunction<typeof useService>;
const mockCoreStart = CoreStart as jest.MockedFunction<typeof CoreStart>;
const mockSelectRuleSimpleActionPolicies = selectRuleSimpleActionPolicies as jest.MockedFunction<
  typeof selectRuleSimpleActionPolicies
>;

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

const removeQueriesSpy = jest.spyOn(QueryClient.prototype, 'removeQueries');

describe('useSetupRuleNotifications', () => {
  const mockCreateWorkflowFn = jest.fn();
  const mockUpdateWorkflowFn = jest.fn();
  const mockDeleteWorkflowFn = jest.fn();
  const mockCreateActionPolicy = jest.fn();
  const mockGetActionPolicy = jest.fn();
  const mockUpdateActionPolicy = jest.fn();
  const mockDeleteActionPolicy = jest.fn();
  const mockMatchActionPoliciesForRule = jest.fn();
  const mockAddSuccess = jest.fn();
  const mockAddError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockSelectRuleSimpleActionPolicies.mockReturnValue([]);
    mockMatchActionPoliciesForRule.mockResolvedValue({ items: [] });

    mockCoreStart.mockImplementation((key: string) => key as ReturnType<typeof CoreStart>);

    mockUseService.mockImplementation((service: unknown) => {
      if (service === WorkflowApi) {
        return {
          createWorkflow: mockCreateWorkflowFn,
          updateWorkflow: mockUpdateWorkflowFn,
          deleteWorkflow: mockDeleteWorkflowFn,
        } as ReturnType<typeof useService>;
      }
      if (service === ActionPoliciesApi) {
        return {
          createActionPolicy: mockCreateActionPolicy,
          getActionPolicy: mockGetActionPolicy,
          updateActionPolicy: mockUpdateActionPolicy,
          deleteActionPolicy: mockDeleteActionPolicy,
          matchActionPoliciesForRule: mockMatchActionPoliciesForRule,
        } as ReturnType<typeof useService>;
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

  describe('reconcile (edit) mode', () => {
    it('does not create/update/delete or toast when nothing changed', async () => {
      const { result } = renderHook(() => useSetupRuleNotifications(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ rule: mockRule, actions: [], onUpdate: true });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockMatchActionPoliciesForRule).toHaveBeenCalledWith('rule-1');
      expect(mockCreateActionPolicy).not.toHaveBeenCalled();
      expect(mockUpdateWorkflowFn).not.toHaveBeenCalled();
      expect(mockDeleteActionPolicy).not.toHaveBeenCalled();
      expect(mockAddSuccess).not.toHaveBeenCalled();
    });

    it('creates only the added draft and leaves hydrated ones untouched', async () => {
      mockCreateWorkflowFn.mockResolvedValue({ id: 'wf-new' });
      mockCreateActionPolicy.mockResolvedValue({});
      mockUpdateWorkflowFn.mockResolvedValue({});
      // The rule already has one inline policy (the hydrated email row).
      mockSelectRuleSimpleActionPolicies.mockReturnValue([
        { policyId: 'p-email', policyVersion: 'v1', workflowId: 'wf-email' },
      ]);

      const hydratedEmail = {
        ...emailAction,
        id: 'wf-email',
        origin: { policyId: 'p-email', policyVersion: 'v1', workflowId: 'wf-email' },
      };

      const { result } = renderHook(() => useSetupRuleNotifications(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        rule: mockRule,
        actions: [hydratedEmail, slackAction],
        onUpdate: true,
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Added slack draft is created; hydrated email is updated in place, not
      // re-created; nothing is deleted (the email row was kept).
      expect(mockCreateWorkflowFn).toHaveBeenCalledTimes(1);
      expect(mockCreateActionPolicy).toHaveBeenCalledTimes(1);
      expect(mockUpdateWorkflowFn).toHaveBeenCalledWith('wf-email', { yaml: expect.any(String) });
      expect(mockDeleteActionPolicy).not.toHaveBeenCalled();
    });

    it('deletes the policy when a hydrated row is removed', async () => {
      mockDeleteActionPolicy.mockResolvedValue(undefined);
      mockSelectRuleSimpleActionPolicies.mockReturnValue([
        { policyId: 'p-email', policyVersion: 'v1', workflowId: 'wf-email' },
      ]);

      const { result } = renderHook(() => useSetupRuleNotifications(), {
        wrapper: createWrapper(),
      });

      // The user removed every simple action, so `actions` is empty.
      result.current.mutate({ rule: mockRule, actions: [], onUpdate: true });

      await waitFor(() => {
        expect(mockDeleteActionPolicy).toHaveBeenCalledWith('p-email');
      });
      expect(mockCreateActionPolicy).not.toHaveBeenCalled();
      expect(mockUpdateWorkflowFn).not.toHaveBeenCalled();
      expect(mockAddSuccess).toHaveBeenCalledWith(expect.stringContaining('removed'));
      expect(mockAddSuccess).not.toHaveBeenCalledWith(expect.stringContaining('saved'));
    });

    it('re-points the policy when a hydrated existing-workflow selection changed', async () => {
      mockGetActionPolicy.mockResolvedValue({ id: 'p-wf', version: 'v9' });
      mockUpdateActionPolicy.mockResolvedValue({});
      mockSelectRuleSimpleActionPolicies.mockReturnValue([
        { policyId: 'p-wf', policyVersion: 'v1', workflowId: 'wf-old' },
      ]);

      const changedExisting = {
        id: 'wf-old',
        source: 'existing' as const,
        workflowId: 'wf-new',
        origin: { policyId: 'p-wf', policyVersion: 'v1', workflowId: 'wf-old' },
      };

      const { result } = renderHook(() => useSetupRuleNotifications(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ rule: mockRule, actions: [changedExisting], onUpdate: true });

      await waitFor(() => {
        expect(mockUpdateActionPolicy).toHaveBeenCalledWith('p-wf', {
          version: 'v9',
          destinations: [{ type: 'workflow', id: 'wf-new' }],
        });
      });
      expect(mockDeleteActionPolicy).not.toHaveBeenCalled();
      expect(mockCreateActionPolicy).not.toHaveBeenCalled();
    });
  });

  describe('hydration cache', () => {
    it('drops the rule notification drafts cache on success so re-edits are fresh', async () => {
      mockCreateWorkflowFn.mockResolvedValue({ id: 'wf-new' });
      mockCreateActionPolicy.mockResolvedValue({});

      const { result } = renderHook(() => useSetupRuleNotifications(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ rule: mockRule, actions: [emailAction] });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(removeQueriesSpy).toHaveBeenCalledWith({
        queryKey: ['ruleNotificationDrafts', 'rule-1'],
      });
      expect(removeQueriesSpy).toHaveBeenCalledWith({
        queryKey: ['matchedActionPolicies', 'rule-1'],
      });
    });

    it('drops the cache even when the reconcile fails, since a partial failure still mutates policies', async () => {
      mockCreateWorkflowFn.mockResolvedValue({ id: 'wf-new' });
      mockCreateActionPolicy.mockRejectedValue(new Error('boom'));
      mockDeleteWorkflowFn.mockResolvedValue(undefined);

      const { result } = renderHook(() => useSetupRuleNotifications(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ rule: mockRule, actions: [emailAction] });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(removeQueriesSpy).toHaveBeenCalledWith({
        queryKey: ['ruleNotificationDrafts', 'rule-1'],
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
