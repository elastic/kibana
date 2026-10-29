/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazySchema, z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import type { RuleBuilderType } from '@kbn/alerting-v2-rule-builders';
import { ALERTING_LOG_CODES } from '../../../lib/errors/error_codes';
import type { LoggerServiceContract } from '../../../lib/services/logger_service/logger_service';
import { ruleSettingsOperationSchema } from '../rule_operations/operations';
import {
  assignRuleId,
  loadRuleAttachment,
  saveRuleAttachment,
  summarizeRuleAttachment,
} from '../rule_operations/rule_attachment';
import { applyBuilderParams } from './apply_builder_params';
import { describeDraftBuilderRuleTool } from './describe_builder';
import { getDraftBuilderRuleToolId, getDraftBuilderRuleToolName } from './tool_ids';
import { ruleToolErrorResult, ruleToolResult } from './tool_results';

export const MAX_SETTINGS_OPERATIONS = 20;
const MAX_ATTACHMENT_ID_LENGTH = 256;

export interface BuilderRuleToolDeps {
  logger: LoggerServiceContract;
}

const createDraftBuilderRuleSchema = (builder: RuleBuilderType) =>
  lazySchema(() =>
    z.object({
      ruleAttachmentId: z
        .string()
        .min(1)
        .max(MAX_ATTACHMENT_ID_LENGTH)
        .optional()
        .describe(
          `(optional) A rule attachment to redraft with this builder. Its query, time field, grouping and recovery are regenerated from \`params\`; its other settings are kept. Omit to create a new rule.`
        ),
      params: builder.paramsSchema,
      settings: z
        .array(ruleSettingsOperationSchema)
        .max(MAX_SETTINGS_OPERATIONS)
        .default([])
        .describe('Ordered operations for the settings every rule shares.'),
    })
  );

/** Creates the skill tool that drafts a rule with the given builder, e.g. `draft_threshold_rule`. */
export const draftBuilderRuleTool = (
  builder: RuleBuilderType,
  { logger }: BuilderRuleToolDeps
): BuiltinSkillBoundedTool<ReturnType<typeof createDraftBuilderRuleSchema>> => ({
  id: getDraftBuilderRuleToolId(builder),
  type: ToolType.builtin,
  description: describeDraftBuilderRuleTool(builder),
  schema: createDraftBuilderRuleSchema(builder),
  handler: async (
    { ruleAttachmentId, params, settings },
    { attachments, esClient, savedObjectsClient, spaceId }
  ) => {
    let ruleId: string | undefined;
    try {
      const draft = loadRuleAttachment(attachments, ruleAttachmentId);
      ruleId = draft.origin;

      const result = await applyBuilderParams({
        builder,
        current: draft.data,
        params,
        settings,
        isNew: draft.isNew,
        esClient,
        savedObjectsClient,
      });
      const data = assignRuleId(draft, result.data);
      ruleId = ruleId ?? data.id;
      const attachment = await saveRuleAttachment(attachments, draft, data);

      logger.debug({
        message: () =>
          draft.isNew
            ? `${builder.type} rule attachment created`
            : `${builder.type} rule attachment redrafted`,
        labels: { space_id: spaceId, ...(ruleId != null ? { rule_id: ruleId } : {}) },
      });

      return ruleToolResult({
        ...summarizeRuleAttachment(attachment, data),
        params: result.params,
        ...(result.queryColumns ? { queryColumns: result.queryColumns } : {}),
        ...(result.warnings ? { warnings: result.warnings } : {}),
      });
    } catch (error) {
      return ruleToolErrorResult({
        error,
        logger,
        toolName: getDraftBuilderRuleToolName(builder),
        code: ALERTING_LOG_CODES.AGENT_BUILDER_DRAFT_BUILDER_RULE_FAILED,
        spaceId,
        ruleId,
        metadata: { ruleAttachmentId, params, settings },
      });
    }
  },
});
