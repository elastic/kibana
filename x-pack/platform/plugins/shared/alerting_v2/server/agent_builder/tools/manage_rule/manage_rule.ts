/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { getToolResultId } from '@kbn/agent-builder-server';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import type { RuleAttachmentData } from '@kbn/alerting-v2-schemas';
import { RULE_ATTACHMENT_TYPE } from '@kbn/alerting-v2-schemas';
import { alertingTools } from '../../common/constants';
import {
  ruleOperationSchema,
  executeRuleOperations,
  RuleOperationValidationError,
} from './operations';

const manageRuleSchema = z.object({
  ruleAttachmentId: z
    .string()
    .optional()
    .describe(
      '(optional) The rule attachment ID to modify. If not provided, a new rule is created.'
    ),
  operations: z.array(ruleOperationSchema).min(1),
});

export const manageRuleTool = (): BuiltinSkillBoundedTool<typeof manageRuleSchema> => ({
  id: alertingTools.manageRule,
  type: ToolType.builtin,
  description: `Create or update an alerting V2 rule in the conversation.

This tool only mutates the rule attachment shown in the conversation. It does
NOT create or modify the underlying Alerting V2 rule (saved object) — for that,
direct the user to the "Create rule" or "Update Rule" button in the rendered
attachment.

Use operations[] to:
1. set_metadata — set name, description, and tags
2. set_kind — set rule kind (alert | signal)
3. set_schedule — set execution interval and lookback window
4. set_query — set the base ES|QL detection query
5. set_grouping — set fields to group alerts by
6. set_state_transition — set consecutive breaches threshold
7. set_recovery_policy — set recovery detection type and optional query`,
  schema: manageRuleSchema,
  handler: async (
    { ruleAttachmentId: previousAttachmentId, operations },
    { logger, attachments, esClient }
  ) => {
    try {
      const persistedRecord = previousAttachmentId
        ? attachments.getAttachmentRecord(previousAttachmentId)
        : undefined;

      const isNew = !persistedRecord;
      const attachmentId = previousAttachmentId ?? uuidv4();

      const currentData: Partial<RuleAttachmentData> = persistedRecord?.versions.at(-1)?.data ?? {};

      const updatedData = (await executeRuleOperations(currentData, operations, esClient, {
        isNew,
      })) as RuleAttachmentData;

      const attachmentInput = {
        id: attachmentId,
        type: RULE_ATTACHMENT_TYPE,
        description: `Rule: ${updatedData.metadata?.name ?? attachmentId}`,
        data: updatedData,
      };

      const attachment = isNew
        ? await attachments.add(attachmentInput)
        : await attachments.update(attachmentId, {
            data: updatedData,
            description: attachmentInput.description,
          });

      if (!attachment) {
        throw new Error(`Failed to persist rule attachment "${attachmentId}".`);
      }

      logger.debug(
        `Rule attachment ${isNew ? 'created' : 'updated'}: "${updatedData.metadata?.name}"`
      );

      return {
        results: [
          {
            type: ToolResultType.other,
            tool_result_id: getToolResultId(),
            data: {
              version: attachment.current_version ?? 1,
              ruleAttachment: {
                id: attachment.id,
                name: updatedData.metadata?.name,
                kind: updatedData.kind,
                schedule: updatedData.schedule,
                query: updatedData.evaluation?.query?.base,
              },
            },
          },
        ],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (error instanceof RuleOperationValidationError) {
        logger.warn(`manage_rule tool: invalid input — ${message}`);
      } else {
        logger.error(`Error in manage_rule tool: ${message}`);
      }
      return {
        results: [
          {
            type: ToolResultType.error,
            data: {
              message: `Failed to manage rule: ${message}`,
              metadata: { ruleAttachmentId: previousAttachmentId, operations },
            },
          },
        ],
      };
    }
  },
});
