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
import { ALERTING_LOG_CODES } from '../../../lib/errors/error_codes';
import type { LoggerServiceContract } from '../../../lib/services/logger_service/logger_service';
import { createAttachmentsClient } from '../../../lib/attachments_client';
import { LinkValidationError } from './link_validation_error';
import { resolveLink } from './resolve_link';
import { LinkRollbackError, saveLink } from './save_link';

const linkRuleAndActionPolicySchema = lazySchema(() =>
  z.object({
    ruleAttachmentId: z
      .string()
      .max(256)
      .describe('The rule attachment ID to link, as returned by `manage_rule`.'),
    policyAttachmentId: z
      .string()
      .max(256)
      .describe('The action policy attachment ID to link, as returned by `manage_action_policy`.'),
  })
);

export interface LinkRuleAndActionPolicyToolDeps {
  logger: LoggerServiceContract;
}

export const linkRuleAndActionPolicyTool = ({
  logger,
}: LinkRuleAndActionPolicyToolDeps): BuiltinSkillBoundedTool<
  typeof linkRuleAndActionPolicySchema
> => ({
  id: ALERTING_TOOL_IDS.linkRuleAndActionPolicy,
  type: ToolType.builtin,
  description: `Link a rule and an action policy so the policy notifies on the rule's alerts.

The tool generates one routing tag and writes it to both the rule attachment
(\`metadata.routing_tags\`) and the action policy attachment (\`matcher.tags\`) in a
single call. Do NOT set these tags by hand. If the policy update fails, the rule
attachment is restored.

This tool only mutates the attachments shown in the conversation. It does NOT save
the underlying rule or action policy: direct the user to the buttons in the rendered
attachments. If the result has \`warnings\`, explain them to the user.`,
  schema: linkRuleAndActionPolicySchema,
  handler: async ({ ruleAttachmentId, policyAttachmentId }, { attachments, spaceId }) => {
    try {
      const attachmentsClient = createAttachmentsClient(attachments);
      const resolved = resolveLink(attachmentsClient, { ruleAttachmentId, policyAttachmentId });
      const { tag, alreadyLinked, warnings } = resolved;
      const saved = alreadyLinked ? undefined : await saveLink(attachmentsClient, resolved);

      logger.debug({
        message: () =>
          alreadyLinked ? 'Rule and action policy already linked' : 'Rule and action policy linked',
        labels: { space_id: spaceId },
      });

      return {
        results: [
          {
            type: ToolResultType.other,
            tool_result_id: getToolResultId(),
            data: {
              tag,
              alreadyLinked,
              ruleAttachment: {
                id: ruleAttachmentId,
                name: resolved.rule.data.metadata?.name,
                ...(saved ? { version: saved.ruleAttachment.current_version ?? 1 } : {}),
              },
              actionPolicyAttachment: {
                id: policyAttachmentId,
                name: resolved.policy.data.name,
                ...(saved ? { version: saved.policyAttachment.current_version ?? 1 } : {}),
              },
              ...(warnings.length > 0 ? { warnings } : {}),
            },
          },
        ],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (error instanceof LinkValidationError) {
        logger.debug({
          message: 'Invalid link_rule_and_action_policy input',
          labels: { space_id: spaceId },
        });
      } else {
        logger.warn({
          message: 'Failed to link rule and action policy',
          code:
            error instanceof LinkRollbackError
              ? ALERTING_LOG_CODES.AGENT_BUILDER_LINK_ROLLBACK_FAILED
              : ALERTING_LOG_CODES.AGENT_BUILDER_LINK_RULE_AND_ACTION_POLICY_FAILED,
          labels: { space_id: spaceId },
          error,
        });
      }
      return {
        results: [
          {
            type: ToolResultType.error,
            data: {
              message: `Failed to link rule and action policy: ${message}`,
              metadata: { ruleAttachmentId, policyAttachmentId },
            },
          },
        ],
      };
    }
  },
});
