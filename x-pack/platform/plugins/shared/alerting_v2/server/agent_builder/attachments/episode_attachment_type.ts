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
import { ToolType } from '@kbn/agent-builder-common';
import { getLatestVersion, type VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { ALERTING_NAMESPACE, RULE_MANAGEMENT_SKILL_ID } from '@kbn/alerting-v2-constants';
import {
  EPISODE_ATTACHMENT_TYPE,
  episodeAttachmentDataSchema,
  ruleAttachmentDataSchema,
  type EpisodeAttachmentData,
} from '@kbn/alerting-v2-schemas';
import type { Logger } from '@kbn/core/server';
import { z } from '@kbn/zod/v4';
import { alertEpisodeToEpisodeAttachment } from '../../../common/agent_builder/episode_mappers';
import type { EpisodesClient } from '../../lib/episodes_client';
import type { RulesClient } from '../../lib/rules_client';

interface CreateEpisodeAttachmentTypeOptions {
  logger: Logger;
  getEpisodesClient: (context: AttachmentFormatContext) => EpisodesClient;
  getRulesClient: (context: AttachmentFormatContext) => RulesClient;
}

/** Bounded tool ids — unique per attachment instance when multiple episodes are present. */
export const refreshEpisodeToolId = (attachmentId: string): string =>
  `${ALERTING_NAMESPACE}.refresh_episode.${attachmentId}`;

export const getRuleToolId = (attachmentId: string): string =>
  `${ALERTING_NAMESPACE}.get_rule.${attachmentId}`;

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
    `Use the ${ruleToolId} tool to fetch the Alerting v2 rule associated with this episode. To create, explain, or modify that rule, load the ${RULE_MANAGEMENT_SKILL_ID} skill.`
  );

  return lines.join('\n');
};

export const createEpisodeAttachmentType = ({
  logger,
  getEpisodesClient,
  getRulesClient,
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
      const client = getEpisodesClient(context);
      const episode = await client.get(episodeId);
      if (!episode) {
        return undefined;
      }
      return episodeAttachmentDataSchema.parse(alertEpisodeToEpisodeAttachment(episode));
    } catch (error) {
      logger.warn(`Failed to resolve episode attachment for origin "${episodeId}": ${error}`);
      return undefined;
    }
  },

  isStale: async (
    attachment: VersionedAttachment<typeof EPISODE_ATTACHMENT_TYPE, EpisodeAttachmentData>,
    context: AttachmentResolveContext
  ): Promise<boolean> => {
    if (!attachment.origin || !attachment.origin_snapshot_at) {
      return false;
    }
    try {
      const client = getEpisodesClient(context);
      const episode = await client.get(attachment.origin);
      if (!episode) {
        return false;
      }
      if (Date.parse(episode.last_timestamp) > Date.parse(attachment.origin_snapshot_at)) {
        const latestVersion = getLatestVersion(attachment);
        if (!latestVersion) return false;
        return episode.last_timestamp !== latestVersion.data.last_timestamp;
      }
      return false;
    } catch (error) {
      logger.warn(
        `Failed to check staleness for episode attachment "${attachment.origin}": ${error}`
      );
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
        {
          id: refreshToolId,
          type: ToolType.builtin,
          description: `Refresh alert episode "${episodeId}" (attachment "${attachment.id}") with the latest status, timestamps, severity, tags, assignee, and snooze state from Elasticsearch. Call when the snapshot may be outdated or the user asks about current episode state.`,
          schema: z.object({}),
          handler: async (_args, toolContext) => {
            try {
              const client = getEpisodesClient({
                request: toolContext.request,
                spaceId: toolContext.spaceId,
              });
              const episode = await client.get(episodeId);
              if (!episode) {
                return {
                  results: [
                    {
                      type: ToolResultType.error,
                      data: {
                        message: `Episode "${episodeId}" not found`,
                      },
                    },
                  ],
                };
              }

              const data = episodeAttachmentDataSchema.parse(
                alertEpisodeToEpisodeAttachment(episode)
              );

              return {
                results: [
                  {
                    type: ToolResultType.other,
                    data,
                  },
                ],
              };
            } catch (error) {
              const message = error instanceof Error ? error.message : String(error);
              logger.warn(`Failed to refresh episode "${episodeId}": ${message}`);
              return {
                results: [
                  {
                    type: ToolResultType.error,
                    data: {
                      message: `Failed to refresh episode "${episodeId}": ${message}`,
                    },
                  },
                ],
              };
            }
          },
        },
        {
          id: ruleToolId,
          type: ToolType.builtin,
          description: `Fetch Alerting v2 rule "${ruleId}" associated with episode "${episodeId}" (attachment "${attachment.id}"), including name, schedule, query, enabled state, and metadata. This tool is read-only. To create, explain, or modify the rule, load the ${RULE_MANAGEMENT_SKILL_ID} skill.`,
          schema: z.object({}),
          handler: async (_args, toolContext) => {
            try {
              const rulesClient = getRulesClient({
                request: toolContext.request,
                spaceId: toolContext.spaceId,
              });
              const rule = await rulesClient.getRule({ id: ruleId });
              const data = ruleAttachmentDataSchema.parse(rule);

              return {
                results: [
                  {
                    type: ToolResultType.other,
                    data,
                  },
                ],
              };
            } catch (error) {
              const message = error instanceof Error ? error.message : String(error);
              logger.warn(
                `Failed to fetch rule "${ruleId}" for episode "${episodeId}": ${message}`
              );
              return {
                results: [
                  {
                    type: ToolResultType.error,
                    data: {
                      message: `Failed to fetch rule "${ruleId}" for episode "${episodeId}": ${message}`,
                    },
                  },
                ],
              };
            }
          },
        },
      ],
    };
  },

  getAgentDescription: () =>
    `An Alerting v2 alert episode attachment — a stateful lifecycle of related alert events for a rule and group. It is read-only snapshot context. Use the attachment-scoped refresh_episode tool when you need the latest episode state, and get_rule to fetch the associated Alerting v2 rule. To create, explain, or modify that rule, load the ${RULE_MANAGEMENT_SKILL_ID} skill.`,

  isReadonly: true,

  getTools: () => [],
});
