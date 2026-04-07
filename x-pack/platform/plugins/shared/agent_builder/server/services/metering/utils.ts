/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  FieldValue,
  MappingRuntimeFields,
  SearchHit,
  SearchResponse,
} from '@elastic/elasticsearch/lib/api/types';
import { chatSystemIndex } from '@kbn/agent-builder-server';
import type {
  ConsumptionSortField,
  ConsumptionAggregations,
  ConsumptionResponse,
  ConversationConsumption,
  ConversationConsumptionWarning,
} from '../../../common/http_api/consumption';
import { createSpaceDslFilter } from '../../utils/spaces';

/** Conversations index resolved from the chat system index helper. */
export const conversationIndexName = chatSystemIndex('conversations');

/** Rounds with input tokens above this value are flagged as high-token warnings. */
export const HIGH_INPUT_TOKEN_THRESHOLD = 200_000;

/**
 * Painless script that iterates over conversation_rounds (or legacy `rounds`)
 * and sums input_tokens across all rounds in a single conversation document.
 */
export const INPUT_TOKENS_SCRIPT = `
  def source = params._source;
  def roundsArray = source.conversation_rounds != null ? source.conversation_rounds : source.rounds;
  long total = 0;
  if (roundsArray != null) {
    for (def round : roundsArray) {
      if (round.model_usage != null) {
        total += round.model_usage.input_tokens != null ? round.model_usage.input_tokens : 0;
      }
    }
  }
  return total;
`;

/** Painless script that sums output_tokens across all rounds. */
export const OUTPUT_TOKENS_SCRIPT = `
  def source = params._source;
  def roundsArray = source.conversation_rounds != null ? source.conversation_rounds : source.rounds;
  long total = 0;
  if (roundsArray != null) {
    for (def round : roundsArray) {
      if (round.model_usage != null) {
        total += round.model_usage.output_tokens != null ? round.model_usage.output_tokens : 0;
      }
    }
  }
  return total;
`;

/** Painless script that returns the number of rounds in a conversation. */
export const ROUND_COUNT_SCRIPT = `
  def source = params._source;
  def roundsArray = source.conversation_rounds != null ? source.conversation_rounds : source.rounds;
  return roundsArray != null ? roundsArray.size() : 0;
`;

/** Painless script that sums llm_calls across all rounds. */
export const LLM_CALLS_SCRIPT = `
  def source = params._source;
  def roundsArray = source.conversation_rounds != null ? source.conversation_rounds : source.rounds;
  long total = 0;
  if (roundsArray != null) {
    for (def round : roundsArray) {
      if (round.model_usage != null) {
        total += round.model_usage.llm_calls != null ? round.model_usage.llm_calls : 0;
      }
    }
  }
  return total;
`;

/**
 * Returns an array of maps with {round_id, input_tokens} for any round
 * whose input_tokens exceed the given threshold parameter.
 */
export const HIGH_TOKEN_ROUNDS_SCRIPT = `
  def source = params._source;
  def threshold = params.threshold;
  def roundsArray = source.conversation_rounds != null ? source.conversation_rounds : source.rounds;
  def results = [];
  if (roundsArray != null) {
    for (def round : roundsArray) {
      if (round.model_usage != null) {
        def tokens = round.model_usage.input_tokens != null ? round.model_usage.input_tokens : 0;
        if (tokens > threshold) {
          def entry = new HashMap();
          entry.put('round_id', round.id != null ? round.id : 'unknown');
          entry.put('input_tokens', tokens);
          results.add(entry);
        }
      }
    }
  }
  return results;
`;

/** Sums input_tokens + output_tokens across all rounds for sorting by total tokens. */
export const TOTAL_TOKENS_SORT_SCRIPT = `
  def source = params._source;
  def roundsArray = source.conversation_rounds != null ? source.conversation_rounds : source.rounds;
  long total = 0;
  if (roundsArray != null) {
    for (def round : roundsArray) {
      if (round.model_usage != null) {
        total += round.model_usage.input_tokens != null ? round.model_usage.input_tokens : 0;
        total += round.model_usage.output_tokens != null ? round.model_usage.output_tokens : 0;
      }
    }
  }
  return total;
`;

