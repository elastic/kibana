/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AttachmentTypeDefinition,
  AttachmentFormatContext,
  AttachmentResolveContext,
} from '@kbn/agent-builder-server/attachments';
import { getLatestVersion, type VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { RULE_MANAGEMENT_SKILL_ID } from '@kbn/alerting-v2-constants';
import {
  EPISODE_ATTACHMENT_TYPE,
  episodeAttachmentDataSchema,
  type EpisodeAttachmentData,
} from '@kbn/alerting-v2-schemas';
import { ALERTING_LOG_CODES } from '../../lib/errors/error_codes';
import type { LoggerServiceContract } from '../../lib/services/logger_service/logger_service';
import { alertEpisodeToEpisodeAttachment } from '../../../common/agent_builder/episode_mappers';
import type { EpisodesClient } from '../../lib/episodes_client';
import type { RulesClient } from '../../lib/rules_client';
import type { PrivilegeChecker } from '../../lib/services/privilege_checker/privilege_checker';
import { getRuleTool, getRuleToolId } from '../tools/get_rule';
import { refreshEpisodeTool, refreshEpisodeToolId } from '../tools/refresh_episode';

interface CreateEpisodeAttachmentTypeOptions {
  logger: LoggerServiceContract;
  getEpisodesClient: (context: AttachmentFormatContext) => EpisodesClient;
  getRulesClient: (context: AttachmentFormatContext) => RulesClient;
  getPrivilegeChecker: (context: {
    request: AttachmentResolveContext['request'];
  }) => PrivilegeChecker;
}

const formatEpisodeDescription = ({
  attachmentId,
  data,
  refreshToolId,
  getRuleToolId: ruleToolId,
}: {
  attachmentId: string;
  data: EpisodeAttachmentData;
  refreshToolId: string;
  getRuleToolId: string;
}): string => {
  const lines = [
    `Alert episode "${data['episode.id']}" (episodeAttachment.id: "${attachmentId}")`,
    `Status: ${data['episode.status']}`,
    `Rule ID: ${data['rule.id']}`,
    `Group hash: ${data.group_hash}`,
    `First seen: ${data.first_timestamp}`,
    `Last seen: ${data.last_timestamp}`,
    `Duration (ms): ${data.duration}`,
  ];

  if (data.triggered_at) {
    lines.push(`Triggered at: ${data.triggered_at}`);
  }
  if (data.severity) {
    lines.push(`Severity: ${data.severity}`);
  }
  if (data.last_ack_action) {
    lines.push(`Ack: ${data.last_ack_action}`);
  }
  if (data.last_assignee_uid) {
    lines.push(`Assignee: ${data.last_assignee_uid}`);
  }
  if (data.last_snooze_action) {
    lines.push(`Snooze: ${data.last_snooze_action}`);
  }
  if (data.snooze_expiry) {
    lines.push(`Snooze expiry: ${data.snooze_expiry}`);
  }
  if (data.last_tags?.length) {
    lines.push(`Tags: ${data.last_tags.join(', ')}`);
  }

  lines.push(
    `Use the ${refreshToolId} tool to refresh this episode with the latest state from Elasticsearch.`
  );
  lines.push(
    `Use the ${ruleToolId} tool to fetch the rule associated with this episode. To modify that rule, or create a new rule, load the ${RULE_MANAGEMENT_SKILL_ID} skill.`
  );

  return lines.join('\n');
};

export const createEpisodeAttachmentType = ({
  logger,
  getEpisodesClient,
  getRulesClient,
  getPrivilegeChecker,
}: CreateEpisodeAttachmentTypeOptions): AttachmentTypeDefinition<
  typeof EPISODE_ATTACHMENT_TYPE,
  EpisodeAttachmentData
> => ({
  id: EPISODE_ATTACHMENT_TYPE,

  validate: (input) => {
    const result = episodeAttachmentDataSchema.safeParse(input);
    if (result.success) {
      return { valid: true, data: result.data };
    }
    return { valid: false, error: result.error.message };
  },

  resolve: async (
    episodeId: string,
    context: AttachmentResolveContext
  ): Promise<EpisodeAttachmentData | undefined> => {
    try {
      const privilegeChecker = getPrivilegeChecker({ request: context.request });
      const canRead = await privilegeChecker.canRead('alerts');
      if (!canRead) {
        logger.debug({
          message: 'Unauthorized to resolve episode attachment',
          labels: { episode_id: episodeId, space_id: context.spaceId },
        });
        return undefined;
      }

      const episode = await getEpisodesClient(context).get(episodeId);
      if (!episode) {
        return undefined;
      }
      return episodeAttachmentDataSchema.parse(alertEpisodeToEpisodeAttachment(episode));
    } catch (error) {
      logger.warn({
        message: 'Failed to resolve episode attachment',
        code: ALERTING_LOG_CODES.AGENT_BUILDER_EPISODE_RESOLVE_FAILED,
        labels: { episode_id: episodeId, space_id: context.spaceId },
        error,
      });
      return undefined;
    }
  },

  isStale: async (
    attachment: VersionedAttachment<typeof EPISODE_ATTACHMENT_TYPE, EpisodeAttachmentData>,
    context: AttachmentResolveContext
  ): Promise<boolean> => {
    if (!attachment.origin) {
      return false;
    }
    try {
      const episode = await getEpisodesClient(context).get(attachment.origin);
      if (!episode) {
        return false;
      }
      const latestVersion = getLatestVersion(attachment);
      if (!latestVersion) return true;
      return episode.last_timestamp !== latestVersion.data.last_timestamp;
    } catch (error) {
      logger.warn({
        message: 'Failed to check episode attachment staleness',
        code: ALERTING_LOG_CODES.AGENT_BUILDER_EPISODE_STALENESS_CHECK_FAILED,
        labels: { episode_id: attachment.origin, space_id: context.spaceId },
        error,
      });
      return false;
    }
  },

  format: (attachment) => {
    const episodeId = attachment.origin ?? attachment.data['episode.id'];
    const ruleId = attachment.data['rule.id'];
    const refreshToolId = refreshEpisodeToolId(attachment.id);
    const ruleToolId = getRuleToolId(attachment.id);

    return {
      getRepresentation: () => ({
        type: 'text',
        value: formatEpisodeDescription({
          attachmentId: attachment.id,
          data: attachment.data,
          refreshToolId,
          getRuleToolId: ruleToolId,
        }),
      }),
      getBoundedTools: () => [
        refreshEpisodeTool({
          attachmentId: attachment.id,
          episodeId,
          logger,
          getEpisodesClient,
          getPrivilegeChecker,
        }),
        getRuleTool({
          attachmentId: attachment.id,
          episodeId,
          ruleId,
          logger,
          getRulesClient,
          getPrivilegeChecker,
        }),
      ],
    };
  },

  getAgentDescription: () =>
    `An alert episode attachment — a stateful lifecycle of related alert events for a rule and group. It is read-only snapshot context. Use the attachment-scoped refresh_episode tool when you need the latest episode state, and get_rule to fetch the associated rule. To create, explain, or modify that rule, load the ${RULE_MANAGEMENT_SKILL_ID} skill.`,

  isReadonly: true,

  getTools: () => [],
});
