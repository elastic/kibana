/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createLoggerService } from '../../../lib/services/logger_service/logger_service.mock';
import { ALERTING_LOG_CODES } from '../../../lib/errors/error_codes';
import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { ToolType } from '@kbn/agent-builder-common';
import type { PolicyExecutionHistoryItem } from '@kbn/alerting-v2-schemas';
import type { ActionPolicyExecutionHistoryClient } from '../../../lib/action_policy_execution_history_client';
import type { PrivilegeChecker } from '../../../lib/services/privilege_checker/privilege_checker';
import {
  getActionPolicyExecutionHistoryTool,
  getActionPolicyExecutionHistoryToolId,
} from './get_action_policy_execution_history';

const createExecutionItem = (
  overrides: Partial<PolicyExecutionHistoryItem> = {}
): PolicyExecutionHistoryItem => ({
  dispatched_at: '2026-08-01T10:00:00.000Z',
  policy: { id: 'policy-1', name: 'My Policy' },
  outcome: 'dispatched',
  episode_count: 3,
  episodes: [{ id: 'ep-1' }, { id: 'ep-2' }, { id: 'ep-3' }],
  action_group_count: 2,
  rules: [{ id: 'rule-1', name: 'CPU Rule' }],
  total_rule_count: 1,
  workflows: [{ id: 'wf-1', name: 'Email Workflow' }],
  ...overrides,
});

