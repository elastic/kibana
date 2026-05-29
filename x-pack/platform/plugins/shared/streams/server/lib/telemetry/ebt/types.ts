/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignificantEventsToolUsage } from '@kbn/streams-ai';
import type { StreamType } from '@kbn/streams-schema';

interface StreamEndpointLatencyProps {
  name: string;
  endpoint: string;
  duration_ms: number;
}

interface StreamsStateErrorProps {
  error: {
    name: string;
    message: string;
    stack_trace?: string;
  };
  status_code: number;
}

interface StreamsDescriptionGeneratedProps {
  input_tokens_used: number;
  output_tokens_used: number;
  stream_name: string;
  stream_type: StreamType;
}
interface StreamsSignificantEventsQueriesGeneratedProps {
  count: number;
  input_tokens_used: number;
  output_tokens_used: number;
  stream_name: string;
  stream_type: StreamType;
  tool_usage: SignificantEventsToolUsage;
}

interface StreamsInsightsGeneratedProps {
  input_tokens_used: number;
  output_tokens_used: number;
  cached_tokens_used?: number;
}

interface StreamsProcessingPipelineSuggestedProps {
  duration_ms: number;
  steps_used: number;
  success: boolean;
  stream_name: string;
  stream_type: StreamType;
  source: 'ui' | 'agent';
  flow?: 'extract_fields' | 'nl_to_streamlang' | 'refine_extracted_field';
  extract_fields_fallback_reason?: string;
  /**
   * Source-field conflict observability. Populated only when
   * `source: 'agent'` and the extract_fields heuristic actually picked a
   * raw-text source field (i.e. samples were available and a candidate
   * field was found). Used to answer "how often does the auto-pick clash
   * with an existing step?" without committing to the upfront-gate UX.
   * See SOURCE_FIELD_CONFLICT_DECISION.md.
   */
  source_field_conflict_detected?: boolean;
  /**
   * Source-field conflict observability. Populated whenever the
   * extract_fields path ran (regardless of whether heuristics succeeded).
   * `true` when the agent passed `seed_source_field` to override the
   * auto-pick — proxies for "user redirected after seeing a post-fact
   * warning" once conversation-id linkage lands in Phase 2.
   */
  source_field_explicitly_set?: boolean;
  /**
   * Source-field conflict observability. The field the seed
   * parser actually read from (whether auto-picked from
   * PRIORITIZED_CONTENT_FIELDS or supplied via `seed_source_field`).
   * Helps measure which prioritized field wins most often and whether
   * the prioritization order matches real data shapes.
   */
  source_field_picked?: string;
}

interface StreamsFeaturesIdentifiedProps {
  run_id: string;
  iteration: number;
  docs_count: number;
  features_new: number;
  features_updated: number;
  total_filters: number;
  filters_capped: boolean;
  has_filtered_documents: boolean;
  input_tokens_used: number;
  output_tokens_used: number;
  total_tokens_used: number;
  cached_tokens_used: number;
  duration_ms: number;
  excluded_features_count: number;
  llm_ignored_count: number;
  code_ignored_count: number;
  stream_name: string;
  stream_type: StreamType;
  state: 'success' | 'failure' | 'canceled';
}

interface StreamsAgentBuilderKnowledgeIndicatorCreatedProps {
  ki_kind: 'feature' | 'query';
  tool_id: 'ki_feature_create' | 'ki_query_create';
  success: boolean;
  stream_name: string;
  stream_type: StreamType | 'unknown';
  error_message?: string;
}

interface StreamsAgentToolKiIdentificationStartedProps {
  success: boolean;
  stream_name: string;
  error_message?: string;
}

export {
  type StreamEndpointLatencyProps,
  type StreamsStateErrorProps,
  type StreamsDescriptionGeneratedProps,
  type StreamsSignificantEventsQueriesGeneratedProps,
  type StreamsInsightsGeneratedProps,
  type StreamsProcessingPipelineSuggestedProps,
  type StreamsFeaturesIdentifiedProps,
  type StreamsAgentBuilderKnowledgeIndicatorCreatedProps,
  type StreamsAgentToolKiIdentificationStartedProps,
};
