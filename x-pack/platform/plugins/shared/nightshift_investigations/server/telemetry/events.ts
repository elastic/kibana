/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EventTypeOpts, RootSchema } from '@kbn/core/server';

export const NIGHTSHIFT_SEMANTIC_MEMORY_MATERIALIZED_EVENT =
  'nightshift-semantic-memory-materialized';
export const NIGHTSHIFT_SEMANTIC_MEMORY_OPTIMIZED_EVENT = 'nightshift-semantic-memory-optimized';

export type NightshiftMemoryTelemetryOutcome = 'success' | 'failure';

export interface SemanticMemoryMaterializedEvent {
  agent_id: string;
  conversation_id?: string;
  workflow_execution_id: string;
  outcome: NightshiftMemoryTelemetryOutcome;
  retrieval_mode?: 'search' | 'browse';
  search_fallback?: boolean;
  candidate_count?: number;
  recalled_count?: number;
  new_page_count?: number;
  catalog_size?: number;
  pod_reset?: boolean;
  notification_chars?: number;
}

export interface SemanticMemoryOptimizedEvent {
  agent_id: string;
  conversation_id?: string;
  round_id?: string;
  workflow_execution_id: string;
  outcome: NightshiftMemoryTelemetryOutcome;
  recalled_count?: number;
  loaded_count?: number;
  useful_count?: number;
  harmful_count?: number;
  extraction_proposed_count?: number;
  standalone_upsert_count?: number;
  safety_skip_count?: number;
  merge_attempt_count?: number;
  merge_success_count?: number;
  harmful_archive_count?: number;
  merged_source_archive_count?: number;
  write_failure_count?: number;
}

const commonSchema = {
  agent_id: {
    type: 'keyword' as const,
    _meta: { description: 'Agent that owns the Semantic Memory operation.' },
  },
  conversation_id: {
    type: 'keyword' as const,
    _meta: {
      description: 'Agent Builder conversation id, when present.',
      optional: true as const,
    },
  },
  workflow_execution_id: {
    type: 'keyword' as const,
    _meta: { description: 'Workflow execution id used to join workflow terminal telemetry.' },
  },
  outcome: {
    type: 'keyword' as const,
    _meta: { description: 'Whether the domain operation succeeded or failed.' },
  },
};

const materializedSchema: RootSchema<SemanticMemoryMaterializedEvent> = {
  ...commonSchema,
  retrieval_mode: {
    type: 'keyword',
    _meta: { description: 'Final retrieval mode: search or browse.', optional: true },
  },
  search_fallback: {
    type: 'boolean',
    _meta: { description: 'Whether a zero-hit search fell back to browse.', optional: true },
  },
  candidate_count: {
    type: 'long',
    _meta: { description: 'Candidates loaded before ranking.', optional: true },
  },
  recalled_count: {
    type: 'long',
    _meta: { description: 'Pages retained after ranking.', optional: true },
  },
  new_page_count: {
    type: 'long',
    _meta: { description: 'Page paths newly written and announced this turn.', optional: true },
  },
  catalog_size: {
    type: 'long',
    _meta: { description: 'Entries in the additive conversation catalog.', optional: true },
  },
  pod_reset: {
    type: 'boolean',
    _meta: {
      description: 'Whether the sandbox workspace was reset before materialize.',
      optional: true,
    },
  },
  notification_chars: {
    type: 'long',
    _meta: {
      description: 'Character count of the generated model-context fragment.',
      optional: true,
    },
  },
};

const optimizedSchema: RootSchema<SemanticMemoryOptimizedEvent> = {
  ...commonSchema,
  round_id: {
    type: 'keyword',
    _meta: { description: 'Completed Agent Builder round id, when present.', optional: true },
  },
  recalled_count: {
    type: 'long',
    _meta: { description: 'Ids recorded as recalled for the round.', optional: true },
  },
  loaded_count: {
    type: 'long',
    _meta: { description: 'Recalled pages still live when optimize loaded them.', optional: true },
  },
  useful_count: {
    type: 'long',
    _meta: { description: 'Recalled pages labeled useful.', optional: true },
  },
  harmful_count: {
    type: 'long',
    _meta: { description: 'Recalled pages labeled harmful.', optional: true },
  },
  extraction_proposed_count: {
    type: 'long',
    _meta: { description: 'New memory extractions proposed by the model.', optional: true },
  },
  standalone_upsert_count: {
    type: 'long',
    _meta: { description: 'Extractions upserted without a merge.', optional: true },
  },
  safety_skip_count: {
    type: 'long',
    _meta: { description: 'Extractions skipped by secret-safety checks.', optional: true },
  },
  merge_attempt_count: {
    type: 'long',
    _meta: { description: 'Merge groups sent for synthesis.', optional: true },
  },
  merge_success_count: {
    type: 'long',
    _meta: { description: 'Canonical merged pages written successfully.', optional: true },
  },
  harmful_archive_count: {
    type: 'long',
    _meta: { description: 'Harmful recalled pages archived.', optional: true },
  },
  merged_source_archive_count: {
    type: 'long',
    _meta: { description: 'Source pages archived after canonical merge writes.', optional: true },
  },
  write_failure_count: {
    type: 'long',
    _meta: { description: 'Caught upsert or post-merge archive failures.', optional: true },
  },
};

export const semanticMemoryMaterializedEvent: EventTypeOpts<SemanticMemoryMaterializedEvent> = {
  eventType: NIGHTSHIFT_SEMANTIC_MEMORY_MATERIALIZED_EVENT,
  schema: materializedSchema,
};

export const semanticMemoryOptimizedEvent: EventTypeOpts<SemanticMemoryOptimizedEvent> = {
  eventType: NIGHTSHIFT_SEMANTIC_MEMORY_OPTIMIZED_EVENT,
  schema: optimizedSchema,
};
