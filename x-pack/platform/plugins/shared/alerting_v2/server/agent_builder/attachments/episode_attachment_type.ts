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
import { loadRuleMetadata } from '../common/load_rule_metadata';
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
    'This is a platform alert, not a Security/SIEM detection alert.',
    'Do not use the security alert-analysis skill, detection-rule tools, or .alerts-security.alerts-* indices.',
    `Platform alert episode "${data['episode.id']}" (episodeAttachment.id: "${attachmentId}")`,
    `Status: ${data['episode.status']}`,
  ];

  if (data['episode.label']) {
    lines.push(`Episode label: ${data['episode.label']}`);
  }
  lines.push(
    `Rule ID: ${data['rule.id']}`,
    `Group hash: ${data.group_hash}`,
    `First seen: ${data.first_timestamp}`,
    `Last seen: ${data.last_timestamp}`,
    `Duration (ms): ${data.duration}`
  );

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
    `Use the ${ruleToolId} tool to fetch the alert rule associated with this episode, then query that rule's source indices. To modify that rule, or create a new rule, load the ${RULE_MANAGEMENT_SKILL_ID} skill.`
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
> => {
  const attachmentLogger = logger.withLabels({ attachment_type: EPISODE_ATTACHMENT_TYPE });

  return {
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
          attachmentLogger.debug({
            message: 'Unauthorized to resolve episode attachment',
            labels: { episode_id: episodeId, space_id: context.spaceId },
          });
          return undefined;
        }

        const episode = await getEpisodesClient(context).get(episodeId);
        if (!episode) {
          return undefined;
        }

        const { ruleName, groupingFields } = await loadRuleMetadata(
          getRulesClient(context),
          episode['rule.id'],
          attachmentLogger
        );

        return episodeAttachmentDataSchema.parse(
          alertEpisodeToEpisodeAttachment(episode, { ruleName, groupingFields })
        );
      } catch (error) {
        attachmentLogger.warn({
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
      const latestVersion = getLatestVersion(attachment);
      if (!latestVersion) return true;
      try {
        const episode = await getEpisodesClient(context).get(attachment.origin);
        if (!episode) {
          return false;
        }
        return episode['episode.status'] !== latestVersion.data['episode.status'];
      } catch (error) {
        attachmentLogger.warn({
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
            logger: attachmentLogger,
            getEpisodesClient,
            getRulesClient,
            getPrivilegeChecker,
          }),
          getRuleTool({
            attachmentId: attachment.id,
            episodeId,
            ruleId,
            logger: attachmentLogger,
            getRulesClient,
            getPrivilegeChecker,
          }),
        ],
      };
    },

    getAgentDescription: () =>
      `A platform alert episode attachment — a stateful lifecycle of related alert events for a platform alert rule and group. This is not a Security/SIEM detection alert: do not use the security alert-analysis skill, detection-rule tools, or .alerts-security.alerts-* indices. It is read-only snapshot context. Use the attachment-scoped refresh_episode tool when you need the latest episode state, and get_rule to fetch the associated platform alert rule and its source indices. To create, explain, or modify that rule, load the ${RULE_MANAGEMENT_SKILL_ID} skill.`,

    isReadonly: true,

    getTools: () => [],
  };
};
