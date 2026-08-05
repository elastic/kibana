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
import { buildEpisodeQuery, type AlertEpisodeEsqlRow } from '@kbn/alerting-v2-common-queries';
import {
  EPISODE_ATTACHMENT_TYPE,
  episodeAttachmentDataSchema,
  type AlertEpisode,
  type EpisodeAttachmentData,
} from '@kbn/alerting-v2-schemas';
import { normalizeTags } from '@kbn/alerting-v2-utils';
import type { Logger } from '@kbn/core/server';
import { alertEpisodeToEpisodeAttachment } from '../../../common/agent_builder/episode_mappers';
import type { QueryServiceContract } from '../../lib/services/query_service/query_service';

interface CreateEpisodeAttachmentTypeOptions {
  logger: Logger;
  getQueryService: (context: AttachmentFormatContext) => QueryServiceContract;
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

/**
 * Returns the aggregated row for a single episode in the given space, or
 * `undefined` when no such episode exists.
 */
const fetchEpisode = async ({
  queryService,
  spaceId,
  episodeId,
}: {
  queryService: QueryServiceContract;
  spaceId: string;
  episodeId: string;
}): Promise<AlertEpisode | undefined> => {
  const rows = await queryService.executeQueryRows<AlertEpisodeEsqlRow>({
    query: buildEpisodeQuery(spaceId, episodeId).print('basic'),
  });

  const [row] = rows;
  if (!row) {
    return undefined;
  }

  return { ...row, last_tags: normalizeTags(row.last_tags) };
};

export const createEpisodeAttachmentType = ({
  logger,
  getQueryService,
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
      const episode = await fetchEpisode({
        queryService: getQueryService(context),
        spaceId: context.spaceId,
        episodeId,
      });
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
      const episode = await fetchEpisode({
        queryService: getQueryService(context),
        spaceId: context.spaceId,
        episodeId: attachment.origin,
      });
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
