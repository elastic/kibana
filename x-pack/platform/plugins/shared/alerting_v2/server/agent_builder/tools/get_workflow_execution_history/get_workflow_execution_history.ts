/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { BuiltinAttachmentBoundedTool } from '@kbn/agent-builder-server/attachments';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { ALERTING_NAMESPACE } from '@kbn/alerting-v2-constants';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import {
  getExecutionState,
  type WorkflowExecutionState,
} from '@kbn/agent-builder-tools-base/workflows/get_execution_state';
import { ensureToolPrivilege } from '../../common/unauthorized_tool_result';
import type { PrivilegeChecker } from '../../../lib/services/privilege_checker/privilege_checker';
import type { LoggerServiceContract } from '../../../lib/services/logger_service/logger_service';
import { ALERTING_LOG_CODES } from '../../../lib/errors/error_codes';

const getWorkflowExecutionHistorySchema = z.object({
  executionIds: z
    .array(z.string().max(100))
    .min(1)
    .max(10)
    .describe(
      'Workflow execution IDs to fetch status for. Obtain these from action policy execution history or platform.core.list_workflow_executions.'
    ),
});

export const getWorkflowExecutionHistoryToolId = (attachmentId: string): string =>
  `${ALERTING_NAMESPACE}.get_workflow_execution_history.${attachmentId}`;

export interface GetWorkflowExecutionHistoryToolParams {
  attachmentId: string;
  policyId: string;
  logger: LoggerServiceContract;
  getWorkflowApi: () => WorkflowsServerPluginSetup['management'];
  getPrivilegeChecker: (context: { request: KibanaRequest }) => PrivilegeChecker;
}

export const getWorkflowExecutionHistoryTool = ({
  attachmentId,
  policyId,
  logger,
  getWorkflowApi,
  getPrivilegeChecker,
}: GetWorkflowExecutionHistoryToolParams): BuiltinAttachmentBoundedTool<
  typeof getWorkflowExecutionHistorySchema
> => ({
  id: getWorkflowExecutionHistoryToolId(attachmentId),
  type: ToolType.builtin,
  description:
    `Fetch workflow execution results for action policy "${policyId}" (attachment "${attachmentId}"). ` +
    "Given workflow execution IDs (from dispatch history), returns each execution's status " +
    '(completed/failed/running/waiting_for_input), duration, output, and error details. ' +
    'Use to verify whether notifications were actually delivered after dispatch. ' +
    'This tool is read-only.',
  schema: getWorkflowExecutionHistorySchema,
  handler: async ({ executionIds }, toolContext) => {
    const unauthorized = await ensureToolPrivilege({
      privilegeChecker: getPrivilegeChecker({ request: toolContext.request }),
      feature: 'executionHistory',
      level: 'read',
      action: 'fetch workflow execution history',
    });
    if (unauthorized) {
      return unauthorized;
    }

    try {
      const workflowApi = getWorkflowApi();
      const results = await Promise.allSettled(
        executionIds.map((executionId) =>
          getExecutionState({
            executionId,
            spaceId: toolContext.spaceId,
            workflowApi,
          })
        )
      );

      const executions: Array<WorkflowExecutionState | { execution_id: string; error: string }> =
        results.map((result, idx) => {
          if (result.status === 'fulfilled' && result.value) {
            return result.value;
          }
          if (result.status === 'rejected') {
            const message =
              result.reason instanceof Error ? result.reason.message : String(result.reason);
            return { execution_id: executionIds[idx], error: message };
          }
          return { execution_id: executionIds[idx], error: 'Execution not found' };
        });

      return {
        results: [
          {
            type: ToolResultType.other,
            data: {
              policyId,
              executions,
            },
          },
        ],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.warn({
        message: 'Failed to fetch workflow execution history',
        code: ALERTING_LOG_CODES.AGENT_BUILDER_GET_WORKFLOW_EXECUTION_HISTORY_FAILED,
        labels: {
          policy_id: policyId,
          space_id: toolContext.spaceId,
        },
        error,
      });
      return {
        results: [
          {
            type: ToolResultType.error,
            data: {
              message: `Failed to fetch workflow execution history for policy "${policyId}": ${message}`,
            },
          },
        ],
      };
    }
  },
});
