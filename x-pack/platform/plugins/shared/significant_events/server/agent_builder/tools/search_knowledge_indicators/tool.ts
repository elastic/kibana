/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import {
  MAX_FEATURE_ARRAY_ITEMS,
  MAX_ID_LENGTH,
  MAX_TEXT_LENGTH,
  QUERY_TYPE_MATCH,
  QUERY_TYPE_STATS,
} from '@kbn/significant-events-schema';
import { platformSignificantEventsTools, ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type {
  BuiltinToolDefinition,
  StaticToolRegistration,
  ToolAvailabilityResult,
} from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/core/server';
import dedent from 'dedent';
import type { StreamsServer } from '@kbn/streams-plugin/server/types';
import { DEFAULT_SEARCH_KNOWLEDGE_INDICATORS_PER_PAGE } from '@kbn/nightshift-ai';
import type { GetScopedClients } from '../../../routes/types';
import { assertSignificantEventsAccess } from '../../../routes/utils/assert_significant_events_access';
import {
  KNOWLEDGE_INDICATOR_FEATURE_TYPES,
  MAX_COMPACT_META_ARRAY_SAMPLE,
  MAX_COMPACT_META_KEYS,
  searchKnowledgeIndicatorsToolHandler,
} from './handler';

export const SIGNIFICANT_EVENTS_KNOWLEDGE_INDICATORS_SEARCH_TOOL_ID =
  platformSignificantEventsTools.searchKnowledgeIndicators;

const MAX_SEARCH_KNOWLEDGE_INDICATORS_PER_PAGE = 50;
const KI_SEARCH_MAX_PER_PAGE_FULL = 10;

const searchKnowledgeIndicatorsSchema = z.object({
  stream_names: z
    .array(z.string().max(MAX_ID_LENGTH))
    .optional()
    .describe('Optional. If omitted, search across all accessible streams.'),
  search_text: z
    .string()
    .max(MAX_TEXT_LENGTH)
    .optional()
    .describe(
      'Optional. Natural-language search with semantic ranking (hybrid keyword + vector). Descriptive phrases work better than single keywords.'
    ),
  kind: z
    .array(z.enum(['feature', 'query']))
    .optional()
    .default([])
    .describe(
      dedent`What to return.
      - ['query']: queries-only KIs
      - ['feature']: feature-based KIs only
      - default (empty array or omitted): both features and queries`
    ),
  feature_types: z
    .array(z.enum(KNOWLEDGE_INDICATOR_FEATURE_TYPES))
    .optional()
    .describe(
      'Return only feature KIs whose feature.type matches one of these values. Use only when `kind: ["feature"]` is specified.'
    ),
  feature_ids: z
    .array(z.string().max(MAX_ID_LENGTH))
    .optional()
    .describe(
      'Seed the topology search with these IDs. Features whose feature.id matches are always returned. When `feature_types` includes `"dependency"` and `"entity"`, dependency features matching these IDs by source or target endpoint are also returned, along with entity features connected through those dependency edges. Use only when `kind: ["feature"]` is specified.'
    ),
  query_types: z
    .array(z.enum([QUERY_TYPE_MATCH, QUERY_TYPE_STATS]))
    .optional()
    .describe(
      'Return only query KIs whose query.type matches one of these values. Use only when `kind: ["query"]` is specified.'
    ),
  query_ids: z
    .array(z.string().max(MAX_ID_LENGTH))
    .optional()
    .describe(
      'Return only query KIs whose query.id matches one of these values. Use only when `kind: ["query"]` is specified.'
    ),
  rule_ids: z
    .array(z.string().max(MAX_ID_LENGTH))
    .optional()
    .describe(
      'Return only query KIs linked to one of these exact rule IDs. Use only when `kind: ["query"]` is specified.'
    ),
  rule_backed: z
    .boolean()
    .optional()
    .describe(
      'Return only query KIs with the requested rule-backing state (`true` = rule-backed only, `false` = unbacked only). Use only when `kind: ["query"]` is specified. Omit to include all.'
    ),
  page: z.number().int().min(1).optional().default(1).describe('Current page. Defaults to 1.'),
  per_page: z
    .number()
    .int()
    .min(1)
    .max(MAX_SEARCH_KNOWLEDGE_INDICATORS_PER_PAGE)
    .optional()
    .default(DEFAULT_SEARCH_KNOWLEDGE_INDICATORS_PER_PAGE)
    .describe(`Number of Knowledge Indicators to return per page.`),
  view: z
    .enum(['compact', 'full'])
    .optional()
    .default('compact')
    .describe(
      dedent`Response detail level.
      - 'compact' (default): strips unused metadata fields and truncates computed feature types (dataset_analysis, error_logs, log_patterns, log_samples). Bounds \`evidence\` and \`tags\` to ${MAX_FEATURE_ARRAY_ITEMS} items on all feature KIs; \`evidence_count\` and \`tags_count\` are present when those arrays were truncated. \`meta\` is a flat key→value map; keeps the first ${MAX_COMPACT_META_KEYS} keys in JavaScript property-enumeration order, samples array values to ${MAX_COMPACT_META_ARRAY_SAMPLE} items, and records omitted array items in \`meta_array_items_omitted\`. \`meta_keys_omitted\` counts dropped keys. Maximum ${MAX_SEARCH_KNOWLEDGE_INDICATORS_PER_PAGE} per page.
      - 'full': returns all fields verbatim. Use with specific \`feature_ids\` to retrieve untruncated evidence, tags, metadata, and computed-type properties. Maximum ${KI_SEARCH_MAX_PER_PAGE_FULL} per page.`
    ),
});

export function createSearchKnowledgeIndicatorsTool({
  getScopedClients,
  server,
  logger,
}: {
  getScopedClients: GetScopedClients;
  server: StreamsServer;
  logger: Logger;
}): StaticToolRegistration<typeof searchKnowledgeIndicatorsSchema> {
  const toolDefinition: BuiltinToolDefinition<typeof searchKnowledgeIndicatorsSchema> = {
    id: SIGNIFICANT_EVENTS_KNOWLEDGE_INDICATORS_SEARCH_TOOL_ID,
    type: ToolType.builtin,
    description: dedent`
      Search Knowledge Indicators (KIs) derived from streams data to enrich context for a target
      stream, service, or group of streams.

      KIs include:
      - Feature-based indicators (stream features)
      - Query-based indicators (stored stream queries)

      Use this tool to:
      - Gather domain context for a specific stream or group of streams
      - Narrow results by stream, kind, feature/query type, IDs, or rule backing
      - Traverse large filtered result sets with \`page\` and \`per_page\`
      - Find relevant KIs via semantic text using \`search_text\`
      - Retrieve queries-only KIs with \`kind: ['query']\`
    `,
    annotations: {
      title: 'Search Knowledge Indicators',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    schema: searchKnowledgeIndicatorsSchema,
    tags: ['streams', 'significant-events'],
    availability: {
      cacheMode: 'space',
      handler: async (): Promise<ToolAvailabilityResult> => {
        try {
          await assertSignificantEventsAccess({
            server,
            licensing: server.licensing,
          });
          return { status: 'available' };
        } catch (error) {
          if (error instanceof Error) {
            logger.debug(error.stack ?? error.message);
          } else {
            logger.debug(String(error));
          }
          return {
            status: 'unavailable',
            reason:
              error instanceof Error
                ? error.message
                : 'Significant events access is not available in the current context',
          };
        }
      },
    },
    handler: async (toolParams, context) => {
      const { request } = context;

      try {
        const scopedClients = await getScopedClients({ request });

        await assertSignificantEventsAccess({
          server,
          licensing: scopedClients.licensing,
        });

        const kiClient = await scopedClients.getKnowledgeIndicatorClient();

        const { view, ...restParams } = toolParams;
        const maxPerPage =
          view === 'full' ? KI_SEARCH_MAX_PER_PAGE_FULL : MAX_SEARCH_KNOWLEDGE_INDICATORS_PER_PAGE;
        const params = {
          ...restParams,
          per_page: Math.min(restParams.per_page, maxPerPage),
        };

        const output = await searchKnowledgeIndicatorsToolHandler({
          streamsClient: scopedClients.streamsClient,
          kiClient,
          logger,
          params,
          view,
        });

        return {
          results: [
            {
              type: ToolResultType.other,
              data: output,
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`Error running ki_search: ${message}`);
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
                message: `Failed to search knowledge indicators: ${message}`,
              },
            },
          ],
        };
      }
    },
  };

  return toolDefinition;
}
