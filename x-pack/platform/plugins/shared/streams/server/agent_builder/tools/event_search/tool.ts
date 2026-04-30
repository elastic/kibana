/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import type { Logger } from '@kbn/core/server';
import { sigEventVerdictSchema } from '@kbn/streams-schema';
import { z } from '@kbn/zod/v4';
import dedent from 'dedent';
import type { GetScopedClients } from '../../../routes/types';
import { assertSignificantEventsAccess } from '../../../routes/utils/assert_significant_events_access';
import type { StreamsServer } from '../../../types';
import { searchEventsToolHandler } from './handler';

export const STREAMS_SEARCH_EVENTS_TOOL_ID = 'platform.streams.sig_events.event_search';

const searchEventsSchema = z.object({
  query: z
    .string()
    .optional()
    .describe('Optional search text to match in event title and summary.'),
  stream_name: z.string().describe('Target stream name to search events in.'),
  verdict: z
    .array(sigEventVerdictSchema)
    .optional()
    .describe('Optional list of verdict values to filter events.'),
});

export function createSearchEventsTool({
  getScopedClients,
  server,
  logger,
}: {
  getScopedClients: GetScopedClients;
  server: StreamsServer;
  logger: Logger;
}): BuiltinSkillBoundedTool<typeof searchEventsSchema> {
  return {
    id: STREAMS_SEARCH_EVENTS_TOOL_ID,
    type: ToolType.builtin,
    description: dedent`
      Search significant events for a stream using full-text query and optional verdict filters.

      This tool searches existing SigEvents and returns matching event documents.
    `,
    schema: searchEventsSchema,
    handler: async (toolParams, context) => {
      const { request } = context;

      try {
        const { eventsClient, licensing, uiSettingsClient } = await getScopedClients({ request });

        await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

        const data = await searchEventsToolHandler({
          eventsClient,
          params: toolParams,
        });

        return {
          results: [
            {
              type: ToolResultType.other,
              data,
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`Error running event_search: ${message}`);
        if (error instanceof Error) {
          logger.debug(error.stack ?? error.message);
        } else {
          logger.debug(String(error));
        }

        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Failed to search significant events: ${message}`,
              },
            },
          ],
        };
      }
    },
  };
}
