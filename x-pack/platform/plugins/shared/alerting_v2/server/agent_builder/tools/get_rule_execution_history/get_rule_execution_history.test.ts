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
import type { EventLogServiceContract } from '../../../lib/services/event_log_service/event_log_service';
import type { PrivilegeChecker } from '../../../lib/services/privilege_checker/privilege_checker';
import type { RuleExecution } from '../../../lib/services/event_log_service/types';
import {
  getRuleExecutionHistoryTool,
  getRuleExecutionHistoryToolId,
} from './get_rule_execution_history';

const createExecution = (overrides: Partial<RuleExecution> = {}): RuleExecution => ({
  id: 'exec-1',
  rule: { id: 'rule-1', version: null },
  spaceId: 'default',
  startedAt: '2026-08-01T10:00:00.000Z',
  endedAt: '2026-08-01T10:00:02.000Z',
  timings: { duration: 2000, scheduledDelay: 100 },
  outcome: 'success',
  reason: null,
  error: null,
  ...overrides,
});

describe('getRuleExecutionHistoryTool', () => {
  let loggerService: ReturnType<typeof createLoggerService>['loggerService'];
  let mockLogger: ReturnType<typeof createLoggerService>['mockLogger'];
  let findRuleExecutions: jest.Mock;
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
    findRuleExecutions = jest.fn();
  });

  const createTool = (canReadResult: boolean = true) => {
    return getRuleExecutionHistoryTool({
      attachmentId: 'attach-1',
      ruleId: 'rule-1',
      logger: loggerService,
      getEventLogService: () => ({ findRuleExecutions } as unknown as EventLogServiceContract),
      getPrivilegeChecker: () => createPrivilegeCheckerMock(canReadResult),
    });
  };

  describe('id', () => {
    it('is unique per attachment instance', () => {
      expect(getRuleExecutionHistoryToolId('attach-1')).toBe(
        'platform.alerting.get_rule_execution_history.attach-1'
      );
      expect(createTool().id).toBe(getRuleExecutionHistoryToolId('attach-1'));
    });
  });

  describe('definition', () => {
    it('is a builtin read-only tool scoped to a specific rule', () => {
      const tool = createTool();
      expect(tool.type).toBe(ToolType.builtin);
      expect(tool.description).toContain('rule-1');
      expect(tool.description).toContain('attach-1');
      expect(tool.description).toContain('read-only');
    });
  });

  describe('handler', () => {
    it('returns paginated execution history for the rule', async () => {
      const executions = [
        createExecution({ id: 'exec-1' }),
        createExecution({
          id: 'exec-2',
          outcome: 'failure',
          error: { message: 'timeout', stackTrace: null },
        }),
      ];
      findRuleExecutions.mockResolvedValueOnce({
        items: executions,
        total: 2,
        page: 1,
        perPage: 10,
      });

      const tool = createTool();
      const result = await tool.handler({}, agentBuilderMocks.tools.createHandlerContext());

      expect(findRuleExecutions).toHaveBeenCalledWith({
        spaceId: 'default',
        ruleIds: ['rule-1'],
        outcomes: undefined,
        from: undefined,
        to: undefined,
        sort: 'startedAt',
        sortOrder: 'desc',
        page: 1,
        perPage: 10,
      });
      expect(result).toEqual({
        results: [
          {
            type: ToolResultType.other,
            data: {
              ruleId: 'rule-1',
              total: 2,
              page: 1,
              perPage: 10,
              executions: [
                {
                  id: 'exec-1',
                  startedAt: '2026-08-01T10:00:00.000Z',
                  endedAt: '2026-08-01T10:00:02.000Z',
                  outcome: 'success',
                  durationMs: 2000,
                  scheduledDelayMs: 100,
                  reason: undefined,
                  error: undefined,
                },
                {
                  id: 'exec-2',
                  startedAt: '2026-08-01T10:00:00.000Z',
                  endedAt: '2026-08-01T10:00:02.000Z',
                  outcome: 'failure',
                  durationMs: 2000,
                  scheduledDelayMs: 100,
                  reason: undefined,
                  error: { message: 'timeout' },
                },
              ],
            },
          },
        ],
      });
    });

    it('passes optional filters to the event log service', async () => {
      findRuleExecutions.mockResolvedValueOnce({
        items: [],
        total: 0,
        page: 2,
        perPage: 5,
      });

      const tool = createTool();
      await tool.handler(
        {
          page: 2,
          perPage: 5,
          from: '2026-08-01T00:00:00.000Z',
          to: '2026-08-02T00:00:00.000Z',
          outcomes: ['failure'],
          sort: 'duration',
          sortOrder: 'asc',
        },
        agentBuilderMocks.tools.createHandlerContext()
      );

      expect(findRuleExecutions).toHaveBeenCalledWith({
        spaceId: 'default',
        ruleIds: ['rule-1'],
        outcomes: ['failure'],
        from: '2026-08-01T00:00:00.000Z',
        to: '2026-08-02T00:00:00.000Z',
        sort: 'duration',
        sortOrder: 'asc',
        page: 2,
        perPage: 5,
      });
    });

    it('returns an unauthorized error when user lacks Execution history: Read', async () => {
      const tool = createTool(false);
      const result = await tool.handler({}, agentBuilderMocks.tools.createHandlerContext());

      expect(findRuleExecutions).not.toHaveBeenCalled();
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
      findRuleExecutions.mockResolvedValueOnce({
        items: [],
        total: 0,
        page: 1,
        perPage: 10,
      });

      const tool = createTool();
      await tool.handler({}, agentBuilderMocks.tools.createHandlerContext());

      expect(canRead).toHaveBeenCalledWith('executionHistory');
    });

    it('returns an error and logs a warning when the event log query fails', async () => {
      findRuleExecutions.mockRejectedValueOnce(new Error('ES unavailable'));

      const tool = createTool();
      const result = await tool.handler({}, agentBuilderMocks.tools.createHandlerContext());

      expect(result).toEqual({
        results: [
          {
            type: ToolResultType.error,
            data: {
              message: 'Failed to fetch execution history for rule "rule-1": ES unavailable',
            },
          },
        ],
      });
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Failed to fetch rule execution history',
        expect.objectContaining({
          labels: {
            rule_id: 'rule-1',
            space_id: 'default',
            code: ALERTING_LOG_CODES.AGENT_BUILDER_GET_RULE_EXECUTION_HISTORY_FAILED,
          },
        })
      );
    });
  });
});
