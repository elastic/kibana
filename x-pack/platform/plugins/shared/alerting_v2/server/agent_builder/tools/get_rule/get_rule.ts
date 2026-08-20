/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type {
  AttachmentFormatContext,
  BuiltinAttachmentBoundedTool,
} from '@kbn/agent-builder-server/attachments';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { ALERTING_NAMESPACE, RULE_MANAGEMENT_SKILL_ID } from '@kbn/alerting-v2-constants';
import { ruleAttachmentDataSchema } from '@kbn/alerting-v2-schemas';
import { z } from '@kbn/zod/v4';
import { ensureToolPrivilege } from '../../common/unauthorized_tool_result';
import { ALERTING_LOG_CODES } from '../../../lib/errors/error_codes';
import type { RulesClient } from '../../../lib/rules_client';
import type { LoggerServiceContract } from '../../../lib/services/logger_service/logger_service';
import type { PrivilegeChecker } from '../../../lib/services/privilege_checker/privilege_checker';

const getRuleSchema = z.object({});

/** Bounded tool id — unique per attachment instance when multiple episodes are present. */
export const getRuleToolId = (attachmentId: string): string =>
  `${ALERTING_NAMESPACE}.get_rule.${attachmentId}`;

export interface GetRuleToolParams {
  attachmentId: string;
  episodeId: string;
  ruleId: string;
  logger: LoggerServiceContract;
  getRulesClient: (context: AttachmentFormatContext) => RulesClient;
  getPrivilegeChecker: (context: {
    request: AttachmentFormatContext['request'];
  }) => PrivilegeChecker;
}

export const getRuleTool = ({
  attachmentId,
  episodeId,
  ruleId,
  logger,
  getRulesClient,
  getPrivilegeChecker,
}: GetRuleToolParams): BuiltinAttachmentBoundedTool<typeof getRuleSchema> => ({
  id: getRuleToolId(attachmentId),
  type: ToolType.builtin,
  description: `Fetch the platform alert rule "${ruleId}" associated with episode "${episodeId}" (attachment "${attachmentId}"), including name, schedule, query, source indices, enabled state, and metadata. This is not a Security/SIEM detection rule. This tool is read-only. To create, explain, or modify the rule, load the ${RULE_MANAGEMENT_SKILL_ID} skill.`,
  schema: getRuleSchema,
  handler: async (_args, toolContext) => {
    const unauthorized = await ensureToolPrivilege({
      privilegeChecker: getPrivilegeChecker({ request: toolContext.request }),
      feature: 'rules',
      level: 'read',
      action: 'fetch rule for episode',
    });
    if (unauthorized) {
      return unauthorized;
    }

    try {
      const rulesClient = getRulesClient({
        request: toolContext.request,
        spaceId: toolContext.spaceId,
      });
      const rule = await rulesClient.getRule({ id: ruleId });
      const data = ruleAttachmentDataSchema.parse(rule);

      return {
        results: [
          {
            type: ToolResultType.other,
            data,
          },
        ],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const isNotFound = Boom.isBoom(error) && error.output.statusCode === 404;
      if (!isNotFound) {
        logger.warn({
          message: 'Failed to fetch rule for episode',
          code: ALERTING_LOG_CODES.AGENT_BUILDER_EPISODE_GET_RULE_FAILED,
          labels: {
            rule_id: ruleId,
            episode_id: episodeId,
            space_id: toolContext.spaceId,
          },
          error,
        });
      }
      return {
        results: [
          {
            type: ToolResultType.error,
            data: {
              message: `Failed to fetch rule "${ruleId}" for episode "${episodeId}": ${message}`,
            },
          },
        ],
      };
    }
  },
});
