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
  ACTION_POLICY_ATTACHMENT_TYPE,
  actionPolicyAttachmentDataSchema,
  type ActionPolicyAttachmentData,
} from '@kbn/alerting-v2-schemas';
import Boom from '@hapi/boom';
import { ALERTING_LOG_CODES } from '../../lib/errors/error_codes';
import type { LoggerServiceContract } from '../../lib/services/logger_service/logger_service';
import type { ActionPolicyClient } from '../../lib/action_policy_client/action_policy_client';

interface CreateActionPolicyAttachmentTypeOptions {
  logger: LoggerServiceContract;
  getActionPolicyClient: (context: AttachmentResolveContext) => ActionPolicyClient;
}

const formatActionPolicyDescription = (
  attachmentId: string,
  data: ActionPolicyAttachmentData
): string => {
  const status = data.id ? (data.enabled ? 'enabled' : 'disabled') : 'proposed (not yet saved)';
  const destinations = data.destinations ?? [];
  const workflowIds = destinations.filter((d) => d.type === 'workflow').map((d) => d.id);
  const destinationSummary =
    workflowIds.length > 0
      ? `${workflowIds.length} workflow(s): ${workflowIds.join(', ')}`
      : 'none';
  const matcherSnippet = data.matcher ? `"${data.matcher}"` : 'match all (catch-all)';
  const grouping = data.grouping_mode ?? 'per_episode';
  const throttle = data.throttle?.strategy ?? 'none';

  return `Action Policy "${data.name}" (actionPolicyAttachment.id: "${attachmentId}")
Status: ${status}
Destinations: ${destinationSummary}
Matcher: ${matcherSnippet}
Grouping: ${grouping}
Throttle: ${throttle}
${data.description ? `Description: ${data.description}` : ''}
${data.tags?.length ? `Tags: ${data.tags.join(', ')}` : ''}`.trim();
};

export const createActionPolicyAttachmentType = ({
  logger,
  getActionPolicyClient,
}: CreateActionPolicyAttachmentTypeOptions): AttachmentTypeDefinition<
  typeof ACTION_POLICY_ATTACHMENT_TYPE,
  ActionPolicyAttachmentData
> => ({
  id: ACTION_POLICY_ATTACHMENT_TYPE,

  validate: (input) => {
    const result = actionPolicyAttachmentDataSchema.safeParse(input);
    if (result.success) {
      return { valid: true, data: result.data };
    }
    return { valid: false, error: result.error.message };
  },

  resolve: async (
    origin: string,
    context: AttachmentResolveContext
  ): Promise<ActionPolicyAttachmentData | undefined> => {
    try {
      const client = getActionPolicyClient(context);
      const policy = await client.getActionPolicy({ id: origin });
      return actionPolicyAttachmentDataSchema.parse(policy);
    } catch (error) {
      const isNotFound = Boom.isBoom(error) && error.output.statusCode === 404;
      if (!isNotFound) {
        logger.warn({
          message: 'Failed to resolve action policy attachment',
          code: ALERTING_LOG_CODES.AGENT_BUILDER_ACTION_POLICY_RESOLVE_FAILED,
          labels: { policy_id: origin, space_id: context.spaceId },
          error,
        });
      }
      return undefined;
    }
  },

  isStale: async (
    attachment: VersionedAttachment<
      typeof ACTION_POLICY_ATTACHMENT_TYPE,
      ActionPolicyAttachmentData
    >,
    context: AttachmentResolveContext
  ): Promise<boolean> => {
    if (!attachment.origin || !attachment.origin_snapshot_at) {
      return false;
    }
    try {
      const client = getActionPolicyClient(context);
      const policy = await client.getActionPolicy({ id: attachment.origin });
      if (Date.parse(policy.updated_at) > Date.parse(attachment.origin_snapshot_at)) {
        const latestVersion = getLatestVersion(attachment);
        if (!latestVersion) return false;
        return policy.updated_at !== latestVersion.data.updated_at;
      }
      return false;
    } catch (error) {
      const isNotFound = Boom.isBoom(error) && error.output.statusCode === 404;
      if (!isNotFound) {
        logger.warn({
          message: 'Failed to check action policy attachment staleness',
          code: ALERTING_LOG_CODES.AGENT_BUILDER_ACTION_POLICY_STALENESS_CHECK_FAILED,
          labels: { policy_id: attachment.origin, space_id: context.spaceId },
          error,
        });
      }
      return false;
    }
  },

  format: (attachment) => ({
    getRepresentation: () => ({
      type: 'text',
      value: formatActionPolicyDescription(attachment.id, attachment.data),
    }),
  }),

  getAgentDescription: () =>
    `An action policy attachment represents an Alerting v2 notification policy — either a proposed policy (not yet saved) or a saved policy linked via its ID. Action policies define how alerts are matched, grouped, and dispatched to workflow destinations. To create, inspect, or modify action policies, load the action-policy-management skill.`,

  getTools: () => [],
});
