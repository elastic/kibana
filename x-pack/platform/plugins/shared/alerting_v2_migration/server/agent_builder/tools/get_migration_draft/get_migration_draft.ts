/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { v4 as uuidv4 } from 'uuid';
import type { KibanaRequest, Logger } from '@kbn/core/server';
import { lazySchema, z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { getToolResultId } from '@kbn/agent-builder-server';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import type { RulesClient as ClassicRulesClient } from '@kbn/alerting-plugin/server';
import { ALERTING_TOOL_IDS } from '@kbn/alerting-v2-constants';
import { ruleAttachmentDataSchema } from '@kbn/alerting-v2-schemas';
import { createAttachmentsClient } from '../../../lib/attachments_client';
import { MIGRATION_LOG_CODES } from '../../../lib/log_codes';
import { convertClassicRule } from '../../../lib/rule_migration/convert_classic_rule';
import type { RuleMigrationDefinition } from '../../../lib/rule_migration/types';

const getMigrationDraftSchema = lazySchema(() =>
  z.object({
    id: z.string().min(1).max(1024).describe('The id of the classic (v1) alerting rule.'),
  })
);

export interface GetMigrationDraftToolDeps {
  logger: Logger;
  getClassicRulesClient: (request: KibanaRequest) => Promise<Pick<ClassicRulesClient, 'get'>>;
  getMigrationDefinition: (ruleTypeId: string) => RuleMigrationDefinition | undefined;
}

const errorResult = (message: string, statusCode: number) => ({
  results: [
    { type: ToolResultType.error, data: { message, metadata: { status_code: statusCode } } },
  ],
});

export const getMigrationDraftTool = ({
  logger,
  getClassicRulesClient,
  getMigrationDefinition,
}: GetMigrationDraftToolDeps): BuiltinSkillBoundedTool<typeof getMigrationDraftSchema> => ({
  id: ALERTING_TOOL_IDS.getMigrationDraft,
  type: ToolType.builtin,
  description: `Convert a classic (v1) alerting rule into a draft universal alerting rule and add it to the conversation as a rule attachment. Also returns the action policies that would replace the classic rule's actions and the actions that cannot be migrated.

This tool only adds a rule attachment to the conversation. It does NOT create a universal alerting rule or change the classic rule; the user saves the draft with the "Create rule" button in the rendered attachment.

The rule is read with the current user's classic alerting privileges: the user must be able to read rules of the rule's type for its consumer in the current space. Rule types without a registered migration return an error.`,
  schema: getMigrationDraftSchema,
  handler: async ({ id }, { request, spaceId, attachments }) => {
    try {
      const rulesClient = await getClassicRulesClient(request);
      const rule = await rulesClient.get({ id });

      const definition = getMigrationDefinition(rule.alertTypeId);
      if (!definition) {
        return errorResult(
          `Classic rule "${id}" has rule type "${rule.alertTypeId}", which has no migration to universal alerting.`,
          400
        );
      }

      const { rule: draftRule, actionPolicies, skippedActions } = convertClassicRule(
        {
          id: rule.id,
          ruleTypeId: rule.alertTypeId,
          name: rule.name,
          tags: rule.tags,
          schedule: rule.schedule,
          params: rule.params,
          alertDelay: rule.alertDelay,
          actions: rule.actions,
          artifacts: rule.artifacts,
        },
        definition
      );

      // The attachment's "Create rule" button upserts by this id, so it must exist before saving.
      const data = ruleAttachmentDataSchema.parse({ ...draftRule, id: uuidv4() });
      const { rules } = createAttachmentsClient(attachments);
      const attachment = await rules.saveDraft(rules.getDraft(), data);

      return {
        results: [
          {
            type: ToolResultType.other,
            tool_result_id: getToolResultId(),
            data: {
              version: attachment.current_version,
              ruleAttachment: {
                id: attachment.id,
                ruleId: data.id,
                name: data.metadata.name,
                kind: data.kind,
                schedule: data.schedule,
                query: data.query,
                time_field: data.time_field,
              },
              sourceRuleId: rule.id,
              ruleTypeId: rule.alertTypeId,
              actionPolicies,
              skippedActions,
            },
          },
        ],
      };
    } catch (error) {
      if (Boom.isBoom(error) && error.output.statusCode === 403) {
        return errorResult(`Unauthorized to read classic rule "${id}": ${error.message}`, 403);
      }
      if (Boom.isBoom(error) && error.output.statusCode === 404) {
        return errorResult(`Classic rule "${id}" was not found in the current space.`, 404);
      }

      const message = error instanceof Error ? error.message : String(error);
      logger.warn(`Failed to build migration draft: ${message}`, {
        labels: {
          rule_id: id,
          space_id: spaceId,
          code: MIGRATION_LOG_CODES.AGENT_BUILDER_GET_MIGRATION_DRAFT_FAILED,
        },
      });
      return errorResult(`Failed to build a migration draft for classic rule "${id}": ${message}`, 500);
    }
  },
});
