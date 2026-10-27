/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { lazySchema, z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { getToolResultId } from '@kbn/agent-builder-server';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import {
  ALERTING_TOOL_IDS,
  DASHBOARD_ARTIFACT_TYPE,
  RUNBOOK_ARTIFACT_TYPE,
} from '@kbn/alerting-v2-constants';
import {
  ruleOperationSchema,
  executeRuleOperations,
  RuleOperationValidationError,
} from './operations';
import { ALERTING_LOG_CODES } from '../../../lib/errors/error_codes';
import type { LoggerServiceContract } from '../../../lib/services/logger_service/logger_service';
import { generateRuleOperationsUsageList } from '../../skills/schema_to_skill_docs';
import { createAttachmentsClient } from '../../../lib/services/attachments_service';

const manageRuleSchema = lazySchema(() =>
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

export interface ManageRuleToolDeps {
  logger: LoggerServiceContract;
}

export const manageRuleTool = ({
  logger,
}: ManageRuleToolDeps): BuiltinSkillBoundedTool<typeof manageRuleSchema> => ({
  id: ALERTING_TOOL_IDS.manageRule,
  type: ToolType.builtin,
  description: `Create or update an alerting V2 rule in the conversation.

This tool only mutates the rule attachment shown in the conversation. It does
NOT create or modify the underlying Alerting V2 rule (saved object) — for that,
direct the user to the "Create rule" or "Update Rule" button in the rendered
attachment.

Use operations[] to:
${generateRuleOperationsUsageList()}`,
  schema: manageRuleSchema,
  handler: async (
    { ruleAttachmentId: previousAttachmentId, operations },
    { attachments, esClient, spaceId, savedObjectsClient }
  ) => {
    let ruleId: string | undefined;
    try {
      const { rules } = createAttachmentsClient(attachments);
      const draft = rules.getDraft(previousAttachmentId);
      const { isNew, data: currentData } = draft;
      ruleId = draft.origin;

      const {
        data: updatedData,
        queryColumns,
        warnings,
      } = await executeRuleOperations(currentData, operations, esClient, savedObjectsClient, {
        isNew,
      });

      // Pre-assign a stable rule ID so that action policies can reference it
      // via `rule.id` before the rule is persisted. The UI will use this ID
      // when calling PUT /api/alerting/v2/rules/{id} (upsert).
      if (isNew && !updatedData.id) {
        updatedData.id = uuidv4();
      }
      // Prefer persisted origin; fall back to draft / pre-assigned id (also in tool result).
      ruleId = ruleId ?? updatedData.id;

      const dashboards = (updatedData.artifacts ?? [])
        .filter((artifact) => artifact.type === DASHBOARD_ARTIFACT_TYPE)
        .map((artifact) => artifact.data.dashboard_id)
        .filter((dashboardId): dashboardId is string => typeof dashboardId === 'string');
      const runbookAttached = (updatedData.artifacts ?? []).some(
        (artifact) => artifact.type === RUNBOOK_ARTIFACT_TYPE
      );

      const attachment = await rules.saveDraft(draft, updatedData);

      logger.debug({
        message: () => (isNew ? 'Rule attachment created' : 'Rule attachment updated'),
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
              version: attachment.current_version ?? 1,
              ruleAttachment: {
                id: attachment.id,
                ruleId: updatedData.id,
                name: updatedData.metadata?.name,
                kind: updatedData.kind,
                schedule: updatedData.schedule,
                query: updatedData.query,
                time_field: updatedData.time_field,
                recovery: updatedData.recovery,
                no_data: updatedData.no_data,
                ...(dashboards.length > 0 ? { dashboards } : {}),
                ...(runbookAttached ? { runbookAttached: true } : {}),
              },
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
          message: 'Invalid manage_rule input',
          labels: {
            space_id: spaceId,
            ...(ruleId != null ? { rule_id: ruleId } : {}),
          },
        });
      } else {
        logger.warn({
          message: 'Failed to manage rule',
          code: ALERTING_LOG_CODES.AGENT_BUILDER_MANAGE_RULE_FAILED,
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
              message: `Failed to manage rule: ${message}`,
              metadata: { ruleAttachmentId: previousAttachmentId, operations },
            },
          },
        ],
      };
    }
  },
});
