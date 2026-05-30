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
jest.mock('../components/single_step_workflow_form', () => ({
  buildSingleStepWorkflowYaml: jest.fn().mockReturnValue('workflow: yaml'),
}));

const mockUseService = useService as jest.MockedFunction<typeof useService>;
const mockCoreStart = CoreStart as jest.MockedFunction<typeof CoreStart>;

const mockRule = {
  id: 'rule-1',
  metadata: { name: 'My Test Rule', description: '', tags: [] },
} as unknown as RuleApiResponse;

const mockCreateWorkflow = {
  mode: 'create' as const,
  typeId: 'email' as const,
  connectorId: 'connector-1',
  params: '{}',
  name: 'My Workflow',
};

const mockExistingWorkflow = {
  mode: 'existing' as const,
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

    mockCoreStart.mockImplementation((key: string) => key as any);

    mockUseService.mockImplementation((service: unknown) => {
      if (service === WorkflowApi) {
        return {
          createWorkflow: mockCreateWorkflowFn,
          deleteWorkflow: mockDeleteWorkflowFn,
        } as any;
      }
      if (service === ActionPoliciesApi) {
        return { createActionPolicy: mockCreateActionPolicy } as any;
      }
      if (service === 'notifications') {
        return { toasts: { addSuccess: mockAddSuccess, addError: mockAddError } } as any;
      }
      return undefined as any;
    });
  });

  describe('create mode', () => {
    it('creates workflow and action policy, then shows success toast', async () => {
      mockCreateWorkflowFn.mockResolvedValue({ id: 'workflow-new-1' });
      mockCreateActionPolicy.mockResolvedValue({});

      const { result } = renderHook(() => useSetupRuleNotifications(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ rule: mockRule, workflow: mockCreateWorkflow });

      await waitFor(() => {
        expect(mockCreateWorkflowFn).toHaveBeenCalledWith({ yaml: expect.any(String) });
        expect(mockCreateActionPolicy).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'My Test Rule notifications',
            description: 'Notifications for rule "My Test Rule"',
            type: 'single_rule',
            ruleId: 'rule-1',
            destinations: [{ type: 'workflow', id: 'workflow-new-1' }],
          })
        );
        expect(mockAddSuccess).toHaveBeenCalledWith('Notifications configured successfully');
      });
    });

    it('rolls back by deleting the workflow when action policy creation fails', async () => {
      mockCreateWorkflowFn.mockResolvedValue({ id: 'workflow-new-1' });
      mockCreateActionPolicy.mockRejectedValue(new Error('action policy failed'));
      mockDeleteWorkflowFn.mockResolvedValue(undefined);

      const { result } = renderHook(() => useSetupRuleNotifications(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ rule: mockRule, workflow: mockCreateWorkflow });

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

      result.current.mutate({ rule: mockRule, workflow: mockCreateWorkflow });

      await waitFor(() => {
        expect(mockDeleteWorkflowFn).toHaveBeenCalledWith('workflow-new-1');
        expect(mockAddError).toHaveBeenCalled();
        expect(mockAddSuccess).not.toHaveBeenCalled();
      });
    });
  });

  describe('existing mode', () => {
    it('uses the existing workflow id and creates action policy, shows success toast', async () => {
      mockCreateActionPolicy.mockResolvedValue({});

      const { result } = renderHook(() => useSetupRuleNotifications(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ rule: mockRule, workflow: mockExistingWorkflow });

      await waitFor(() => {
        expect(mockCreateWorkflowFn).not.toHaveBeenCalled();
        expect(mockCreateActionPolicy).toHaveBeenCalledWith(
          expect.objectContaining({
            destinations: [{ type: 'workflow', id: 'workflow-existing-1' }],
          })
        );
        expect(mockAddSuccess).toHaveBeenCalledWith('Notifications configured successfully');
      });
    });

    it('shows error toast and does not create action policy when workflowId is null', async () => {
      const { result } = renderHook(() => useSetupRuleNotifications(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        rule: mockRule,
        workflow: { mode: 'existing', workflowId: null },
      });

      await waitFor(() => {
        expect(mockCreateWorkflowFn).not.toHaveBeenCalled();
        expect(mockCreateActionPolicy).not.toHaveBeenCalled();
        expect(mockAddError).toHaveBeenCalled();
        expect(mockAddSuccess).not.toHaveBeenCalled();
      });
    });
  });

  describe('error handling', () => {
    it('calls addError with the original Error instance on failure', async () => {
      mockCreateWorkflowFn.mockResolvedValue({ id: 'workflow-new-1' });
      mockCreateActionPolicy.mockRejectedValue(new Error('generic failure'));
      mockDeleteWorkflowFn.mockResolvedValue(undefined);

      const { result } = renderHook(() => useSetupRuleNotifications(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ rule: mockRule, workflow: mockCreateWorkflow });

      await waitFor(() => {
        expect(mockAddError).toHaveBeenCalledWith(
          expect.any(Error),
          expect.objectContaining({ title: expect.any(String) })
        );
      });
    });
  });
});
