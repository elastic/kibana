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
  EPISODE_ATTACHMENT_TYPE,
  episodeAttachmentDataSchema,
  type EpisodeAttachmentData,
} from '@kbn/alerting-v2-schemas';
import type { Logger } from '@kbn/core/server';
import { alertEpisodeToEpisodeAttachment } from '../../../common/agent_builder/episode_mappers';
import type { EpisodesClient } from '../../lib/episodes_client';

interface CreateEpisodeAttachmentTypeOptions {
  logger: Logger;
  getEpisodesClient: (context: AttachmentResolveContext) => EpisodesClient;
}

const formatEpisodeDescription = (attachmentId: string, data: EpisodeAttachmentData): string => {
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

  return lines.join('\n');
};

export const createEpisodeAttachmentType = ({
  logger,
  getEpisodesClient,
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
      const episode = await getEpisodesClient(context).get(episodeId);
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
      const episode = await getEpisodesClient(context).get(attachment.origin);
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

  format: (attachment) => ({
    getRepresentation: () => ({
      type: 'text',
      value: formatEpisodeDescription(attachment.id, attachment.data),
    }),
  }),

  getAgentDescription: () =>
    `An episode attachment represents an alert episode — a stateful lifecycle of related alert events for a rule and group. It is read-only context: use it to reason about status, timing, severity, tags, assignee, and snooze state of the alert episode the user is viewing.`,

  isReadonly: true,

  getTools: () => [],
});
