/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BoundInferenceClient } from '@kbn/inference-common';
import { MessageRole } from '@kbn/inference-common';
import type { SearchRequest } from '@elastic/elasticsearch/lib/api/types';
import dedent from 'dedent';

/*
 * NL-to-ES-DSL translation via constrained LLM
 *
 * This module translates natural language queries into Elasticsearch search
 * request bodies using a secondary LLM call. The caller (query_documents tool)
 * provides a grounded list of available fields with their types and capability
 * tiers so the LLM can select correct field names and appropriate DSL constructs.
 *
 * Fields are classified into three tiers by the caller:
 *
 *   aggregatable — fully indexed; can be used in queries, aggregations, and sorting.
 *   not aggregatable — indexed for search only (typically text fields). Cannot be
 *                      used in aggregations or sorting.
 *   source-only — NOT indexed. Exists only in document _source. Common in OTel
 *                 streams where logsdb's `ignore_dynamic_beyond_limit` drops
 *                 dynamic fields beyond the mapping limit from the index but
 *                 preserves them in synthetic source.
 *
 * When a user asks to aggregate on a source-only field, the LLM cannot produce a
 * valid aggregation. Instead it falls back to returning documents and emits a
 * `_warning` string that the caller surfaces in the tool result, giving the outer
 * agent enough context to explain the limitation to the user.
 */
const NL_TO_ES_DSL_SYSTEM_PROMPT = dedent(`
  You translate natural language queries into Elasticsearch search request bodies.
  Respond with ONLY a valid JSON object. No markdown fences, no explanation, no text before or after.

  The JSON object must have this structure (all fields optional):
  {
    "query": <Elasticsearch query DSL>,
    "aggs": <Elasticsearch aggregations>,
    "sort": <Elasticsearch sort array>,
    "size": <number of documents to return>,
    "_warning": <optional string explaining why the request could not be fully fulfilled>
  }

  Rules:
  - Only use field names from the "Available fields" list provided with each query. If the user refers to a field by a common name (e.g. "user name"), map it to the closest matching available field (e.g. "attributes.user.name")
  - Each field has a type and a capability tier. Use both to select the right DSL construct:
    keyword, aggregatable -> "term" for exact match, "terms" aggregation for top values, usable in sort
    text, not aggregatable -> "match" for search. CANNOT be used in aggregations or sorting
    match_only_text, not aggregatable -> use "match" for full terms only. This type does NOT split tokens at periods or special characters (e.g. "chrome.exe" is one token, so "chrome" alone will NOT match). Always use the most specific/complete term. For substring matching, use "wildcard" with "*term*". CANNOT be used in aggregations or sorting
    long/integer/float/double, aggregatable -> numeric "range", metric aggregations (avg, sum, etc.)
    date, aggregatable -> "range" with date math, "date_histogram" for time bucketing
    unmapped, source-only -> NOT indexed. CANNOT be used in query, aggs, or sort. These fields only appear in returned document _source
  - When aggregating (top values, counts, stats, histograms), always set "size": 0
  - When fetching documents, default sort to [{ "@timestamp": { "order": "desc" } }]
  - When no filter is specified, use { "match_all": {} } as the query
  - For time ranges, use "range" on "@timestamp" with ES date math (e.g. "now-1h", "now-24h")
  - For "top N" or "most common" requests, use a "terms" aggregation with the appropriate size
  - If the request requires aggregating, filtering, or sorting on a source-only field, do NOT attempt the aggregation. Instead set "size" to a reasonable document count (e.g. 100) so values can be read from the returned documents, and add a "_warning" string explaining that the field is unmapped and suggesting the user maps it in the stream definition to enable aggregations

  Examples:

  Input: "show me 10 recent documents"
  Output: { "query": { "match_all": {} }, "sort": [{ "@timestamp": { "order": "desc" } }], "size": 10 }

  Input: "top 5 values of host.name" (host.name is keyword, aggregatable)
  Output: { "query": { "match_all": {} }, "aggs": { "top_values": { "terms": { "field": "host.name", "size": 5 } } }, "size": 0 }

  Input: "count documents by log.level"
  Output: { "query": { "match_all": {} }, "aggs": { "by_level": { "terms": { "field": "log.level", "size": 20 } } }, "size": 0 }

  Input: "average response time in the last hour"
  Output: { "query": { "range": { "@timestamp": { "gte": "now-1h" } } }, "aggs": { "avg_response_time": { "avg": { "field": "response_time" } } }, "size": 0 }

  Input: "errors from host web-01 in the last 24 hours"
  Output: { "query": { "bool": { "must": [{ "term": { "host.name": "web-01" } }, { "match": { "log.level": "error" } }, { "range": { "@timestamp": { "gte": "now-24h" } } }] } }, "sort": [{ "@timestamp": { "order": "desc" } }], "size": 20 }

  Input: "document count over time in 1-hour buckets"
  Output: { "query": { "match_all": {} }, "aggs": { "over_time": { "date_histogram": { "field": "@timestamp", "fixed_interval": "1h" } } }, "size": 0 }

  Input: "documents mentioning chrome" (message is match_only_text, not aggregatable)
  Output: { "query": { "wildcard": { "message": { "value": "*chrome*" } } }, "sort": [{ "@timestamp": { "order": "desc" } }], "size": 20 }

  Input: "top 5 user names" (attributes.user.name is unmapped, source-only)
  Output: { "query": { "match_all": {} }, "sort": [{ "@timestamp": { "order": "desc" } }], "size": 100, "_warning": "Field 'attributes.user.name' is unmapped and can't be aggregated. Values were extracted from recent documents instead. To enable aggregations, map this field in the stream definition." }
`);

interface TranslatedSearchParams {
  query?: SearchRequest['query'];
  aggs?: SearchRequest['aggs'];
  sort?: SearchRequest['sort'];
  size?: number;
  _warning?: string;
}

export const extractJson = (text: string): string => {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) {
    return fenced[1].trim();
  }
  return text.trim();
};

export const translateNlToEsDsl = async ({
  nlQuery,
  inferenceClient,
  availableFields,
}: {
  nlQuery: string;
  inferenceClient: BoundInferenceClient;
  availableFields: string;
}): Promise<TranslatedSearchParams> => {
  const userMessage = `Available fields: ${availableFields}\n\nQuery: ${nlQuery}`;

  const response = await inferenceClient.chatComplete({
    system: NL_TO_ES_DSL_SYSTEM_PROMPT,
    messages: [{ role: MessageRole.User, content: userMessage }],
  });

  const raw = extractJson(response.content ?? '');

  try {
    const parsed = JSON.parse(raw) as TranslatedSearchParams;
    return parsed;
  } catch (parseError) {
    throw new Error(`Failed to parse LLM response as JSON. Raw response: ${raw.slice(0, 500)}`);
  }
};
