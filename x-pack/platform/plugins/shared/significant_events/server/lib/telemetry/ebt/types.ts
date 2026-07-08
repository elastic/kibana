/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignificantEventsToolUsage } from '@kbn/streams-ai';
import type { StreamType } from '@kbn/streams-schema';
import type { SignificantEventStatus } from '@kbn/significant-events-schema';

interface EndpointLatencyProps {
  name: string;
  endpoint: string;
  duration_ms: number;
}

interface KnowledgeIndicatorQueriesGeneratedProps {
  count: number;
  connector_id: string;
  input_tokens_used: number;
  output_tokens_used: number;
  cached_tokens_used: number;
  duration_ms: number;
  stream_name: string;
  stream_type: StreamType;
  tool_usage: SignificantEventsToolUsage;
}

interface KnowledgeIndicatorFeaturesIdentifiedProps {
  run_id: string;
  connector_id: string;
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

interface AgentBuilderKnowledgeIndicatorCreatedProps {
  ki_kind: 'feature' | 'query';
  tool_id: 'ki_feature_create' | 'ki_query_create';
  success: boolean;
  stream_name: string;
  stream_type: StreamType | 'unknown';
  error_message?: string;
}

interface AgentToolKnowledgeIndicatorIdentificationStartedProps {
  success: boolean;
  stream_name: string;
  error_message?: string;
}

interface AgentToolEventCreateProps {
  success: boolean;
  stream_names: string[];
  error_message?: string;
}

interface AgentToolEventStatusUpdateProps {
  success: boolean;
  event_id: string;
  status: SignificantEventStatus;
  error_message?: string;
}

interface AgentToolEventInvestigationAttachProps {
  success: boolean;
  event_id: string;
  workflow_execution_id: string;
  error_message?: string;
}

interface CodeAnalysisGroundingProps {
  stream_name: string;
  stream_type: string;
  /**
   * Outcome of the code_analysis computed feature: `feature` (a repository was
   * selected and a feature emitted), `no_match` (candidates existed but none
   * verified enough strings), `no_candidates`, `no_strings`, or `unavailable`
   * (SCS / Agent Builder not installed).
   */
  status: string;
  repository?: string;
  candidate_count: number;
  verified_count: number;
}

interface DiscoveryTriggeredProps {
  execution_id: string;
  space_id: string;
}

interface DetectionScanProps {
  /** ES `took` (ms) reported by the alerts-source search itself. */
  took_ms: number;
  /** Wall-clock (ms) around the reader call, including transport and parsing. */
  duration_ms: number;
  /** Number of distinct rules covered by the change-point scan. */
  rules_scanned: number;
  /** Resolved alerting engine backing the read: `v2` reads `.rule-events`, `v1` reads `.alerts-*`. */
  alerting_engine: 'v1' | 'v2';
  /** The alerts-source index that was read (e.g. `.rule-events`). */
  alerts_source_index: string;
  /** The scan lookback window, e.g. `now-30m`. */
  lookback: string;
  /** The change-point bucket interval, e.g. `30s`. */
  bucket_interval: string;
  /** The Kibana space in which the scan ran. */
  space_id: string;
}

interface KnowledgeIndicatorOnboardingScheduledProps {
  stream_name: string;
  execution_id: string;
  workflow_id: string;
  space_id: string;
  skip_features: boolean;
  skip_queries: boolean;
}

export {
  type AgentBuilderKnowledgeIndicatorCreatedProps,
  type AgentToolKnowledgeIndicatorIdentificationStartedProps,
  type AgentToolEventCreateProps,
  type AgentToolEventInvestigationAttachProps,
  type AgentToolEventStatusUpdateProps,
  type CodeAnalysisGroundingProps,
  type DetectionScanProps,
  type DiscoveryTriggeredProps,
  type EndpointLatencyProps,
  type KnowledgeIndicatorQueriesGeneratedProps,
  type KnowledgeIndicatorFeaturesIdentifiedProps,
  type KnowledgeIndicatorOnboardingScheduledProps,
};
