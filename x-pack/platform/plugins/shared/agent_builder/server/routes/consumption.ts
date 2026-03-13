/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import path from 'node:path';
import type { RouteDependencies } from './types';
import { getHandlerWrapper } from './wrap_handler';
import { publicApiPath } from '../../common/constants';
import { createSpaceDslFilter } from '../utils/spaces';
import { AGENTS_WRITE_SECURITY } from './route_security';
import type {
  ConsumptionResponse,
  ConsumptionAggregations,
  ConversationConsumption,
  ConversationConsumptionWarning,
  ConsumptionSortField,
} from '../../common/http_api/consumption';
import {
  conversationIndexName,
  HIGH_INPUT_TOKEN_THRESHOLD,
  INPUT_TOKENS_SCRIPT,
  OUTPUT_TOKENS_SCRIPT,
  ROUND_COUNT_SCRIPT,
  LLM_CALLS_SCRIPT,
  HIGH_TOKEN_ROUNDS_SCRIPT,
  buildSortClause,
} from '../services/metering/utils';

/**
 * Registers POST /api/agent_builder/agents/{agent_id}/consumption
 *
 * Public, Tech Preview route. Requires the manageAgents privilege.
 * Returns paginated, per-conversation token consumption data across all users
 * for a given agent. Uses search_after cursor pagination and Painless scripted
 * fields to aggregate token usage.
 *
 * Changed from the internal GET route to a public versioned POST so that
 * structured params (search_after array, usernames array) are passed in the
 * request body instead of encoded query strings.
 */
