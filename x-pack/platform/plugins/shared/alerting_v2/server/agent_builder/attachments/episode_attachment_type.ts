/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AttachmentResolveContext,
  AttachmentTypeDefinition,
} from '@kbn/agent-builder-server/attachments';
import { getLatestVersion, type VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import type { Logger } from '@kbn/core/server';
import {
  EPISODE_ATTACHMENT_TYPE,
  episodeAttachmentDataSchema,
  type EpisodeAttachmentData,
} from '@kbn/alerting-v2-schemas';
import type { EpisodesClientContract } from '../../lib/episodes_client';

interface CreateEpisodeAttachmentTypeOptions {
  logger: Logger;
  getEpisodesClient: (context: AttachmentResolveContext) => EpisodesClientContract;
}

const formatDuration = (ms: number): string => {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours < 24) return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
};

export const formatEpisodeAsText = (data: EpisodeAttachmentData): string => {
  const lines = [
    `Alert Episode "${data.episode_id}"`,
    `Status: ${data.episode_status}`,
    `Rule ID: ${data.rule_id}`,
    `Group Hash: ${data.group_hash}`,
    `Duration: ${formatDuration(data.duration)}`,
    `First seen: ${data.first_timestamp}`,
    `Last seen: ${data.last_timestamp}`,
  ];

  if (data.triggered_at) {
    lines.push(`Triggered at: ${data.triggered_at}`);
  }
  if (data.severity) {
    lines.push(`Severity: ${data.severity}`);
  }
  if (data.last_ack_action) {
    lines.push(`Acknowledged: ${data.last_ack_action === 'ack' ? 'yes' : 'no'}`);
  }
  if (data.last_assignee_uid) {
    lines.push(`Assignee: ${data.last_assignee_uid}`);
  }
  if (data.last_snooze_action === 'snooze') {
    lines.push(`Snoozed${data.snooze_expiry ? ` until ${data.snooze_expiry}` : ''}`);
  }

  return lines.join('\n');
};

export const createEpisodeAttachmentType = ({
  logger,
  getEpisodesClient,
}: CreateEpisodeAttachmentTypeOptions): AttachmentTypeDefinition<
  typeof EPISODE_ATTACHMENT_TYPE,
  EpisodeAttachmentData
> => {
  const fetchEpisode = async (
    episodeId: string,
    context: AttachmentResolveContext
  ): Promise<EpisodeAttachmentData | undefined> => {
    const episodesClient = getEpisodesClient(context);
    return episodesClient.get(episodeId);
  };

  return {
    id: EPISODE_ATTACHMENT_TYPE,
    isReadonly: true,

    validate: (input) => {
      const result = episodeAttachmentDataSchema.safeParse(input);
      if (result.success) {
        return { valid: true, data: result.data };
      }
      return { valid: false, error: result.error.message };
    },

    resolve: async (origin, context): Promise<EpisodeAttachmentData | undefined> => {
      try {
        return await fetchEpisode(origin, context);
      } catch (error) {
        logger.warn(`Failed to resolve episode attachment for origin "${origin}": ${error}`);
        return undefined;
      }
    },

    isStale: async (
      attachment: VersionedAttachment<typeof EPISODE_ATTACHMENT_TYPE, EpisodeAttachmentData>,
      context
    ): Promise<boolean> => {
      if (!attachment.origin) {
        return false;
      }

      const latestVersion = getLatestVersion(attachment);
      if (!latestVersion) {
        return false;
      }

      try {
        const latestEpisode = await fetchEpisode(attachment.origin, context);
        return (
          !latestEpisode ||
          latestVersion.data.last_timestamp !== latestEpisode.last_timestamp ||
          latestVersion.data.episode_status !== latestEpisode.episode_status
        );
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
        value: formatEpisodeAsText(attachment.data),
      }),
    }),

    getAgentDescription: () =>
      'An episode attachment represents an alert episode — a lifecycle of a single alert series (group) within a rule, from first breach through recovery. Rendering inline shows a card with status, optional severity / acknowledged / snoozed badges, duration, and rule ID. When an episode attachment is present and you discuss it, emit `<render_attachment id="..." />` using that attachment\'s id (and optional version); without it the user only sees a short text label under "Added".',

    getTools: () => [],
  };
};
