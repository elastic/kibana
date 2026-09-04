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
import { MAX_ID_LENGTH, MAX_TEXT_LENGTH, MAX_TITLE_LENGTH } from '@kbn/significant-events-schema';
import {
  createQueryValidationContext,
  QUERY_GENERATION_EXCLUDED_FEATURE_TYPES,
  validateKIQueries,
} from '@kbn/streams-ai';
import type { StreamsServer } from '@kbn/streams-plugin/server/types';
import { z } from '@kbn/zod/v4';
import type { GetScopedClients } from '../../../routes/types';
import { assertSignificantEventsAccess } from '../../../routes/utils/assert_significant_events_access';
import { getRequestAbortSignal } from '../../../routes/utils/get_request_abort_signal';
import { createSignificantEventsAvailability } from '../significant_events_availability';

export const SIGNIFICANT_EVENTS_VALIDATE_QUERIES_TOOL_ID =
  platformSignificantEventsTools.validateQueries;

const MAX_QUERIES_PER_CALL = 100;
const MAX_FEATURE_IDS_PER_QUERY = 100;
const TOOL_EXECUTION_TIMEOUT_MS = 240_000;

const candidateQuerySchema = z.object({
  type: z.enum(['match', 'stats']).optional(),
  esql: z.string().max(MAX_TEXT_LENGTH),
  title: z.string().max(MAX_TITLE_LENGTH),
  description: z.string().max(MAX_TEXT_LENGTH),
  category: z.enum(['operational', 'configuration', 'resource_health', 'error', 'security']),
  severity_score: z.number().min(0).max(100),
  evidence: z.array(z.string().max(MAX_TEXT_LENGTH)).max(100).optional(),
  replaces: z.string().max(MAX_ID_LENGTH).optional(),
  feature_ids: z.array(z.string().max(MAX_ID_LENGTH)).min(1).max(MAX_FEATURE_IDS_PER_QUERY),
});

const validateQueriesSchema = z.object({
  stream_name: z
    .string()
    .max(MAX_ID_LENGTH)
    .describe('Stream against which the candidate ES|QL queries must be validated.'),
  queries: z
    .array(candidateQuerySchema)
    .min(1)
    .max(MAX_QUERIES_PER_CALL)
    .describe('Complete candidate query batch. Resubmit repaired queries after validation errors.'),
});

export const createValidateQueriesTool = ({
  getScopedClients,
  server,
  logger,
}: {
  getScopedClients: GetScopedClients;
  server: StreamsServer;
  logger: Logger;
}): StaticToolRegistration<typeof validateQueriesSchema> => {
  const toolDefinition: BuiltinToolDefinition<typeof validateQueriesSchema> = {
    id: SIGNIFICANT_EVENTS_VALIDATE_QUERIES_TOOL_ID,
    type: ToolType.builtin,
    description:
      'Validate candidate KI queries against a stream. Rewrites sources, verifies feature links, rejects duplicates and over-broad predicates, and executes ES|QL with LIMIT 0. Use the returned errors to repair rejected queries before finalizing.',
    annotations: {
      title: 'Validate KI Queries',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    schema: validateQueriesSchema,
    tags: ['streams', 'significant-events', 'query-generation'],
    availability: createSignificantEventsAvailability({ server, logger }),
    handler: async ({ stream_name: streamName, queries }, context) => {
      try {
        const scopedClients = await getScopedClients({ request: context.request });
        await assertSignificantEventsAccess({
          server,
          licensing: scopedClients.licensing,
        });

        const stream = await scopedClients.streamsClient.getStream(streamName);
        const kiClient = await scopedClients.getKnowledgeIndicatorClient();
        const featureIds = [...new Set(queries.flatMap(({ feature_ids: ids }) => ids))];
        const [{ hits: features }, { [streamName]: existingLinks }] = await Promise.all([
          kiClient.getFeatures(streamName, {
            id: featureIds,
            excludedType: [...QUERY_GENERATION_EXCLUDED_FEATURE_TYPES],
          }),
          kiClient.getStreamToQueryLinksMap([streamName]),
        ]);
        const existingQueries = existingLinks.map(({ query }) => ({
          id: query.id,
          title: query.title,
          type: query.type,
          severity_score: query.severity_score,
          description: query.description.slice(0, 200),
          esql: query.esql.query,
        }));
        const signal = AbortSignal.any([
          getRequestAbortSignal(context.request),
          AbortSignal.timeout(TOOL_EXECUTION_TIMEOUT_MS),
        ]);
        const validationContext = await createQueryValidationContext({
          stream,
          esClient: scopedClients.streamDataEsClient,
          existingQueries,
          signal,
          logger,
        });
        const { results, acceptedQueries } = await validateKIQueries({
          queries,
          features,
          context: validationContext,
          esClient: scopedClients.streamDataEsClient,
          signal,
          logger,
          queryValidationTimeoutMs: scopedClients.tuningConfig.query_validation_timeout_ms,
        });

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                queries: results,
                accepted_queries: acceptedQueries.map(
                  ({ category: _category, expects_matches: _expectsMatches, esql, ...query }) => ({
                    ...query,
                    esql: { query: esql },
                  })
                ),
              },
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.warn(`KI query validation failed: ${message}`);
        return {
          results: [{ type: ToolResultType.error, data: { message } }],
        };
      }
    },
  };

  return toolDefinition;
};
