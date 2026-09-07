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
import { z } from '@kbn/zod/v4';
import { alertEpisodeToEpisodeAttachment } from '../../../../common/agent_builder/episode_mappers';
import { loadRuleMetadata } from '../../common/load_rule_metadata';
import { ensureToolPrivilege } from '../../common/unauthorized_tool_result';
import { ALERTING_LOG_CODES } from '../../../lib/errors/error_codes';
import type { EpisodesClient } from '../../../lib/episodes_client';
import type { RulesClient } from '../../../lib/rules_client';
import type { LoggerServiceContract } from '../../../lib/services/logger_service/logger_service';
import type { PrivilegeChecker } from '../../../lib/services/privilege_checker/privilege_checker';

const refreshEpisodeSchema = z.object({});

/** Bounded tool id — unique per attachment instance when multiple episodes are present. */
export const refreshEpisodeToolId = (attachmentId: string): string =>
  `${ALERTING_NAMESPACE}.refresh_episode.${attachmentId}`;

export interface RefreshEpisodeToolParams {
  attachmentId: string;
  episodeId: string;
  logger: LoggerServiceContract;
  getEpisodesClient: (context: AttachmentFormatContext) => EpisodesClient;
  getRulesClient: (context: AttachmentFormatContext) => RulesClient;
  getPrivilegeChecker: (context: {
    request: AttachmentFormatContext['request'];
  }) => PrivilegeChecker;
}

export const refreshEpisodeTool = ({
  attachmentId,
  episodeId,
  logger,
  getEpisodesClient,
  getRulesClient,
  getPrivilegeChecker,
}: RefreshEpisodeToolParams): BuiltinAttachmentBoundedTool<typeof refreshEpisodeSchema> => ({
  id: refreshEpisodeToolId(attachmentId),
  type: ToolType.builtin,
  description: `Refresh alert episode "${episodeId}" (attachment "${attachmentId}") with the latest status, timestamps, severity, tags, assignee, and snooze state from Elasticsearch. Call when the snapshot may be outdated or the user asks about current episode state.`,
  schema: refreshEpisodeSchema,
  handler: async (_args, toolContext) => {
    const unauthorized = await ensureToolPrivilege({
      privilegeChecker: getPrivilegeChecker({ request: toolContext.request }),
      feature: 'alerts',
      level: 'read',
      action: 'refresh episode',
    });
    if (unauthorized) {
      return unauthorized;
    }

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

      const { ruleName, groupingFields } = await loadRuleMetadata(
        getRulesClient({
          request: toolContext.request,
          spaceId: toolContext.spaceId,
        }),
        episode['rule.id'],
        logger
      );

      const data = episodeAttachmentDataSchema.parse(
        alertEpisodeToEpisodeAttachment(episode, { ruleName, groupingFields })
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
      logger.warn({
        message: 'Failed to refresh episode',
        code: ALERTING_LOG_CODES.AGENT_BUILDER_EPISODE_REFRESH_FAILED,
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
              message: `Failed to refresh episode "${episodeId}": ${message}`,
            },
          },
        ],
      };
    }
  },
});