/**
 * Builds the sort clause for the ES query. For `updated_at` we sort on the
 * native date field; for computed fields (`total_tokens`, `round_count`) we
 * use a `_script` sort with the same Painless logic used in script_fields.
 */
export const buildSortClause = (sortField: ConsumptionSortField, sortOrder: 'asc' | 'desc') => {
  const tiebreaker = { created_at: { order: 'asc' as const } };

  if (sortField === 'updated_at') {
    return [{ updated_at: { order: sortOrder } }, tiebreaker];
  }

  const scriptSource = sortField === 'total_tokens' ? TOTAL_TOKENS_SORT_SCRIPT : ROUND_COUNT_SCRIPT;

  return [
    {
      _script: {
        type: 'number' as const,
        script: { source: scriptSource, lang: 'painless' },
        order: sortOrder,
      },
    },
    tiebreaker,
  ];
};

// ---------------------------------------------------------------------------
// Consumption query & response helpers
// ---------------------------------------------------------------------------

export interface ConsumptionQueryParams {
  space: string;
  agentId: string;
  usernameFilter?: string[];
  searchText?: string;
  hasWarningsFilter?: boolean;
}

/**
 * Builds the bool query and optional runtime mappings for the consumption data
 * search. Handles space/agent scoping, username filtering, free-text title
 * search, and the has_warnings runtime field.
 */
export const buildConsumptionQuery = ({
  space,
  agentId,
  usernameFilter,
  searchText,
  hasWarningsFilter,
}: ConsumptionQueryParams) => {
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

  const runtimeMappings: MappingRuntimeFields = {};

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

  return { query, runtimeMappings };
};

export interface ConsumptionDataSearchOptions {
  query: Record<string, unknown>;
  runtimeMappings: MappingRuntimeFields;
  size: number;
  sortField: ConsumptionSortField;
  sortOrder: 'asc' | 'desc';
  searchAfter?: FieldValue[];
}

/**
 * Assembles the full ES search request params for the consumption data query,
 * including script_fields for token/round/LLM aggregation, sorting, and
 * cursor-based pagination.
 */
export const buildConsumptionDataSearchParams = ({
  query,
  runtimeMappings,
  size,
  sortField,
  sortOrder,
  searchAfter,
}: ConsumptionDataSearchOptions) => {
  const hasRuntimeMappings = Object.keys(runtimeMappings).length > 0;

  return {
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
    sort: buildSortClause(sortField, sortOrder),
    ...(searchAfter ? { search_after: searchAfter } : {}),
  };
};

/**
 * Assembles the ES search request params for the aggregation-only query that
 * retrieves the distinct usernames for a given agent within a space.
 */
export const buildConsumptionAggsSearchParams = (space: string, agentId: string) => ({
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

/**
 * Maps raw ES hits (with _source + script_fields) into the
 * `ConversationConsumption[]` shape returned by the API. Handles the
 * high-token-rounds flattening and warning extraction.
 */
export const mapHitsToConsumptionResults = (
  hits: Array<SearchHit<unknown>>
): ConversationConsumption[] =>
  hits.map((hit) => {
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

/**
 * Composes the final `ConsumptionResponse` body from the data and aggregation
 * ES responses. Extracts total count, maps hits, pulls out unique usernames,
 * and computes the next search_after cursor.
 */
export const buildConsumptionResponseBody = (
  esResponse: SearchResponse,
  aggsResponse: SearchResponse
): ConsumptionResponse => {
  const total = (esResponse.hits.total as { value: number } | undefined)?.value ?? 0;
  const results = mapHitsToConsumptionResults(esResponse.hits.hits);

  const usernameBuckets = (aggsResponse.aggregations?.usernames as any)?.buckets ?? [];
  const aggregations: ConsumptionAggregations = {
    usernames: usernameBuckets.map((b: { key: string }) => b.key),
    total_with_warnings: 0,
  };

  const lastHit = esResponse.hits.hits[esResponse.hits.hits.length - 1];
  const nextSearchAfter = lastHit?.sort;

  return {
    results,
    total,
    aggregations,
    ...(nextSearchAfter ? { search_after: nextSearchAfter } : {}),
  };
};
