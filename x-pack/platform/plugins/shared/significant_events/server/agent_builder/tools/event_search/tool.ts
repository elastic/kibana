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
import { significantEventSchema } from '@kbn/significant-events-schema';
import type { GetScopedClients } from '../../../routes/types';
import { assertSignificantEventsAccess } from '../../../routes/utils/assert_significant_events_access';
import type { EbtTelemetryClient } from '../../../lib/telemetry/ebt';
import {
  DEFAULT_EVENTS_SEARCH_FROM,
  DEFAULT_EVENTS_SEARCH_TO,
} from '../../../lib/significant_events/events';
import { createSignificantEventsAvailability } from '../significant_events_availability';
import {
  EVENT_SEARCH_DEFAULT_PER_PAGE,
  EVENT_SEARCH_MAX_PER_PAGE,
  EVENT_SEARCH_SIGNAL_PAGE_SIZE,
  normalizeEventSearchQuery,
  searchEventsToolHandler,
} from './handler';

export const SIGNIFICANT_EVENTS_SEARCH_EVENTS_TOOL_ID = platformSignificantEventsTools.searchEvent;

const searchEventsSchema = significantEventSchema
  .pick({
    status: true,
    stream_names: true,
  })
  .partial({ stream_names: true })
  .extend({
    status: significantEventSchema.shape.status.default('open').describe(
      i18n.translate('xpack.significantEvents.agentBuilder.tools.eventSearch.schema.status', {
        defaultMessage:
          'Event status to filter by. Defaults to "open". Use "closed" or "dismissed" only when intentionally reviewing events in that state.',
      })
    ),
    query: z
      .string()
      .transform(normalizeEventSearchQuery)
      .optional()
      .describe(
        i18n.translate('xpack.significantEvents.agentBuilder.tools.eventSearch.schema.query', {
          defaultMessage:
            'Optional substring search over the event title, summary, and symptom hypothesis fields. ' +
            'Defaults to no text filter. Use it to narrow results to a known incident. ' +
            'Matching is case-insensitive and not semantic — omit it when you want all events for a stream or state.',
        })
      ),
    rule_uuids: z
      .array(z.string())
      .max(100)
      .transform((ruleUuids) => (ruleUuids.length === 0 ? undefined : ruleUuids))
      .optional()
      .describe(
        i18n.translate('xpack.significantEvents.agentBuilder.tools.eventSearch.schema.ruleUuids', {
          defaultMessage:
            'Optional rule UUIDs to match against event signals. Defaults to no rule filter. When combined with stream names, only events matching both filters are returned.',
        })
      ),
    event_ids: z
      .array(z.string())
      .max(100)
      .optional()
      .describe(
        i18n.translate('xpack.significantEvents.agentBuilder.tools.eventSearch.schema.eventIds', {
          defaultMessage: 'Optional stable event IDs to retrieve. Defaults to no event ID filter.',
        })
      ),
    topology_feature_ids: z
      .array(z.string())
      .max(100)
      .optional()
      .describe(
        i18n.translate(
          'xpack.significantEvents.agentBuilder.tools.eventSearch.schema.topologyFeatureIds',
          {
            defaultMessage:
              'Optional Knowledge Indicator feature.id values to match against causal_features.feature_id or blast_radius.feature_id. Defaults to no topology filter. An event matches when either topology field contains any requested ID.',
          }
        )
      ),
    view: z
      .enum(['compact', 'full'])
      .optional()
      .default('compact')
      .describe(
        i18n.translate('xpack.significantEvents.agentBuilder.tools.eventSearch.schema.view', {
          defaultMessage:
            'Response detail. Defaults to "compact", which returns bounded routing data. "full" requires exactly one event_id and returns one bounded page of that event’s signal details.',
        })
      ),
    signals_page: z
      .number()
      .int()
      .min(1)
      .optional()
      .default(1)
      .describe('Signal page for a "full" event response. Defaults to 1.'),
    signals_per_page: z
      .number()
      .int()
      .min(1)
      .max(EVENT_SEARCH_SIGNAL_PAGE_SIZE)
      .optional()
      .default(EVENT_SEARCH_SIGNAL_PAGE_SIZE)
      .describe('Number of signals per "full" event response. Defaults to 10 and is capped at 10.'),
    page: z
      .number()
      .int()
      .min(1)
      .optional()
      .default(1)
      .describe(
        i18n.translate('xpack.significantEvents.agentBuilder.tools.eventSearch.schema.page', {
          defaultMessage: 'Current compact-result page. Defaults to 1.',
        })
      ),
    per_page: z
      .number()
      .int()
      .min(1)
      .max(EVENT_SEARCH_MAX_PER_PAGE)
      .optional()
      .default(EVENT_SEARCH_DEFAULT_PER_PAGE)
      .describe(
        i18n.translate('xpack.significantEvents.agentBuilder.tools.eventSearch.schema.perPage', {
          defaultMessage:
            'Number of compact events to return per page. Defaults to 20 and is capped at 50. "full" returns exactly one known event.',
        })
      ),
    from: z
      .string()
      .optional()
      .default(DEFAULT_EVENTS_SEARCH_FROM)
      .describe(
        i18n.translate('xpack.significantEvents.agentBuilder.tools.eventSearch.schema.from', {
          defaultMessage:
            'Start of the search range as ISO 8601 or Elasticsearch date math. Defaults to "now-7d".',
        })
      ),
    to: z
      .string()
      .optional()
      .default(DEFAULT_EVENTS_SEARCH_TO)
      .describe(
        i18n.translate('xpack.significantEvents.agentBuilder.tools.eventSearch.schema.to', {
          defaultMessage:
            'End of the search range as ISO 8601 or Elasticsearch date math. Defaults to "now".',
        })
      ),
  })
  .refine(({ event_ids, view }) => view !== 'full' || event_ids?.length === 1, {
    message: 'Full event search requires exactly one event_id.',
    path: ['event_ids'],
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
          'Search latest significant events per event_id across all streams or a filtered set.',
      })}

      ${i18n.translate('xpack.significantEvents.agentBuilder.tools.eventSearch.description.line2', {
        defaultMessage:
          'Use "compact" for broad searches and continuation matching. It includes the event summary and symptom hypothesis for correlation, plus signal counts, complete rule UUIDs, unresolved rule UUIDs, and topology. Use "full" only for one known event and request later signal pages when signals_has_more is true. Searches default to "open" events; specify a non-open status only when intentionally reviewing that state.',
      })}

      ${i18n.translate('xpack.significantEvents.agentBuilder.tools.eventSearch.description.line3', {
        defaultMessage:
          'Filters are optional for bounded broad searches: omitted values default to "open" events from "now-7d" to "now", "compact" view, page 1, and 20 events per page. Use rule, topology, event, stream, or query filters to narrow results. When has_more is true, increment page with all other compact-search parameters unchanged. For "full", use signals_page to continue only the known event’s signals.',
      })}

      ${i18n.translate('xpack.significantEvents.agentBuilder.tools.eventSearch.description.line4', {
        defaultMessage:
          'The "compact" response never returns individual signals, signal descriptions, queries, p-values, or detection IDs. Do not close an event while unresolved_rule_uuids is non-empty. For evidence details, call "full" with exactly one event_id; its signals are deterministically ordered and bounded to one page.',
      })}
    `,
    annotations: {
      title: 'Search Significant Events',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    schema: searchEventsSchema,
    tags: ['streams', 'significant-events'],
    availability: createSignificantEventsAvailability({ server, logger }),
    handler: async (toolParams, context) => {
      const { request } = context;
      const query = normalizeEventSearchQuery(toolParams.query);

      try {
        const { getEventClient, licensing } = await getScopedClients({ request });
        await assertSignificantEventsAccess({ server, licensing });

        const data = await searchEventsToolHandler({
          eventClient: getEventClient(),
          params: { ...toolParams, query },
        });

        telemetry.trackAgentToolEventSearch({
          success: true,
          result_count: data.total,
          has_query: query !== undefined,
          has_stream_filter: (toolParams.stream_names?.length ?? 0) > 0,
          status_filter: toolParams.status,
          view: data.view,
          page: data.page,
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
          has_query: query !== undefined,
          has_stream_filter: (toolParams.stream_names?.length ?? 0) > 0,
          status_filter: toolParams.status,
          view: toolParams.view,
          page: toolParams.page,
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
