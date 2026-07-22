/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { EvaluationCriterionStructured } from '@kbn/evals';
import type { Detection, Discovery, SignificantEventStatus } from '@kbn/significant-events-schema';
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
    /** Human-readable summary of expected output for quick orientation (e.g. `discoveries=[cascade, benign-auth]`). */
    expected_ground_truth?: string;
    /**
     * The discoveries the agent is expected to generate — same shape as the judge's
     * `input.discoveries` (signals + causal_features + blast_radius). This is the canonical ground
     * truth: the grouping check derives its expected groups from these `signals[].metadata.rule_uuid`s,
     * and the same discoveries feed the judge scenario's input so the two stages stay consistent.
     */
    expected_discoveries: Array<Partial<Discovery>>;
  };
  metadata: Record<string, unknown> & ScenarioMetadata;
  snapshot_source?: SnapshotSourceOverride;
}

export interface DiscoveryJudgeScenario {
  id?: string;
  input: {
    scenario_id: string;
    discoveries: Array<Partial<Discovery>>;
  };
  output: {
    criteria: SamplingCriterion[];
    /** Human-readable summary of the expected status for each event ID, e.g. `event_id=open (reason); event_id=dismissed (reason)`. */
    expected_ground_truth: string;
    expect_assessment_note?: boolean;
  };
  metadata: Record<string, unknown> & ScenarioMetadata;
  snapshot_source?: SnapshotSourceOverride;
}

/**
 * A canonical rule-backed KI query used by the end-to-end eval. Seeded directly into the live
 * knowledge-indicators stream with a synthetic `rule_uuid` (no Alerting rule is installed —
 * the change-point scan only reads KI query links and `.rule-events` signals).
 */
export interface E2ECanonicalQuery {
  /** KI query id (document `id` in the knowledge-indicators stream). */
  query_id: string;
  /**
   * Synthetic rule id: `.rule-events` signals reference it and the detection stage groups by it.
   * Must match the `rule_uuid`s used in the scenario's `expected_discoveries` signal metadata.
   */
  rule_uuid: string;
  title: string;
  description: string;
  /** ES|QL breach query over the managed stream. Must compose with an appended `| STATS ...`. */
  esql: string;
  /**
   * Keep >= 80 (critical band): critical-cadence rules honour the detection workflow's
   * `lookback`/`bucketInterval` inputs, which the e2e spec sizes to the replayed window.
   * Rules below the critical band fall back to the fixed `now-125m` / `5m` schedule.
   */
  severity_score: number;
}

export interface E2EExpectedEvent {
  /**
   * Signal `rule_uuid`s identifying the upstream discovery this event should be judged from.
   * An event matches when the discovery it was raised from shares at least one of these rules.
   */
  rule_uuids: string[];
  /** Acceptable final statuses for the matched event. */
  statuses: SignificantEventStatus[];
}

/**
 * Configuration for the fully live e2e spec (`e2e_live.spec.ts`): no seeded queries and no
 * synthetic signals — LLM onboarding generates the queries and real alerting rules fire while
 * the incident tail is streamed at 1x wall clock.
 */
export interface E2ELiveConfig {
  /**
   * Minutes before the snapshot's max `@timestamp` where the incident begins. Docs older than
   * this cut are bulk-replayed as the baseline (onboarding runs on them); newer docs are the
   * streamed tail.
   */
  incident_onset_offset_minutes: number;
  /** Cap on the streamed tail duration (wall-clock minutes). Defaults to 15. */
  max_tail_minutes?: number;
  /** Live-mode LLM criteria judged over the full funnel output. */
  criteria: SamplingCriterion[];
}

export interface E2EScenario {
  input: {
    scenario_id: string;
    stream_name: string;
  };
  /** Rule-backed KI queries seeded into the live KI stream; signals are synthesized from their ES|QL. */
  canonical_queries: E2ECanonicalQuery[];
  /** Present when the scenario also runs in the fully live e2e spec. */
  live?: E2ELiveConfig;
  output: {
    criteria: SamplingCriterion[];
    /** Rules that MUST produce at least one detection (recall side of the detection checkpoint). */
    expected_detection_rule_uuids: string[];
    /** Rules allowed to produce detections without a precision penalty (e.g. benign volume rules). */
    allowed_detection_rule_uuids?: string[];
    /** Canonical expected discoveries — same shape and role as `DiscoveryScenario.output`. */
    expected_discoveries?: Array<Partial<Discovery>>;
    /** Events expected in `.significant_events-events` at the end of the run. */
    expected_events: E2EExpectedEvent[];
    /** When true, no event may end the run with status "open" (false-positive check). */
    expect_no_open_events?: boolean;
    expected_ground_truth?: string;
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
  discoveryJudge: DiscoveryJudgeScenario[];
  /** End-to-end pipeline scenarios (logs -> detections -> discoveries -> significant events). */
  e2e: E2EScenario[];
}
