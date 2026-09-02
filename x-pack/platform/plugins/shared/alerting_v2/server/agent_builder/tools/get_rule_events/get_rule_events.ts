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
import type { EpisodeEventRow } from '@kbn/alerting-v2-common-queries';
import { ALERTING_NAMESPACE } from '@kbn/alerting-v2-constants';
import { alertEpisodeStatusSchema } from '@kbn/alerting-v2-schemas';
import { z } from '@kbn/zod/v4';
import { ensureToolPrivilege } from '../../common/unauthorized_tool_result';
import { ALERTING_LOG_CODES } from '../../../lib/errors/error_codes';
import type { EpisodesClient } from '../../../lib/episodes_client';
import type { LoggerServiceContract } from '../../../lib/services/logger_service/logger_service';
import type { PrivilegeChecker } from '../../../lib/services/privilege_checker/privilege_checker';

/** ES|QL returns at most this many rows when the query has no explicit LIMIT. */
const ESQL_DEFAULT_RESULT_LIMIT = 1000;

const getRuleEventsSchema = z.object({
  start: z.iso
    .datetime()
    .optional()
    .describe(
      'Start of an optional @timestamp window (inclusive), ISO 8601. Pass together with end to narrow the window.'
    ),
  end: z.iso
    .datetime()
    .optional()
    .describe(
      'End of an optional @timestamp window (inclusive), ISO 8601. Pass together with start to narrow the window.'
    ),
  status: alertEpisodeStatusSchema
    .optional()
    .describe(
      'If set, only return events whose episode.status matches this lifecycle state (inactive, pending, active, recovering).'
    ),
});

const parseEventData = (
  data: EpisodeEventRow['data']
): Record<string, unknown> | string | null | undefined => {
  if (typeof data !== 'string') {
    return data;
  }
  try {
    const parsed: unknown = JSON.parse(data);
    if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return data;
  } catch {
    return data;
  }
};

/** Bounded tool id — unique per attachment instance when multiple episodes are present. */
export const getRuleEventsToolId = (attachmentId: string): string =>
  `${ALERTING_NAMESPACE}.get_rule_events.${attachmentId}`;

export interface GetRuleEventsToolParams {
  attachmentId: string;
  episodeId: string;
  logger: LoggerServiceContract;
  getEpisodesClient: (context: AttachmentFormatContext) => EpisodesClient;
  getPrivilegeChecker: (context: {
    request: AttachmentFormatContext['request'];
  }) => PrivilegeChecker;
}

export const getRuleEventsTool = ({
  attachmentId,
  episodeId,
  logger,
  getEpisodesClient,
  getPrivilegeChecker,
}: GetRuleEventsToolParams): BuiltinAttachmentBoundedTool<typeof getRuleEventsSchema> => ({
  id: getRuleEventsToolId(attachmentId),
  type: ToolType.builtin,
  description: `Fetch .rule-events rows for alert episode "${episodeId}" (attachment "${attachmentId}"), oldest first. Each event includes @timestamp, episode.status (inactive/pending/active/recovering), severity, source, group_hash, and event data. Call with no arguments to fetch this episode's events. Optionally pass start and end together to narrow the @timestamp window, or episode.status to filter lifecycle state. At most ${ESQL_DEFAULT_RESULT_LIMIT} rows are returned (ES|QL default); if truncated is true, pass a narrower start/end. This tool is read-only.`,
  schema: getRuleEventsSchema,
  handler: async (args, toolContext) => {
    const unauthorized = await ensureToolPrivilege({
      privilegeChecker: getPrivilegeChecker({ request: toolContext.request }),
      feature: 'alerts',
      level: 'read',
      action: 'fetch rule events for episode',
    });
    if (unauthorized) {
      return unauthorized;
    }

    const { start, end, status } = args;
    if ((start === undefined) !== (end === undefined)) {
      return {
        results: [
          {
            type: ToolResultType.error,
            data: {
              message: 'start and end must both be provided',
            },
          },
        ],
      };
    }
    if (start !== undefined && end !== undefined && Date.parse(start) > Date.parse(end)) {
      return {
        results: [
          {
            type: ToolResultType.error,
            data: {
              message: 'start must be less than or equal to end',
            },
          },
        ],
      };
    }

    try {
      const client = getEpisodesClient({
        request: toolContext.request,
        spaceId: toolContext.spaceId,
      });
      const events = await client.getEvents(episodeId, {
        ...(start !== undefined && end !== undefined ? { timeRange: { start, end } } : {}),
        ...(status !== undefined ? { status } : {}),
      });

      // Existence is only ambiguous when the events query is empty (missing
      // episode vs nothing in this window). Skip the extra lookup otherwise.
      if (events.length === 0) {
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
      }

      return {
        results: [
          {
            type: ToolResultType.other,
            data: {
              events: events.map((event) => ({ ...event, data: parseEventData(event.data) })),
              count: events.length,
              truncated: events.length >= ESQL_DEFAULT_RESULT_LIMIT,
            },
          },
        ],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.warn({
        message: 'Failed to fetch rule events for episode',
        code: ALERTING_LOG_CODES.AGENT_BUILDER_EPISODE_GET_RULE_EVENTS_FAILED,
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
              message: `Failed to fetch rule events for episode "${episodeId}": ${message}`,
            },
          },
        ],
      };
    }
  },
});
