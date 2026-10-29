/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazySchema, z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { getToolResultId } from '@kbn/agent-builder-server';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import { ALERTING_TOOL_IDS } from '@kbn/alerting-v2-constants';
import {
  ruleOperationSchema,
  executeRuleOperations,
  RuleOperationValidationError,
} from '../rule_operations/operations';
import {
  assignRuleId,
  loadRuleAttachment,
  saveRuleAttachment,
  summarizeRuleAttachment,
} from '../rule_operations/rule_attachment';
import { ALERTING_LOG_CODES } from '../../../lib/errors/error_codes';
import type { LoggerServiceContract } from '../../../lib/services/logger_service/logger_service';
import {
  generateCustomRuleWhenToUse,
  generateRuleOperationsUsageList,
} from '../../skills/schema_to_skill_docs';

const draftCustomRuleSchema = lazySchema(() =>
  z.object({
    ruleAttachmentId: z
      .string()
      .optional()
      .describe(
        '(optional) The rule attachment ID to modify. If not provided, a new rule is created.'
      ),
    operations: z.array(ruleOperationSchema).min(1),
  })
);

export interface DraftCustomRuleToolDeps {
  logger: LoggerServiceContract;
}

export const draftCustomRuleTool = ({
  logger,
}: DraftCustomRuleToolDeps): BuiltinSkillBoundedTool<typeof draftCustomRuleSchema> => ({
  id: ALERTING_TOOL_IDS.draftCustomRule,
  type: ToolType.builtin,
  description: `Create or update a custom ES|QL alerting V2 rule in the conversation.

${generateCustomRuleWhenToUse()}

This tool only mutates the rule attachment shown in the conversation. It does
NOT create or modify the underlying Alerting V2 rule (saved object) — for that,
direct the user to the "Create rule" or "Update Rule" button in the rendered
attachment.

Use operations[] to:
${generateRuleOperationsUsageList()}`,
  schema: draftCustomRuleSchema,
  handler: async (
    { ruleAttachmentId: previousAttachmentId, operations },
    { attachments, esClient, spaceId, savedObjectsClient }
  ) => {
    let ruleId: string | undefined;
    try {
      const draft = loadRuleAttachment(attachments, previousAttachmentId);
      ruleId = draft.origin;

      const builderType = draft.data.metadata?.builder?.type;
      if (builderType) {
        throw new RuleOperationValidationError(
          `Rule attachment "${draft.attachmentId}" was authored with the "${builderType}" rule builder, so this tool can't edit it. Use the tools its attachment lists.`
        );
      }

      const {
        data: updatedData,
        queryColumns,
        warnings,
      } = await executeRuleOperations(draft.data, operations, esClient, savedObjectsClient, {
        isNew: draft.isNew,
      });

      const data = assignRuleId(draft, updatedData);
      // Prefer persisted origin; fall back to draft / pre-assigned id (also in tool result).
      ruleId = ruleId ?? data.id;

      const attachment = await saveRuleAttachment(attachments, draft, data);

      logger.debug({
        message: () => (draft.isNew ? 'Rule attachment created' : 'Rule attachment updated'),
        labels: {
          space_id: spaceId,
          ...(ruleId != null ? { rule_id: ruleId } : {}),
        },
      });

      return {
        results: [
          {
            type: ToolResultType.other,
            tool_result_id: getToolResultId(),
            data: {
              ...summarizeRuleAttachment(attachment, data),
              ...(queryColumns ? { queryColumns } : {}),
              ...(warnings && warnings.length > 0 ? { warnings } : {}),
            },
          },
        ],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (error instanceof RuleOperationValidationError) {
        logger.debug({
          message: 'Invalid draft_custom_rule input',
          labels: {
            space_id: spaceId,
            ...(ruleId != null ? { rule_id: ruleId } : {}),
          },
        });
      } else {
        logger.warn({
          message: 'Failed to draft rule',
          code: ALERTING_LOG_CODES.AGENT_BUILDER_DRAFT_CUSTOM_RULE_FAILED,
          labels: {
            space_id: spaceId,
            ...(ruleId != null ? { rule_id: ruleId } : {}),
          },
          error,
        });
      }
      return {
        results: [
          {
            type: ToolResultType.error,
            data: {
              message: `Failed to draft rule: ${message}`,
              metadata: { ruleAttachmentId: previousAttachmentId, operations },
            },
          },
        ],
      };
    }
  },
});
