/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType, ToolResultType } from '@kbn/agent-builder-common';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { z } from '@kbn/zod/v4';
import { ALERT_EVENTS_DATA_STREAM } from '../resources/datastreams/alert_events';

export const ALERTING_TOOL_NAMESPACE = 'alerting';

export const alertingTools = {
  getEpisodeEvents: `${ALERTING_TOOL_NAMESPACE}.get_episode_events`,
  getRule: `${ALERTING_TOOL_NAMESPACE}.get_rule`,
} as const;

const schema = z.object({
  episode_id: z.string().describe('The episode ID to look up events for'),
  limit: z
    .number()
    .optional()
    .describe('Maximum number of events to return (default: 50, max: 200)'),
});

export const getEpisodeEventsTool: BuiltinToolDefinition<typeof schema> = {
  id: alertingTools.getEpisodeEvents,
  type: ToolType.builtin,
  description: `Retrieve alert events from the ${ALERT_EVENTS_DATA_STREAM} index for a specific episode.

Returns the chronological timeline of events for an episode, including each event's timestamp, status (breached/recovered/no_data), episode status (pending/active/recovering/inactive), rule ID, group hash, and associated data payload.

**When to use:** To investigate what happened during an alert episode — its full lifecycle of state transitions and associated data.`,
  tags: ['alerting', 'episodes'],
  schema,
  handler: async ({ episode_id: episodeId, limit }, { esClient, events }) => {
    const effectiveLimit = Math.min(limit ?? 50, 200);

    events.reportProgress(`Searching ${ALERT_EVENTS_DATA_STREAM} for episode ${episodeId}...`);

    const esqlQuery = [
      `FROM ${ALERT_EVENTS_DATA_STREAM} METADATA _source`,
      `| WHERE type == "alert"`,
      `| KEEP _source`,
      `| SORT @timestamp ASC`,
      `| LIMIT ${effectiveLimit}`,
    ].join('\n');

    const response = await esClient.asCurrentUser.esql.query({
      query: esqlQuery,
      filter: {
        bool: {
          filter: [{ term: { 'episode.id': episodeId } }],
        },
      },
      format: 'json',
    });

    const rows = (response as { values?: unknown[][] }).values ?? [];

    if (rows.length === 0) {
      return {
        results: [
          {
            type: ToolResultType.other,
            data: {
              episode_id: episodeId,
              event_count: 0,
              message: `No events found for episode ${episodeId}`,
            },
          },
        ],
      };
    }

    const documents = rows.map((row) => row[0] as Record<string, unknown>);

    return {
      results: [
        {
          type: ToolResultType.other,
          data: {
            episode_id: episodeId,
            event_count: documents.length,
            events: documents,
          },
        },
      ],
    };
  },
};
