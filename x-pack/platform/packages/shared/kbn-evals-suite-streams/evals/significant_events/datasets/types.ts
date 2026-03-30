/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluationCriterion } from '@kbn/evals';
import type { GcsConfig } from '../../../src/data_generators/replay';
import type { ValidKIFeatureType } from '../../../src/evaluators/ki_feature_extraction/evaluators';

interface ScenarioMetadata {
  difficulty: 'easy' | 'medium' | 'hard';
  failure_domain: string;
  failure_mode: string;
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
    criteria: EvaluationCriterion[];
    expected_categories: string[];
    esql_substrings?: string[];
    expected_ground_truth: string;
  };
  metadata: Record<string, unknown> & ScenarioMetadata;
  snapshot_source?: SnapshotSourceOverride;
}

export interface KIFeatureExtractionScenario {
  input: {
    scenario_id: string;
    log_query_filter?: Record<string, unknown>;
  };
  output: {
    criteria: EvaluationCriterion[];
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

export interface KIFeatureDuplicationScenario {
  input: {
    scenario_id: string;
    sample_document_count: number;
    runs: number;
  };
  snapshot_source?: SnapshotSourceOverride;
}

export interface DatasetConfig {
  id: string;
  description: string;
  gcs: GcsConfig;
  kiQueryGeneration: KIQueryGenerationScenario[];
  kiFeatureExtraction: KIFeatureExtractionScenario[];
  kiFeatureExclusion: KIFeatureExclusionScenario[];
  kiFeatureDuplication: KIFeatureDuplicationScenario[];
}
