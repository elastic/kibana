import type { FieldValue, MappingRuntimeFields, SearchHit, SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import type { ConsumptionSortField, ConsumptionResponse, ConversationConsumption } from '../../../common/http_api/consumption';
/** Conversations index resolved from the chat system index helper. */
export declare const conversationIndexName: string;
/** Rounds with input tokens above this value are flagged as high-token warnings. */
export declare const HIGH_INPUT_TOKEN_THRESHOLD = 200000;
/**
 * Painless script that iterates over conversation_rounds (or legacy `rounds`)
 * and sums input_tokens across all rounds in a single conversation document.
 */
export declare const INPUT_TOKENS_SCRIPT = "\n  def source = params._source;\n  def roundsArray = source.conversation_rounds != null ? source.conversation_rounds : source.rounds;\n  long total = 0;\n  if (roundsArray != null) {\n    for (def round : roundsArray) {\n      if (round.model_usage != null) {\n        total += round.model_usage.input_tokens != null ? round.model_usage.input_tokens : 0;\n      }\n    }\n  }\n  return total;\n";
/** Painless script that sums output_tokens across all rounds. */
export declare const OUTPUT_TOKENS_SCRIPT = "\n  def source = params._source;\n  def roundsArray = source.conversation_rounds != null ? source.conversation_rounds : source.rounds;\n  long total = 0;\n  if (roundsArray != null) {\n    for (def round : roundsArray) {\n      if (round.model_usage != null) {\n        total += round.model_usage.output_tokens != null ? round.model_usage.output_tokens : 0;\n      }\n    }\n  }\n  return total;\n";
/** Painless script that returns the number of rounds in a conversation. */
export declare const ROUND_COUNT_SCRIPT = "\n  def source = params._source;\n  def roundsArray = source.conversation_rounds != null ? source.conversation_rounds : source.rounds;\n  return roundsArray != null ? roundsArray.size() : 0;\n";
/** Painless script that sums llm_calls across all rounds. */
export declare const LLM_CALLS_SCRIPT = "\n  def source = params._source;\n  def roundsArray = source.conversation_rounds != null ? source.conversation_rounds : source.rounds;\n  long total = 0;\n  if (roundsArray != null) {\n    for (def round : roundsArray) {\n      if (round.model_usage != null) {\n        total += round.model_usage.llm_calls != null ? round.model_usage.llm_calls : 0;\n      }\n    }\n  }\n  return total;\n";
/**
 * Returns an array of maps with {round_id, input_tokens} for any round
 * whose input_tokens exceed the given threshold parameter.
 */
export declare const HIGH_TOKEN_ROUNDS_SCRIPT = "\n  def source = params._source;\n  def threshold = params.threshold;\n  def roundsArray = source.conversation_rounds != null ? source.conversation_rounds : source.rounds;\n  def results = [];\n  if (roundsArray != null) {\n    for (def round : roundsArray) {\n      if (round.model_usage != null) {\n        def tokens = round.model_usage.input_tokens != null ? round.model_usage.input_tokens : 0;\n        if (tokens > threshold) {\n          def entry = new HashMap();\n          entry.put('round_id', round.id != null ? round.id : 'unknown');\n          entry.put('input_tokens', tokens);\n          results.add(entry);\n        }\n      }\n    }\n  }\n  return results;\n";
/** Sums input_tokens + output_tokens across all rounds for sorting by total tokens. */
export declare const TOTAL_TOKENS_SORT_SCRIPT = "\n  def source = params._source;\n  def roundsArray = source.conversation_rounds != null ? source.conversation_rounds : source.rounds;\n  long total = 0;\n  if (roundsArray != null) {\n    for (def round : roundsArray) {\n      if (round.model_usage != null) {\n        total += round.model_usage.input_tokens != null ? round.model_usage.input_tokens : 0;\n        total += round.model_usage.output_tokens != null ? round.model_usage.output_tokens : 0;\n      }\n    }\n  }\n  return total;\n";
/**
 * Builds the sort clause for the ES query. For `updated_at` we sort on the
 * native date field; for computed fields (`total_tokens`, `round_count`) we
 * use a `_script` sort with the same Painless logic used in script_fields.
 */
export declare const buildSortClause: (sortField: ConsumptionSortField, sortOrder: "asc" | "desc") => ({
    created_at: {
        order: "asc";
    };
} | {
    updated_at: {
        order: "desc" | "asc";
    };
})[] | ({
    created_at: {
        order: "asc";
    };
} | {
    _script: {
        type: "number";
        script: {
            source: string;
            lang: string;
        };
        order: "desc" | "asc";
    };
})[];
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
export declare const buildConsumptionQuery: ({ space, agentId, usernameFilter, searchText, hasWarningsFilter, }: ConsumptionQueryParams) => {
    query: {
        bool: {
            must?: Record<string, unknown>[] | undefined;
            filter: Record<string, unknown>[];
        };
    };
    runtimeMappings: MappingRuntimeFields;
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
export declare const buildConsumptionDataSearchParams: ({ query, runtimeMappings, size, sortField, sortOrder, searchAfter, }: ConsumptionDataSearchOptions) => {
    search_after?: FieldValue[] | undefined;
    script_fields: {
        total_input_tokens: {
            script: {
                source: string;
                lang: string;
            };
        };
        total_output_tokens: {
            script: {
                source: string;
                lang: string;
            };
        };
        round_count: {
            script: {
                source: string;
                lang: string;
            };
        };
        total_llm_calls: {
            script: {
                source: string;
                lang: string;
            };
        };
        high_token_rounds: {
            script: {
                source: string;
                lang: string;
                params: {
                    threshold: number;
                };
            };
        };
    };
    sort: ({
        created_at: {
            order: "asc";
        };
    } | {
        updated_at: {
            order: "desc" | "asc";
        };
    })[] | ({
        created_at: {
            order: "asc";
        };
    } | {
        _script: {
            type: "number";
            script: {
                source: string;
                lang: string;
            };
            order: "desc" | "asc";
        };
    })[];
    runtime_mappings?: MappingRuntimeFields | undefined;
    index: string;
    track_total_hits: boolean;
    size: number;
    _source: string[];
    query: Record<string, unknown>;
};
/**
 * Assembles the ES search request params for the aggregation-only query that
 * retrieves the distinct usernames for a given agent within a space.
 */
export declare const buildConsumptionAggsSearchParams: (space: string, agentId: string) => {
    index: string;
    size: number;
    query: {
        bool: {
            filter: import("@elastic/elasticsearch/lib/api/types").QueryDslQueryContainer[];
        };
    };
    aggs: {
        usernames: {
            terms: {
                field: string;
                size: number;
            };
        };
    };
};
/**
 * Maps raw ES hits (with _source + script_fields) into the
 * `ConversationConsumption[]` shape returned by the API. Handles the
 * high-token-rounds flattening and warning extraction.
 */
export declare const mapHitsToConsumptionResults: (hits: Array<SearchHit<unknown>>) => ConversationConsumption[];
/**
 * Composes the final `ConsumptionResponse` body from the data and aggregation
 * ES responses. Extracts total count, maps hits, pulls out unique usernames,
 * and computes the next search_after cursor.
 */
export declare const buildConsumptionResponseBody: (esResponse: SearchResponse, aggsResponse: SearchResponse) => ConsumptionResponse;