describe('getActionPolicyExecutionHistoryTool', () => {
  let loggerService: ReturnType<typeof createLoggerService>['loggerService'];
  let mockLogger: ReturnType<typeof createLoggerService>['mockLogger'];
  let listExecutionHistory: jest.Mock;
  let canRead: jest.Mock;

  const createPrivilegeCheckerMock = (canReadResult: boolean = true) => {
    canRead = jest.fn().mockResolvedValue(canReadResult);
    return {
      canRead,
      canWrite: jest.fn().mockResolvedValue(true),
    } as unknown as PrivilegeChecker;
  };

  beforeEach(() => {
    ({ loggerService, mockLogger } = createLoggerService());
    listExecutionHistory = jest.fn();
  });

  const createTool = (canReadResult: boolean = true) => {
    return getActionPolicyExecutionHistoryTool({
      attachmentId: 'attach-1',
      policyId: 'policy-1',
      logger: loggerService,
      getExecutionHistoryClient: () =>
        ({ listExecutionHistory } as unknown as ActionPolicyExecutionHistoryClient),
      getPrivilegeChecker: () => createPrivilegeCheckerMock(canReadResult),
    });
  };

  describe('id', () => {
    it('is unique per attachment instance', () => {
      expect(getActionPolicyExecutionHistoryToolId('attach-1')).toBe(
        'platform.alerting.get_action_policy_execution_history.attach-1'
      );
      expect(createTool().id).toBe(getActionPolicyExecutionHistoryToolId('attach-1'));
    });
  });

  describe('definition', () => {
    it('is a builtin read-only tool scoped to a specific policy', () => {
      const tool = createTool();
      expect(tool.type).toBe(ToolType.builtin);
      expect(tool.description).toContain('policy-1');
      expect(tool.description).toContain('attach-1');
      expect(tool.description).toContain('read-only');
    });
  });

  describe('handler', () => {
    it('returns paginated execution history for the policy', async () => {
      const items = [
        createExecutionItem(),
        createExecutionItem({
          dispatched_at: '2026-08-01T09:00:00.000Z',
          outcome: 'throttled',
          episode_count: 1,
          episodes: [{ id: 'ep-4' }],
        }),
      ];
      listExecutionHistory.mockResolvedValueOnce({
        items,
        page: 1,
        perPage: 10,
        totalEvents: 2,
        searchMatches: null,
      });

      const tool = createTool();
      const result = await tool.handler({}, agentBuilderMocks.tools.createHandlerContext());

      expect(listExecutionHistory).toHaveBeenCalledWith({
        request: expect.anything(),
        page: 1,
        perPage: 10,
        startDate: undefined,
        outcome: undefined,
        ruleIds: undefined,
        search: 'policy-1',
      });
      expect(result).toEqual({
        results: [
          {
            type: ToolResultType.other,
            data: {
              policyId: 'policy-1',
              total: 2,
              page: 1,
              perPage: 10,
              executions: [
                {
                  dispatchedAt: '2026-08-01T10:00:00.000Z',
                  outcome: 'dispatched',
                  episodeCount: 3,
                  actionGroupCount: 2,
                  rules: [{ id: 'rule-1', name: 'CPU Rule' }],
                  totalRuleCount: 1,
                  workflows: [{ id: 'wf-1', name: 'Email Workflow' }],
                  failureReason: undefined,
                  error: undefined,
                },
                {
                  dispatchedAt: '2026-08-01T09:00:00.000Z',
                  outcome: 'throttled',
                  episodeCount: 1,
                  actionGroupCount: 2,
                  rules: [{ id: 'rule-1', name: 'CPU Rule' }],
                  totalRuleCount: 1,
                  workflows: [{ id: 'wf-1', name: 'Email Workflow' }],
                  failureReason: undefined,
                  error: undefined,
                },
              ],
            },
          },
        ],
      });
    });

    it('passes optional filters to the client', async () => {
      listExecutionHistory.mockResolvedValueOnce({
        items: [],
        page: 2,
        perPage: 5,
        totalEvents: 0,
        searchMatches: null,
      });

      const tool = createTool();
      await tool.handler(
        {
          page: 2,
          perPage: 5,
          startDate: '2026-08-01T00:00:00.000Z',
          outcome: ['dispatch_failed'],
        },
        agentBuilderMocks.tools.createHandlerContext()
      );

      expect(listExecutionHistory).toHaveBeenCalledWith({
        request: expect.anything(),
        page: 2,
        perPage: 5,
        startDate: '2026-08-01T00:00:00.000Z',
        outcome: ['dispatch_failed'],
        ruleIds: undefined,
        search: 'policy-1',
      });
    });

    it('returns an unauthorized error when user lacks Execution history: Read', async () => {
      const tool = createTool(false);
      const result = await tool.handler({}, agentBuilderMocks.tools.createHandlerContext());

      expect(listExecutionHistory).not.toHaveBeenCalled();
      expect(result).toEqual({
        results: [
          {
            type: ToolResultType.error,
            data: {
              message: expect.stringContaining('Missing Kibana privilege'),
              metadata: { missingPrivileges: ['Execution history: Read'] },
            },
          },
        ],
      });
    });

    it('checks executionHistory read privilege before fetching', async () => {
      listExecutionHistory.mockResolvedValueOnce({
        items: [],
        page: 1,
        perPage: 10,
        totalEvents: 0,
        searchMatches: null,
      });

      const tool = createTool();
      await tool.handler({}, agentBuilderMocks.tools.createHandlerContext());

      expect(canRead).toHaveBeenCalledWith('executionHistory');
    });

    it('returns an error and logs a warning when the client fails', async () => {
      listExecutionHistory.mockRejectedValueOnce(new Error('ES unavailable'));

      const tool = createTool();
      const result = await tool.handler({}, agentBuilderMocks.tools.createHandlerContext());

      expect(result).toEqual({
        results: [
          {
            type: ToolResultType.error,
            data: {
              message:
                'Failed to fetch execution history for action policy "policy-1": ES unavailable',
            },
          },
        ],
      });
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Failed to fetch action policy execution history',
        expect.objectContaining({
          labels: {
            policy_id: 'policy-1',
            space_id: 'default',
            code: ALERTING_LOG_CODES.AGENT_BUILDER_GET_ACTION_POLICY_EXECUTION_HISTORY_FAILED,
          },
        })
      );
    });
  });
});
