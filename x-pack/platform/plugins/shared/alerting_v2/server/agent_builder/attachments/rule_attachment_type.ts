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
import Boom from '@hapi/boom';
import { ALERTING_LOG_CODES } from '../../lib/errors/error_codes';
import type { LoggerServiceContract } from '../../lib/services/logger_service/logger_service';
import type { RulesClient } from '../../lib/rules_client';

interface CreateRuleAttachmentTypeOptions {
  logger: LoggerServiceContract;
  getRulesClient: (context: AttachmentResolveContext) => RulesClient;
}

const formatRuleAttachmentDescription = (
  attachmentId: string,
  data: RuleAttachmentData,
  savedObjectId?: string
): string => {
  const isPersisted = Boolean(savedObjectId);
  const status = isPersisted ? (data.enabled ? 'enabled' : 'disabled') : 'proposed (not yet saved)';
  const schedule = data.schedule?.every ? `every ${data.schedule.every}` : 'unknown';

  return [
    `Rule "${data.metadata.name}" (ruleAttachment.id: "${attachmentId}")`,
    ...(savedObjectId ? [`Rule ID: ${savedObjectId}`] : []),
    `Kind: ${data.kind}`,
    `Status: ${status}`,
    `Schedule: ${schedule}`,
    ...(data.metadata.description ? [`Description: ${data.metadata.description}`] : []),
    ...(data.metadata.tags?.length ? [`Tags: ${data.metadata.tags.join(', ')}`] : []),
  ].join('\n');
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
      const isNotFound = Boom.isBoom(error) && error.output.statusCode === 404;
      if (!isNotFound) {
        logger.warn({
          message: 'Failed to resolve rule attachment',
          code: ALERTING_LOG_CODES.AGENT_BUILDER_RULE_RESOLVE_FAILED,
          labels: { rule_id: origin, space_id: context.spaceId },
          error,
        });
      }
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
      if (Date.parse(rule.updated_at) > Date.parse(attachment.origin_snapshot_at)) {
        const latestVersion = getLatestVersion(attachment);
        if (!latestVersion) return false;
        return rule.updated_at !== latestVersion.data.updated_at;
      }
      return false;
    } catch (error) {
      const isNotFound = Boom.isBoom(error) && error.output.statusCode === 404;
      if (!isNotFound) {
        logger.warn({
          message: 'Failed to check rule attachment staleness',
          code: ALERTING_LOG_CODES.AGENT_BUILDER_RULE_STALENESS_CHECK_FAILED,
          labels: { rule_id: attachment.origin, space_id: context.spaceId },
          error,
        });
      }
      return false;
    }
  },

  format: (attachment) => ({
    getRepresentation: () => ({
      type: 'text',
      value: formatRuleAttachmentDescription(attachment.id, attachment.data, attachment.origin),
    }),
  }),

  getAgentDescription: () =>
    `A rule attachment represents an Alerting v2 rule — either a proposed rule (not yet saved) or a saved rule linked via its ID. To create, explain, or modify rules, load the rule-management skill.`,

  getTools: () => [],
});
