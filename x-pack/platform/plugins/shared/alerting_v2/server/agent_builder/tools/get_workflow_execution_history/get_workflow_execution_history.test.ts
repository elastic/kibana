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
import { ExecutionStatus } from '@kbn/workflows';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { PrivilegeChecker } from '../../../lib/services/privilege_checker/privilege_checker';
import {
  getWorkflowExecutionHistoryTool,
  getWorkflowExecutionHistoryToolId,
} from './get_workflow_execution_history';

type WorkflowApi = WorkflowsServerPluginSetup['management'];

describe('getWorkflowExecutionHistoryTool', () => {
  let loggerService: ReturnType<typeof createLoggerService>['loggerService'];
  let mockLogger: ReturnType<typeof createLoggerService>['mockLogger'];
  let getWorkflowExecution: jest.Mock;
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
    getWorkflowExecution = jest.fn();
  });

  const createTool = (canReadResult: boolean = true) => {
    return getWorkflowExecutionHistoryTool({
      attachmentId: 'attach-1',
      policyId: 'policy-1',
      logger: loggerService,
      getWorkflowApi: () => ({ getWorkflowExecution } as unknown as WorkflowApi),
      getPrivilegeChecker: () => createPrivilegeCheckerMock(canReadResult),
    });
  };

  describe('id', () => {
    it('is unique per attachment instance', () => {
      expect(getWorkflowExecutionHistoryToolId('attach-1')).toBe(
        'platform.alerting.get_workflow_execution_history.attach-1'
      );
      expect(createTool().id).toBe(getWorkflowExecutionHistoryToolId('attach-1'));
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
    it('returns execution state for each requested ID', async () => {
      getWorkflowExecution.mockResolvedValueOnce({
        id: 'exec-1',
        status: ExecutionStatus.COMPLETED,
        workflowId: 'wf-1',
        startedAt: '2026-08-01T10:00:00.000Z',
        finishedAt: '2026-08-01T10:00:05.000Z',
        workflowDefinition: { name: 'Email Notification' },
        stepExecutions: [],
        error: null,
      });
      getWorkflowExecution.mockResolvedValueOnce(null);

      const tool = createTool();
      const result = await tool.handler(
        { executionIds: ['exec-1', 'exec-2'] },
        agentBuilderMocks.tools.createHandlerContext()
      );

      expect(getWorkflowExecution).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        results: [
          {
            type: ToolResultType.other,
            data: {
              policyId: 'policy-1',
              executions: [
                expect.objectContaining({
                  execution_id: 'exec-1',
                  status: ExecutionStatus.COMPLETED,
                  workflow_id: 'wf-1',
                  started_at: '2026-08-01T10:00:00.000Z',
                  finished_at: '2026-08-01T10:00:05.000Z',
                  workflow_name: 'Email Notification',
                }),
                { execution_id: 'exec-2', error: 'Execution not found' },
              ],
            },
          },
        ],
      });
    });

    it('returns an unauthorized error when user lacks Execution history: Read', async () => {
      const tool = createTool(false);
      const result = await tool.handler(
        { executionIds: ['exec-1'] },
        agentBuilderMocks.tools.createHandlerContext()
      );

      expect(getWorkflowExecution).not.toHaveBeenCalled();
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

    it('returns error details when a workflow execution fetch fails', async () => {
      getWorkflowExecution.mockRejectedValueOnce(new Error('not authorized'));

      const tool = createTool();
      const result = await tool.handler(
        { executionIds: ['exec-1'] },
        agentBuilderMocks.tools.createHandlerContext()
      );

      expect(result).toEqual({
        results: [
          {
            type: ToolResultType.other,
            data: {
              policyId: 'policy-1',
              executions: [{ execution_id: 'exec-1', error: 'not authorized' }],
            },
          },
        ],
      });
    });

    it('logs a warning when the entire handler throws', async () => {
      const tool = getWorkflowExecutionHistoryTool({
        attachmentId: 'attach-1',
        policyId: 'policy-1',
        logger: loggerService,
        getWorkflowApi: () => {
          throw new Error('DI failed');
        },
        getPrivilegeChecker: () => createPrivilegeCheckerMock(true),
      });

      const result = await tool.handler(
        { executionIds: ['exec-1'] },
        agentBuilderMocks.tools.createHandlerContext()
      );

      expect(result).toEqual({
        results: [
          {
            type: ToolResultType.error,
            data: {
              message:
                'Failed to fetch workflow execution history for policy "policy-1": DI failed',
            },
          },
        ],
      });
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Failed to fetch workflow execution history',
        expect.objectContaining({
          labels: {
            policy_id: 'policy-1',
            space_id: 'default',
            code: ALERTING_LOG_CODES.AGENT_BUILDER_GET_WORKFLOW_EXECUTION_HISTORY_FAILED,
          },
        })
      );
    });
  });
});
