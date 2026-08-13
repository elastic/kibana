/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { EvaluationCriterionStructured } from '@kbn/evals';
import type { Detection, SignificantEvent } from '@kbn/significant-events-schema';
import type { GcsConfig } from '../data_generators/replay';
import type { ValidKIFeatureType } from '../evaluators/ki_feature_extraction';

export interface SamplingCriterion extends EvaluationCriterionStructured {
  sampling_filters?: QueryDslQueryContainer[];
}

interface ScenarioMetadata {
  difficulty: 'easy' | 'medium' | 'hard';
  failure_domain: string;
  failure_mode?: string;
}

export interface SnapshotSourceOverride {
  snapshot_name?: string;
  gcs?: {
    basePathPrefix?: GcsConfig['basePathPrefix'];
  };
}

export interface KIQueryGenerationScenario {
  input: {
    scenario_id: string;
    stream_name: string;
    stream_description: string;
  };
  output: {
    criteria: SamplingCriterion[];
    expected_categories: string[];
    expected_ground_truth: string;
    expect_stats?: boolean;
  };
  metadata: Record<string, unknown> & ScenarioMetadata;
  snapshot_source?: SnapshotSourceOverride;
}

export interface KIFeatureExtractionScenario {
  input: {
    scenario_id: string;
    log_query_filter?: QueryDslQueryContainer[];
  };
  output: {
    criteria: SamplingCriterion[];
    min_features?: number;
    max_features?: number;
    required_types?: ValidKIFeatureType[];
    expect_entity_filters?: boolean;
    expected_ground_truth: string;
  };
  metadata: Record<string, unknown> & ScenarioMetadata;
  snapshot_source?: SnapshotSourceOverride;
}

/**
 * A dataset provider supplies snapshot source defaults and evaluation criteria
 * for both KI query generation and KI feature extraction evals.
 *
 * To add a new dataset:
 * 1. Create a file in this directory (e.g. `my_app.ts`, similar to otel_demo)
 * 2. Export a `DatasetConfig` with your source defaults and scenarios
 * 3. Register it in `index.ts`
 * 4. Run evals with: `SIGEVENTS_DATASET=my-app node scripts/evals run ...`
 */
export interface KIFeatureExclusionScenario {
  input: {
    scenario_id: string;
    sample_document_count: number;
    exclude_count: number;
    follow_up_runs: number;
  };
  snapshot_source?: SnapshotSourceOverride;
}

export interface KIFeatureDeduplicationScenario {
  input: {
    scenario_id: string;
    iterations: number;
  };
  snapshot_source?: SnapshotSourceOverride;
}

export interface DiscoveryScenario {
  input: {
    scenario_id: string;
    stream_name: string;
    detections: Array<Partial<Detection>>;
  };
  /** Ordered ground-truth continuation chains by `rule_name`, keyed by continuation path label. */
  continuationChains?: Record<string, string[]>;
  output: {
    criteria: SamplingCriterion[];
    expected_min_evidence_count?: number;
    /** Human-readable summary of expected output for quick orientation. */
    expected_ground_truth?: string;
    /** Expected confirmed rule UUIDs keyed by event ID. */
    expected_confirmed_rule_uuids?: Record<string, string[]>;
    /**
     * The significant events the agent is expected to generate — signals + causal_features +
     * blast_radius + status. The grouping check derives its expected groups from these events'
     * `signals[].metadata.rule_uuid`s.
     */
    expected_significant_events: Array<Partial<SignificantEvent>>;
  };
  metadata: Record<string, unknown> & ScenarioMetadata;
  snapshot_source?: SnapshotSourceOverride;
}

export interface DatasetConfig {
  id: string;
  description: string;
  gcs: GcsConfig;
  kiQueryGeneration: KIQueryGenerationScenario[];
  kiFeatureExtraction: KIFeatureExtractionScenario[];
  kiFeatureExclusion: KIFeatureExclusionScenario[];
  kiFeatureDeduplication: KIFeatureDeduplicationScenario[];
  discovery: DiscoveryScenario[];
}
