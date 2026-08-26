/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { AttachmentFormatContext } from '@kbn/agent-builder-server/attachments';
import type { BuiltinAttachmentBoundedTool } from '@kbn/agent-builder-server/attachments';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { ALERTING_NAMESPACE } from '@kbn/alerting-v2-constants';
import { ensureToolPrivilege } from '../../common/unauthorized_tool_result';
import type { EventLogServiceContract } from '../../../lib/services/event_log_service/event_log_service';
import type { PrivilegeChecker } from '../../../lib/services/privilege_checker/privilege_checker';
import type { LoggerServiceContract } from '../../../lib/services/logger_service/logger_service';
import { ALERTING_LOG_CODES } from '../../../lib/errors/error_codes';

const DEFAULT_PER_PAGE = 10;

const getRuleExecutionHistorySchema = z.object({
  page: z
    .number()
    .int()
    .min(1)
    .optional()
    .describe('Page number (1-indexed). Defaults to 1.'),
  perPage: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe('Results per page. Defaults to 10.'),
  from: z.string().optional().describe('ISO 8601 start of time range filter.'),
  to: z.string().optional().describe('ISO 8601 end of time range filter.'),
  outcomes: z
    .array(z.enum(['success', 'failure']))
    .optional()
    .describe('Filter by execution outcome.'),
  sort: z
    .enum(['startedAt', 'duration'])
    .optional()
    .describe('Sort field. Defaults to startedAt.'),
  sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort direction. Defaults to desc.'),
});

export const getRuleExecutionHistoryToolId = (attachmentId: string): string =>
  `${ALERTING_NAMESPACE}.get_rule_execution_history.${attachmentId}`;

export interface GetRuleExecutionHistoryToolParams {
  attachmentId: string;
  ruleId: string;
  logger: LoggerServiceContract;
  getEventLogService: () => EventLogServiceContract;
  getPrivilegeChecker: (context: { request: KibanaRequest }) => PrivilegeChecker;
}

export const getRuleExecutionHistoryTool = ({
  attachmentId,
  ruleId,
  logger,
  getEventLogService,
  getPrivilegeChecker,
}: GetRuleExecutionHistoryToolParams): BuiltinAttachmentBoundedTool<
  typeof getRuleExecutionHistorySchema
> => ({
  id: getRuleExecutionHistoryToolId(attachmentId),
  type: ToolType.builtin,
  description:
    `Fetch paginated execution history for the rule "${ruleId}" (attachment "${attachmentId}"). ` +
    'Returns recent runs with outcome (success/failure), duration, timing, and error details. ' +
    'Use to diagnose rule failures, check execution frequency, or summarize recent rule health. ' +
    'This tool is read-only.',
  schema: getRuleExecutionHistorySchema,
  handler: async ({ page, perPage, from, to, outcomes, sort, sortOrder }, toolContext) => {
    const unauthorized = await ensureToolPrivilege({
      privilegeChecker: getPrivilegeChecker({ request: toolContext.request }),
      feature: 'executionHistory',
      level: 'read',
      action: 'fetch rule execution history',
    });
    if (unauthorized) {
      return unauthorized;
    }

    try {
      const eventLogService = getEventLogService();
      const result = await eventLogService.findRuleExecutions({
        spaceId: toolContext.spaceId,
        ruleIds: [ruleId],
        outcomes,
        from,
        to,
        sort: sort ?? 'startedAt',
        sortOrder: sortOrder ?? 'desc',
        page: page ?? 1,
        perPage: perPage ?? DEFAULT_PER_PAGE,
      });

      const executions = result.items.map((item) => ({
        id: item.id,
        startedAt: item.startedAt,
        endedAt: item.endedAt,
        outcome: item.outcome,
        durationMs: item.timings.duration,
        scheduledDelayMs: item.timings.scheduledDelay,
        reason: item.reason ?? undefined,
        error: item.error ? { message: item.error.message } : undefined,
      }));

      return {
        results: [
          {
            type: ToolResultType.other,
            data: {
              ruleId,
              total: result.total,
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
        message: 'Failed to fetch rule execution history',
        code: ALERTING_LOG_CODES.AGENT_BUILDER_GET_RULE_EXECUTION_HISTORY_FAILED,
        labels: {
          rule_id: ruleId,
          space_id: toolContext.spaceId,
        },
        error,
      });
      return {
        results: [
          {
            type: ToolResultType.error,
            data: {
              message: `Failed to fetch execution history for rule "${ruleId}": ${message}`,
            },
          },
        ],
      };
    }
  },
});
