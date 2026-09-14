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
import { z } from '@kbn/zod/v4';
import { ensureToolPrivilege } from '../../common/unauthorized_tool_result';
import { ALERTING_LOG_CODES } from '../../../lib/errors/error_codes';
import type { EpisodesClient } from '../../../lib/episodes_client';
import type { LoggerServiceContract } from '../../../lib/services/logger_service/logger_service';
import type { PrivilegeChecker } from '../../../lib/services/privilege_checker/privilege_checker';

const getEpisodeTransitionsSchema = z.object({});

/** Bounded tool id — unique per attachment instance when multiple episodes are present. */
export const getEpisodeTransitionsToolId = (attachmentId: string): string =>
  `${ALERTING_NAMESPACE}.get_episode_transitions.${attachmentId}`;

export interface GetEpisodeTransitionsToolParams {
  attachmentId: string;
  episodeId: string;
  logger: LoggerServiceContract;
  getEpisodesClient: (context: AttachmentFormatContext) => EpisodesClient;
  getPrivilegeChecker: (context: {
    request: AttachmentFormatContext['request'];
  }) => PrivilegeChecker;
}

export const getEpisodeTransitionsTool = ({
  attachmentId,
  episodeId,
  logger,
  getEpisodesClient,
  getPrivilegeChecker,
}: GetEpisodeTransitionsToolParams): BuiltinAttachmentBoundedTool<
  typeof getEpisodeTransitionsSchema
> => ({
  id: getEpisodeTransitionsToolId(attachmentId),
  type: ToolType.builtin,
  description: `Fetch status transitions for alert episode "${episodeId}" (attachment "${attachmentId}"). Returns one row per contiguous episode.status run with previous_status, status_started_at, status_ended_at (null while current), duration_ms, and the alert data at that transition. Call when the user asks how this episode's status changed over time.`,
  schema: getEpisodeTransitionsSchema,
  handler: async (_args, toolContext) => {
    const unauthorized = await ensureToolPrivilege({
      privilegeChecker: getPrivilegeChecker({ request: toolContext.request }),
      feature: 'alerts',
      level: 'read',
      action: 'fetch episode transitions',
    });
    if (unauthorized) {
      return unauthorized;
    }

    try {
      const client = getEpisodesClient({
        request: toolContext.request,
        spaceId: toolContext.spaceId,
      });
      const transitions = await client.getEpisodeTransitions(episodeId);

      return {
        results: [
          {
            type: ToolResultType.other,
            data: { transitions },
          },
        ],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.warn({
        message: 'Failed to fetch episode transitions',
        code: ALERTING_LOG_CODES.AGENT_BUILDER_EPISODE_GET_TRANSITIONS_FAILED,
        labels: {
          episode_id: episodeId,
          space_id: toolContext.spaceId,
        },
        error,
      });
      return {
        results: [
          {
            type: ToolResultType.error,
            data: {
              message: `Failed to fetch transitions for episode "${episodeId}": ${message}`,
            },
          },
        ],
      };
    }
  },
});
