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
          'Event state to search. Defaults to open so continuation searches cannot select closed events. Specify closed or dismissed only when intentionally reviewing that state.',
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
            'Use it to narrow results to a known incident. ' +
            'Matching is case-insensitive and not semantic — omit it when you want all events for a stream or state.',
        })
      ),
    rule_uuids: z
      .array(z.string())
      .max(100)
      .optional()
      .describe(
        i18n.translate('xpack.significantEvents.agentBuilder.tools.eventSearch.schema.ruleUuids', {
          defaultMessage:
            'Optional rule UUIDs to match against event signals. When combined with stream names, only events matching both filters are returned.',
        })
      ),
    exclude_unconfirmed_signals: z
      .boolean()
      .optional()
      .default(true)
      .describe(
        i18n.translate(
          'xpack.significantEvents.agentBuilder.tools.eventSearch.schema.excludeUnconfirmedSignals',
          {
            defaultMessage:
              'Defaults to true. Omit signals whose confirmed value is false from returned events. Rule-filtered searches also omit events that matched only excluded signals, except the discovery recovery path may retain a requested same-rule signal for episode reconciliation. Signals with confirmed true or omitted remain. Note: total and has_more reflect the pre-filter ES count; use has_more and next_page to continue scanning source pages when this filter is active.',
          }
        )
      ),
    event_ids: z
      .array(z.string())
      .max(100)
      .optional()
      .describe(
        i18n.translate('xpack.significantEvents.agentBuilder.tools.eventSearch.schema.eventIds', {
          defaultMessage: 'Optional stable event IDs to retrieve.',
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
              'Optional Knowledge Indicator feature.id values to match against causal_features.feature_id or blast_radius.feature_id. An event matches when either topology field contains any requested ID.',
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
            'Response detail. compact returns identity, correlation, topology, and signal summaries and is the default. full returns complete stored events and is capped at 10 events per page.',
        })
      ),
    page: z
      .number()
      .int()
      .min(1)
      .optional()
      .default(1)
      .describe(
        i18n.translate('xpack.significantEvents.agentBuilder.tools.eventSearch.schema.page', {
          defaultMessage: 'Current page. Defaults to 1.',
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
            'Number of events to return per page. Defaults to 20; compact responses are capped at 50 and full responses at 10. Controls page size only — never change it on a repeated call to retry the same filters; set page to the next_page value from the previous response instead.',
        })
      ),
    from: z
      .string()
      .optional()
      .default(DEFAULT_EVENTS_SEARCH_FROM)
      .describe(
        i18n.translate('xpack.significantEvents.agentBuilder.tools.eventSearch.schema.from', {
          defaultMessage:
            'Start of the search range as ISO 8601 or Elasticsearch date math. Defaults to now-7d.',
        })
      ),
    to: z
      .string()
      .optional()
      .default(DEFAULT_EVENTS_SEARCH_TO)
      .describe(
        i18n.translate('xpack.significantEvents.agentBuilder.tools.eventSearch.schema.to', {
          defaultMessage:
            'End of the search range as ISO 8601 or Elasticsearch date math. Defaults to now.',
        })
      ),
  })
  .refine(
    ({ event_ids, query, rule_uuids, stream_names, topology_feature_ids }) =>
      query !== undefined ||
      (stream_names?.length ?? 0) > 0 ||
      (rule_uuids?.length ?? 0) > 0 ||
      (event_ids?.length ?? 0) > 0 ||
      (topology_feature_ids?.length ?? 0) > 0,
    {
      message:
        'Provide at least one search filter: query, stream_names, rule_uuids, event_ids, or topology_feature_ids. Do not call event_search with an empty object.',
    }
  );

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
          'Use compact for broad searches and continuation matching. Use full only when complete evidence and assessment details are required. Follow next_page while has_more is true. Searches default to open events; specify a non-open status only when intentionally reviewing that state.',
      })}

      ${i18n.translate('xpack.significantEvents.agentBuilder.tools.eventSearch.description.line3', {
        defaultMessage:
          'Provide at least one filter. Good: `\'{ "rule_uuids": ["..."], "status": "open" }\'`. Invalid: `\'{}\'`. Never re-call this tool with the same filters and a different per_page to retry — per_page only controls page size. When has_more is true, set page to the next_page value from the previous response with all other parameters unchanged. When has_more is false, the result set is complete; do not re-query.',
      })}

      ${i18n.translate('xpack.significantEvents.agentBuilder.tools.eventSearch.description.line4', {
        defaultMessage:
          'A compact event caps its signals list and sets signals_truncated to true when a long-running event has more signals than shown; total_signals holds the real count. To read every signal for such an event, call again with view: full and event_ids: [event_id].',
      })}
    `,
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