export function registerConsumptionRoutes({ router, coreSetup, logger }: RouteDependencies) {
  const wrapHandler = getHandlerWrapper({ logger });

  router.versioned
    .post({
      path: `${publicApiPath}/agents/{agent_id}/consumption`,
      security: AGENTS_WRITE_SECURITY,
      access: 'public',
      summary: 'Get agent consumption data',
      description:
        'Returns paginated, per-conversation token consumption data for a given agent. ' +
        'Includes input/output token counts, round counts, LLM call counts, and warnings ' +
        'for conversations with high token usage. Requires the manageAgents privilege.',
      options: {
        tags: ['consumption', 'oas-tag:agent builder'],
        availability: {
          stability: 'experimental',
          since: '9.4.0',
        },
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: {
            params: schema.object({
              agent_id: schema.string({
                meta: { description: 'The unique identifier of the agent.' },
              }),
            }),
            body: schema.object({
              size: schema.number({
                defaultValue: 25,
                min: 1,
                max: 100,
                meta: { description: 'Number of results per page.' },
              }),
              sort_field: schema.oneOf(
                [
                  schema.literal('updated_at'),
                  schema.literal('total_tokens'),
                  schema.literal('round_count'),
                ],
                {
                  defaultValue: 'updated_at',
                  meta: { description: 'Field to sort results by.' },
                }
              ),
              sort_order: schema.oneOf([schema.literal('asc'), schema.literal('desc')], {
                defaultValue: 'desc',
                meta: { description: 'Sort direction.' },
              }),
              search_after: schema.maybe(
                schema.arrayOf(schema.any(), {
                  meta: {
                    description:
                      'Cursor for pagination. Pass the search_after value from the previous response.',
                  },
                })
              ),
              search: schema.maybe(
                schema.string({
                  meta: { description: 'Free-text search filter on conversation title.' },
                })
              ),
              usernames: schema.maybe(
                schema.arrayOf(schema.string(), {
                  meta: { description: 'Filter results to conversations by these usernames.' },
                })
              ),
              has_warnings: schema.maybe(
                schema.boolean({
                  meta: {
                    description: 'Filter to conversations with or without high-token warnings.',
                  },
                })
              ),
            }),
          },
        },
        options: {
          oasOperationObject: () => path.join(__dirname, 'examples/consumption_get.yaml'),
        },
      },
      wrapHandler(async (ctx, request, response) => {
        const [coreStart] = await coreSetup.getStartServices();
        const scopedClient = coreStart.elasticsearch.client.asScoped(request);

        const { agent_id: agentId } = request.params;
        const {
          size,
          sort_field: sortField,
          sort_order: sortOrder,
          search_after: searchAfter,
          search: searchText,
          usernames: usernameFilter,
          has_warnings: hasWarningsFilter,
        } = request.body;

        const space = (await ctx.agentBuilder).spaces.getSpaceId();

        const esClient = scopedClient.asInternalUser;

        const filterClauses: Array<Record<string, unknown>> = [
          createSpaceDslFilter(space) as Record<string, unknown>,
          { term: { agent_id: agentId } },
        ];

        if (usernameFilter && usernameFilter.length > 0) {
          filterClauses.push({ terms: { user_name: usernameFilter } });
        }

        const mustClauses: Array<Record<string, unknown>> = [];

        if (searchText) {
          mustClauses.push({
            wildcard: { title: { value: `*${searchText}*`, case_insensitive: true } },
          });
        }

        const runtimeMappings: Record<
          string,
          { type: 'boolean'; script: Record<string, unknown> }
        > = {};

        if (hasWarningsFilter !== undefined) {
          runtimeMappings.has_warnings = {
            type: 'boolean' as const,
            script: {
              source: `
              def roundsArray = params._source.conversation_rounds != null
                ? params._source.conversation_rounds
                : params._source.rounds;
              if (roundsArray == null) { emit(false); return; }
              for (def round : roundsArray) {
                if (round.model_usage != null) {
                  def tokens = round.model_usage.input_tokens != null ? round.model_usage.input_tokens : 0;
                  if (tokens > params.threshold) { emit(true); return; }
                }
              }
              emit(false);
            `,
              lang: 'painless',
              params: { threshold: HIGH_INPUT_TOKEN_THRESHOLD },
            },
          };
          filterClauses.push({ term: { has_warnings: hasWarningsFilter } });
        }

        const query = {
          bool: {
            filter: filterClauses,
            ...(mustClauses.length > 0 ? { must: mustClauses } : {}),
          },
        };

        const aggsPromise = esClient.search({
          index: conversationIndexName,
          size: 0,
          query: {
            bool: {
              filter: [createSpaceDslFilter(space), { term: { agent_id: agentId } }],
            },
          },
          aggs: {
            usernames: {
              terms: { field: 'user_name', size: 100 },
            },
          },
        });

        const hasRuntimeMappings = Object.keys(runtimeMappings).length > 0;

        const dataPromise = esClient.search({
          index: conversationIndexName,
          track_total_hits: true,
          size,
          _source: ['agent_id', 'user_id', 'user_name', 'title', 'created_at', 'updated_at'],
          query,
          ...(hasRuntimeMappings ? { runtime_mappings: runtimeMappings } : {}),
          script_fields: {
            total_input_tokens: {
              script: { source: INPUT_TOKENS_SCRIPT, lang: 'painless' },
            },
            total_output_tokens: {
              script: { source: OUTPUT_TOKENS_SCRIPT, lang: 'painless' },
            },
            round_count: {
              script: { source: ROUND_COUNT_SCRIPT, lang: 'painless' },
            },
            total_llm_calls: {
              script: { source: LLM_CALLS_SCRIPT, lang: 'painless' },
            },
            high_token_rounds: {
              script: {
                source: HIGH_TOKEN_ROUNDS_SCRIPT,
                lang: 'painless',
                params: { threshold: HIGH_INPUT_TOKEN_THRESHOLD },
              },
            },
          },
          sort: buildSortClause(sortField as ConsumptionSortField, sortOrder as 'asc' | 'desc'),
          ...(searchAfter ? { search_after: searchAfter } : {}),
        });

        const [esResponse, aggsResponse] = await Promise.all([dataPromise, aggsPromise]);

        const total = (esResponse.hits.total as { value: number })?.value ?? 0;

        const results: ConversationConsumption[] = esResponse.hits.hits.map((hit) => {
          const source = hit._source as Record<string, any>;
          const fields = hit.fields ?? {};

          const inputTokens = fields.total_input_tokens?.[0] ?? 0;
          const outputTokens = fields.total_output_tokens?.[0] ?? 0;

          // script_fields returning arrays of objects can produce varying shapes;
          // coerce into a flat array regardless of how ES wraps the result.
          const rawHighTokenRounds = fields.high_token_rounds ?? [];
          const highTokenRounds = (
            Array.isArray(rawHighTokenRounds) ? rawHighTokenRounds : [rawHighTokenRounds]
          ).flat() as Array<{ round_id: string; input_tokens: number }>;
          const warnings: ConversationConsumptionWarning[] = highTokenRounds
            .filter((r) => r && typeof r === 'object' && 'round_id' in r)
            .map((r) => ({
              type: 'high_input_tokens' as const,
              round_id: String(r.round_id),
              input_tokens: Number(r.input_tokens),
            }));

          return {
            conversation_id: hit._id!,
            title: source.title ?? '',
            user: {
              id: source.user_id,
              username: source.user_name,
            },
            created_at: source.created_at,
            updated_at: source.updated_at,
            token_usage: {
              input_tokens: inputTokens,
              output_tokens: outputTokens,
              total_tokens: inputTokens + outputTokens,
            },
            round_count: fields.round_count?.[0] ?? 0,
            llm_calls: fields.total_llm_calls?.[0] ?? 0,
            warnings,
          };
        });

        const usernameBuckets = (aggsResponse.aggregations?.usernames as any)?.buckets ?? [];
        const aggregations: ConsumptionAggregations = {
          usernames: usernameBuckets.map((b: { key: string }) => b.key),
          total_with_warnings: 0,
        };

        const lastHit = esResponse.hits.hits[esResponse.hits.hits.length - 1];
        const nextSearchAfter = lastHit?.sort;

        return response.ok<ConsumptionResponse>({
          body: {
            results,
            total,
            aggregations,
            ...(nextSearchAfter ? { search_after: nextSearchAfter } : {}),
          },
        });
      })
    );
}
