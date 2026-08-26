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
import { ensureToolPrivilege } from '../../common/unauthorized_tool_result';
import type { ActionPolicyExecutionHistoryClient } from '../../../lib/action_policy_execution_history_client';
import type { PrivilegeChecker } from '../../../lib/services/privilege_checker/privilege_checker';
import type { LoggerServiceContract } from '../../../lib/services/logger_service/logger_service';
import { ALERTING_LOG_CODES } from '../../../lib/errors/error_codes';

const DEFAULT_PER_PAGE = 10;

const getActionPolicyExecutionHistorySchema = z.object({
  page: z.number().int().min(1).optional().describe('Page number (1-indexed). Defaults to 1.'),
  perPage: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe('Results per page. Defaults to 10.'),
  startDate: z
    .string()
    .optional()
    .describe('ISO 8601 inclusive lower bound on event timestamp. Defaults to last 24 hours.'),
  outcome: z
    .array(z.enum(['dispatched', 'throttled', 'dispatch_failed']))
    .optional()
    .describe('Filter by dispatch outcome.'),
});

export const getActionPolicyExecutionHistoryToolId = (attachmentId: string): string =>
  `${ALERTING_NAMESPACE}.get_action_policy_execution_history.${attachmentId}`;

export interface GetActionPolicyExecutionHistoryToolParams {
  attachmentId: string;
  policyId: string;
  logger: LoggerServiceContract;
  getExecutionHistoryClient: (context: {
    request: KibanaRequest;
  }) => ActionPolicyExecutionHistoryClient;
  getPrivilegeChecker: (context: { request: KibanaRequest }) => PrivilegeChecker;
}

export const getActionPolicyExecutionHistoryTool = ({
  attachmentId,
  policyId,
  logger,
  getExecutionHistoryClient,
  getPrivilegeChecker,
}: GetActionPolicyExecutionHistoryToolParams): BuiltinAttachmentBoundedTool<
  typeof getActionPolicyExecutionHistorySchema
> => ({
  id: getActionPolicyExecutionHistoryToolId(attachmentId),
  type: ToolType.builtin,
  description:
    `Fetch paginated execution history for action policy "${policyId}" (attachment "${attachmentId}"). ` +
    'Returns recent dispatch events with outcome (dispatched/throttled/dispatch_failed), ' +
    'episode count, matched rules, workflows, and failure details. ' +
    'Use to diagnose notification failures or verify policy dispatch behavior. ' +
    'This tool is read-only.',
  schema: getActionPolicyExecutionHistorySchema,
  handler: async ({ page, perPage, startDate, outcome }, toolContext) => {
    const unauthorized = await ensureToolPrivilege({
      privilegeChecker: getPrivilegeChecker({ request: toolContext.request }),
      feature: 'executionHistory',
      level: 'read',
      action: 'fetch action policy execution history',
    });
    if (unauthorized) {
      return unauthorized;
    }

    try {
      const client = getExecutionHistoryClient({ request: toolContext.request });
      const result = await client.listExecutionHistory({
        request: toolContext.request,
        page: page ?? 1,
        perPage: perPage ?? DEFAULT_PER_PAGE,
        startDate,
        outcome,
        ruleIds: undefined,
        search: policyId,
      });

      const executions = result.items
        .filter((item) => item.policy.id === policyId)
        .map((item) => ({
          dispatchedAt: item.dispatched_at,
          outcome: item.outcome,
          episodeCount: item.episode_count,
          actionGroupCount: item.action_group_count,
          rules: item.rules.map((r) => ({ id: r.id, name: r.name ?? undefined })),
          totalRuleCount: item.total_rule_count,
          workflows: item.workflows.map((w) => ({ id: w.id, name: w.name ?? undefined })),
          failureReason: item.failure_reason,
          error: item.error ? { message: item.error.message } : undefined,
        }));

      return {
        results: [
          {
            type: ToolResultType.other,
            data: {
              policyId,
              total: result.totalEvents,
              page: result.page,
              perPage: result.perPage,
              executions,
            },
          },
        ],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.warn({
        message: 'Failed to fetch action policy execution history',
        code: ALERTING_LOG_CODES.AGENT_BUILDER_GET_ACTION_POLICY_EXECUTION_HISTORY_FAILED,
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
              message: `Failed to fetch execution history for action policy "${policyId}": ${message}`,
            },
          },
        ],
      };
    }
  },
});
