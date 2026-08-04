/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AttachmentFormatContext,
  BuiltinAttachmentBoundedTool,
} from '@kbn/agent-builder-server/attachments';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { ALERTING_NAMESPACE, RULE_MANAGEMENT_SKILL_ID } from '@kbn/alerting-v2-constants';
import { ruleAttachmentDataSchema } from '@kbn/alerting-v2-schemas';
import type { Logger } from '@kbn/core/server';
import { z } from '@kbn/zod/v4';
import type { RulesClient } from '../../../lib/rules_client';

const getRuleSchema = z.object({});

/** Bounded tool id — unique per attachment instance when multiple episodes are present. */
export const getRuleToolId = (attachmentId: string): string =>
  `${ALERTING_NAMESPACE}.get_rule.${attachmentId}`;

export interface GetRuleToolParams {
  attachmentId: string;
  episodeId: string;
  ruleId: string;
  logger: Logger;
  getRulesClient: (context: AttachmentFormatContext) => RulesClient;
}

export const getRuleTool = ({
  attachmentId,
  episodeId,
  ruleId,
  logger,
  getRulesClient,
}: GetRuleToolParams): BuiltinAttachmentBoundedTool<typeof getRuleSchema> => ({
  id: getRuleToolId(attachmentId),
  type: ToolType.builtin,
  description: `Fetch Alerting v2 rule "${ruleId}" associated with episode "${episodeId}" (attachment "${attachmentId}"), including name, schedule, query, enabled state, and metadata. This tool is read-only. To create, explain, or modify the rule, load the ${RULE_MANAGEMENT_SKILL_ID} skill.`,
  schema: getRuleSchema,
  handler: async (_args, toolContext) => {
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
      logger.warn(`Failed to fetch rule "${ruleId}" for episode "${episodeId}": ${message}`);
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
