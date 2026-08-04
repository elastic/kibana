/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AttachmentFormatContext,
  BuiltinAttachmentBoundedTool,
} from '@kbn/agent-builder-server/attachments';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { ALERTING_NAMESPACE } from '@kbn/alerting-v2-constants';
import { episodeAttachmentDataSchema } from '@kbn/alerting-v2-schemas';
import type { Logger } from '@kbn/core/server';
import { z } from '@kbn/zod/v4';
import { alertEpisodeToEpisodeAttachment } from '../../../../common/agent_builder/episode_mappers';
import type { EpisodesClient } from '../../../lib/episodes_client';

const refreshEpisodeSchema = z.object({});

/** Bounded tool id — unique per attachment instance when multiple episodes are present. */
export const refreshEpisodeToolId = (attachmentId: string): string =>
  `${ALERTING_NAMESPACE}.refresh_episode.${attachmentId}`;

export interface RefreshEpisodeToolParams {
  attachmentId: string;
  episodeId: string;
  logger: Logger;
  getEpisodesClient: (context: AttachmentFormatContext) => EpisodesClient;
}

export const refreshEpisodeTool = ({
  attachmentId,
  episodeId,
  logger,
  getEpisodesClient,
}: RefreshEpisodeToolParams): BuiltinAttachmentBoundedTool<typeof refreshEpisodeSchema> => ({
  id: refreshEpisodeToolId(attachmentId),
  type: ToolType.builtin,
  description: `Refresh alert episode "${episodeId}" (attachment "${attachmentId}") with the latest status, timestamps, severity, tags, assignee, and snooze state from Elasticsearch. Call when the snapshot may be outdated or the user asks about current episode state.`,
  schema: refreshEpisodeSchema,
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

      const data = episodeAttachmentDataSchema.parse(alertEpisodeToEpisodeAttachment(episode));

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
});
