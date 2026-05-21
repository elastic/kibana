/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AttachmentTypeDefinition,
  AttachmentResolveContext,
} from '@kbn/agent-builder-server/attachments';
import { getLatestVersion, type VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import {
  RULE_ATTACHMENT_TYPE,
  ruleAttachmentDataSchema,
  type RuleAttachmentData,
} from '@kbn/alerting-v2-schemas';
import type { Logger } from '@kbn/core/server';
import type { RulesClient } from '../../lib/rules_client';

interface CreateRuleAttachmentTypeOptions {
  logger: Logger;
  getRulesClient: (context: AttachmentResolveContext) => RulesClient;
}

const formatRuleAttachmentDescription = (
  attachmentId: string,
  data: RuleAttachmentData
): string => {
  const status = data.id ? (data.enabled ? 'enabled' : 'disabled') : 'proposed (not yet saved)';
  const schedule = data.schedule?.every ? `every ${data.schedule.every}` : 'unknown';

  return `Rule "${data.metadata.name}" (ruleAttachment.id: "${attachmentId}")
Kind: ${data.kind}
Status: ${status}
Schedule: ${schedule}
${data.metadata.description ? `Description: ${data.metadata.description}` : ''}
${data.metadata.tags?.length ? `Tags: ${data.metadata.tags.join(', ')}` : ''}`.trim();
};

export const createRuleAttachmentType = ({
  logger,
  getRulesClient,
}: CreateRuleAttachmentTypeOptions): AttachmentTypeDefinition<
  typeof RULE_ATTACHMENT_TYPE,
  RuleAttachmentData
> => ({
  id: RULE_ATTACHMENT_TYPE,

  validate: (input) => {
    const result = ruleAttachmentDataSchema.safeParse(input);
    if (result.success) {
      return { valid: true, data: result.data };
    }
    return { valid: false, error: result.error.message };
  },

  resolve: async (
    origin: string,
    context: AttachmentResolveContext
  ): Promise<RuleAttachmentData | undefined> => {
    try {
      const rulesClient = getRulesClient(context);
      const rule = await rulesClient.getRule({ id: origin });
      return ruleAttachmentDataSchema.parse(rule);
    } catch (error) {
      logger.warn(`Failed to resolve rule attachment for origin "${origin}": ${error}`);
      return undefined;
    }
  },

  isStale: async (
    attachment: VersionedAttachment<typeof RULE_ATTACHMENT_TYPE, RuleAttachmentData>,
    context: AttachmentResolveContext
  ): Promise<boolean> => {
    if (!attachment.origin || !attachment.origin_snapshot_at) {
      return false;
    }
    try {
      const rulesClient = getRulesClient(context);
      const rule = await rulesClient.getRule({ id: attachment.origin });
      if (Date.parse(rule.updatedAt) > Date.parse(attachment.origin_snapshot_at)) {
        const latestVersion = getLatestVersion(attachment);
        if (!latestVersion) return false;
        return rule.updatedAt !== latestVersion.data.updatedAt;
      }
      return false;
    } catch (error) {
      logger.warn(`Failed to check staleness for rule attachment "${attachment.origin}": ${error}`);
      return false;
    }
  },

  format: (attachment) => ({
    getRepresentation: () => ({
      type: 'text',
      value: formatRuleAttachmentDescription(attachment.id, attachment.data),
    }),
  }),

  getAgentDescription: () =>
    `A rule attachment represents an Alerting v2 rule — either a proposed rule (not yet saved) or a saved rule linked via its ID. To create, explain, or modify rules, load the rule-management skill.`,

  getTools: () => [],
});
