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
import { assertSignificantEventsAccess } from '../../routes/utils/assert_significant_events_access';
import { SIG_EVENTS_TOOL_IDS } from './constants';
import type { SigEventsToolsDeps } from './types';

const listQueriesSchema = z.object({
  stream_names: z
    .array(z.string())
    .optional()
    .describe(
      'Optional list of stream names to filter queries. If omitted, returns queries for all streams the user has access to.'
    ),
});

export const createListQueriesTool = ({
  getScopedClients,
  server,
}: SigEventsToolsDeps): BuiltinToolDefinition<typeof listQueriesSchema> => ({
  id: SIG_EVENTS_TOOL_IDS.listQueries,
  type: ToolType.builtin,
  description: `List significant-events queries (alerting rules / detectors) for Streams. Can list globally or filter by stream names. Each query defines what counts as a significant event for a stream.`,
  schema: listQueriesSchema,
  tags: ['streams', 'sig-events', 'queries'],
  handler: async ({ stream_names: streamNames }, { request }) => {
    const { queryClient, streamsClient, licensing, uiSettingsClient } = await getScopedClients({
      request,
    });
    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const allStreams = await streamsClient.listStreams();
    const names =
      streamNames && streamNames.length > 0
        ? allStreams.filter((s) => streamNames.includes(s.name)).map((s) => s.name)
        : allStreams.map((s) => s.name);

    if (names.length === 0) {
      return {
        results: [
          {
            type: ToolResultType.other,
            data: { queries: [], total: 0 },
          },
        ],
      };
    }

    const queryLinks = await queryClient.getQueryLinks(names);

    return {
      results: [
        {
          type: ToolResultType.other,
          data: {
            queries: queryLinks.map((link) => ({
              id: link.query.id,
              title: link.query.title,
              stream_name: link.stream_name,
            })),
            total: queryLinks.length,
          },
        },
      ],
    };
  },
});
