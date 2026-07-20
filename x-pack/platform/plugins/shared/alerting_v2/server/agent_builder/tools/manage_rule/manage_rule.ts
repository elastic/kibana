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
import { RULE_ATTACHMENT_TYPE, getBreachEsqlQuery } from '@kbn/alerting-v2-schemas';
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
4. set_query — set the rule's detection query plus recovery and no-data strategies. Fields:
   - query (required): two formats supported:
     - composed: required "base" (ES|QL string) + "breach: { segment }", optional "recovery: { segment }" (only when recovery_strategy is "query")
     - standalone: required "breach: { query }", optional "recovery: { query }" (only when recovery_strategy is "query") and "no_data: { query }" (only when no_data_strategy is not "none")
   - recovery_strategy (optional): "no_breach" | "query" | "none" — "no_breach" recovers when breach stops, "query" runs a separate recovery query, "none" disables recovery. Signal rules cannot set this.
   - no_data_strategy (optional): "last_known_status" | "recover" | "none" — controls behaviour when no data is present; requires a "no_data" block in standalone queries. Signal rules cannot set this. ("emit" is not currently accepted by the create/update API — do not use it.)
5. set_grouping — set fields to group alerts by
6. set_state_transition — set consecutive breaches threshold
7. validate — validate the accumulated rule against the API request schema; throws if not ready to save`,
  schema: manageRuleSchema,
  handler: async (
    { ruleAttachmentId: previousAttachmentId, operations },
    { logger, attachments, esClient }
  ) => {
    try {
      const currentAttachment = previousAttachmentId
        ? attachments.getAttachmentRecord(previousAttachmentId)
        : undefined;

      const isNew = !currentAttachment;
      const attachmentId = previousAttachmentId ?? uuidv4();

      const currentData: Partial<RuleAttachmentData> =
        currentAttachment?.versions.at(-1)?.data ?? {};

      const { data: updatedData, queryColumns } = await executeRuleOperations(
        currentData,
        operations,
        esClient,
        { isNew }
      );

      // Pre-assign a stable rule ID so that action policies can reference it
      // via `rule.id` before the rule is persisted. The UI will use this ID
      // when calling PUT /api/alerting/v2/rules/{id} (upsert).
      if (isNew && !updatedData.id) {
        updatedData.id = uuidv4();
      }

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
                ruleId: updatedData.id,
                name: updatedData.metadata?.name,
                kind: updatedData.kind,
                schedule: updatedData.schedule,
                query: updatedData.query ? getBreachEsqlQuery(updatedData.query) : undefined,
              },
              ...(queryColumns ? { queryColumns } : {}),
            },
          },
        ],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (error instanceof RuleOperationValidationError) {
        logger.debug(`manage_rule tool: invalid input — ${message}`);
      } else {
        logger.warn(`Error in manage_rule tool: ${message}`);
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
