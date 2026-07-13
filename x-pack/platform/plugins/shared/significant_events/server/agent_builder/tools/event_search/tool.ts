/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformSignificantEventsTools, ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition, StaticToolRegistration } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import { z } from '@kbn/zod/v4';
import dedent from 'dedent';
import type { StreamsServer } from '@kbn/streams-plugin/server/types';
import type { GetScopedClients } from '../../../routes/types';
import { assertSignificantEventsAccess } from '../../../routes/utils/assert_significant_events_access';
import type { EbtTelemetryClient } from '../../../lib/telemetry/ebt';
import { createSignificantEventsAvailability } from '../significant_events_availability';
import { searchEventsToolHandler } from './handler';

export const SIGNIFICANT_EVENTS_SEARCH_EVENTS_TOOL_ID = platformSignificantEventsTools.searchEvent;

const searchEventsSchema = z.object({
  query: z
    .string()
    .optional()
    .describe(
      i18n.translate('xpack.significantEvents.agentBuilder.tools.eventSearch.schema.query', {
        defaultMessage:
          'Optional substring search over the event title and summary fields. ' +
          'Use it to narrow results to a known incident phrase or service name. ' +
          'Matching is case-insensitive and not semantic — omit it when you want all episodes for a stream or state.',
      })
    ),
  stream_names: z
    .array(z.string())
    .optional()
    .describe(
      i18n.translate('xpack.significantEvents.agentBuilder.tools.eventSearch.schema.streamNames', {
        defaultMessage:
          'Optional list of stream names to scope the search. Omit to search across all streams.',
      })
    ),
  state: z
    .enum(['open', 'closed'])
    .optional()
    .describe(
      i18n.translate('xpack.significantEvents.agentBuilder.tools.eventSearch.schema.state', {
        defaultMessage:
          'Optional latest-event state filter. `open` matches latest status promoted/acknowledged; `closed` matches any latest status not in that open set.',
      })
    ),
  page: z.number().int().min(1).optional().default(1),
  per_page: z.number().int().min(1).max(100).optional().default(20),
});

export function createSearchEventsTool({
  getScopedClients,
  server,
  logger,
  telemetry,
}: {
  getScopedClients: GetScopedClients;
  server: StreamsServer;
  logger: Logger;
  telemetry: EbtTelemetryClient;
}): StaticToolRegistration<typeof searchEventsSchema> {
  const toolDefinition: BuiltinToolDefinition<typeof searchEventsSchema> = {
    id: SIGNIFICANT_EVENTS_SEARCH_EVENTS_TOOL_ID,
    type: ToolType.builtin,
    description: dedent`
      ${i18n.translate('xpack.significantEvents.agentBuilder.tools.eventSearch.description.line1', {
        defaultMessage:
          'Search latest significant events per slug across all streams or a filtered set.',
      })}

      ${i18n.translate('xpack.significantEvents.agentBuilder.tools.eventSearch.description.line2', {
        defaultMessage:
          'Use `state: "open"` to return latest episodes whose status is promoted/acknowledged. ' +
          'Use `state: "closed"` to return latest episodes whose status is not promoted/acknowledged. ' +
          'If `state` is omitted, returns all latest episodes.',
      })}
    `,
    schema: searchEventsSchema,
    tags: ['streams', 'significant_events'],
    availability: createSignificantEventsAvailability({ server, logger }),
    handler: async (toolParams, context) => {
      const { request } = context;

      try {
        const { getEventClient, licensing, uiSettingsClient } = await getScopedClients({ request });
        await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

        const data = await searchEventsToolHandler({
          eventClient: getEventClient(),
          params: toolParams,
        });

        telemetry.trackAgentToolEventSearch({
          success: true,
          result_count: data.total,
          has_query: toolParams.query !== undefined,
          has_stream_filter: (toolParams.stream_names?.length ?? 0) > 0,
          state_filter: toolParams.state,
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

        telemetry.trackAgentToolEventSearch({
          success: false,
          result_count: 0,
          has_query: toolParams.query !== undefined,
          has_stream_filter: (toolParams.stream_names?.length ?? 0) > 0,
          state_filter: toolParams.state,
          error_message: message,
        });

        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: i18n.translate(
                  'xpack.significantEvents.agentBuilder.tools.eventSearch.errorMessage',
                  {
                    defaultMessage: 'Failed to search significant events: {message}',
                    values: { message },
                  }
                ),
              },
            },
          ],
        };
      }
    },
  };

  return toolDefinition;
}
