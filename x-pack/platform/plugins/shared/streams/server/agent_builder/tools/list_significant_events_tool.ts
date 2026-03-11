/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { readSignificantEventsFromAlertsIndices } from '../../lib/significant_events/read_significant_events_from_alerts_indices';
import { assertSignificantEventsAccess } from '../../routes/utils/assert_significant_events_access';
import { SIG_EVENTS_TOOL_IDS } from './constants';
import type { SigEventsToolsDeps } from './types';

const DEFAULT_BUCKET_SIZE = '1h';

const listSignificantEventsSchema = z.object({
  stream_names: z
    .array(z.string())
    .optional()
    .describe(
      'Optional list of stream names to filter significant events. If omitted, returns events for all streams the user has access to.'
    ),
  from: z
    .string()
    .optional()
    .describe('Start of the time range (ISO 8601). Defaults to 24 hours ago.'),
  to: z.string().optional().describe('End of the time range (ISO 8601). Defaults to now.'),
  bucket_size: z
    .string()
    .optional()
    .default(DEFAULT_BUCKET_SIZE)
    .describe('Size of time buckets for aggregations (e.g. 1h, 1d).'),
});

export const createListSignificantEventsTool = ({
  getScopedClients,
  server,
}: SigEventsToolsDeps): BuiltinToolDefinition<typeof listSignificantEventsSchema> => ({
  id: SIG_EVENTS_TOOL_IDS.listSignificantEvents,
  type: ToolType.builtin,
  description: `List significant events (notable patterns or anomalies) for Streams. Returns queries with occurrence counts and optional change points. Can list globally or filter by stream names. Optionally specify a time range.`,
  schema: listSignificantEventsSchema,
  tags: ['streams', 'sig-events', 'significant-events'],
  handler: async (
    { stream_names: streamNames, from: fromStr, to: toStr, bucket_size: bucketSize },
    { request }
  ) => {
    const { queryClient, scopedClusterClient, streamsClient, licensing, uiSettingsClient } =
      await getScopedClients({ request });
    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const now = new Date();
    const from = fromStr ? new Date(fromStr) : new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const to = toStr ? new Date(toStr) : now;

    const allStreams = await streamsClient.listStreams();
    const names =
      streamNames && streamNames.length > 0
        ? allStreams.filter((s) => streamNames.includes(s.name)).map((s) => s.name)
        : allStreams.map((s) => s.name);

    const result = await readSignificantEventsFromAlertsIndices(
      {
        streamNames: names.length > 0 ? names : undefined,
        from,
        to,
        bucketSize: bucketSize ?? DEFAULT_BUCKET_SIZE,
      },
      { queryClient, scopedClusterClient }
    );

    return {
      results: [
        {
          type: ToolResultType.other,
          data: {
            significant_events: result.significant_events.map((e) => ({
              id: e.id,
              title: e.title,
              stream_name: e.stream_name,
              occurrence_count: e.occurrences?.reduce((sum, o) => sum + o.count, 0) ?? 0,
            })),
            aggregated_occurrences: result.aggregated_occurrences,
            total: result.significant_events.length,
          },
        },
      ],
    };
  },
});
