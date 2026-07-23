/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  GcsConfig,
  SamplingCriterion,
  SnapshotSourceOverride,
} from '@kbn/evals-suite-significant-events';
import type { Discovery, SignificantEventStatus } from '@kbn/significant-events-schema';

/**
 * A canonical rule-backed KI query used by the seeded replay eval. Seeded directly into the live
 * knowledge-indicators stream with a synthetic `rule_uuid` (no Alerting rule is installed —
 * the change-point scan only reads KI query links and `.rule-events` signals).
 */
export interface CanonicalRuleQuery {
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
   * `lookback`/`bucketInterval` inputs, which the seeded replay spec sizes to the replayed
   * window. Rules below the critical band fall back to the fixed `now-125m` / `5m` schedule.
   */
  severity_score: number;
}

export interface ReplayExpectedEvent {
  /**
   * Signal `rule_uuid`s identifying the upstream discovery this event should be judged from.
   * An event matches when the discovery it was raised from shares at least one of these rules.
   */
  rule_uuids: string[];
  /** Acceptable final statuses for the matched event. */
  statuses: SignificantEventStatus[];
}

/**
 * Configuration for the live replay spec (`replay_live.spec.ts`): no seeded queries and no
 * synthetic signals — LLM onboarding generates the queries and real alerting rules fire while
 * the incident tail is streamed at 1x wall clock.
 */
export interface ReplayLiveConfig {
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

export interface ReplayScenario {
  input: {
    scenario_id: string;
    stream_name: string;
  };
  /** Rule-backed KI queries seeded into the live KI stream; signals are synthesized from their ES|QL. */
  canonical_queries: CanonicalRuleQuery[];
  /** Present when the scenario also runs in the live replay spec. */
  live?: ReplayLiveConfig;
  output: {
    criteria: SamplingCriterion[];
    /** Rules that MUST produce at least one detection (recall side of the detection checkpoint). */
    expected_detection_rule_uuids: string[];
    /** Rules allowed to produce detections without a precision penalty (e.g. benign volume rules). */
    allowed_detection_rule_uuids?: string[];
    /** Canonical expected discoveries — same shape and role as the discovery suite's ground truth. */
    expected_discoveries?: Array<Partial<Discovery>>;
    /** Events expected in `.significant_events-events` at the end of the run. */
    expected_events: ReplayExpectedEvent[];
    /** When true, no event may end the run with status "open" (false-positive check). */
    expect_no_open_events?: boolean;
    expected_ground_truth?: string;
  };
  metadata: Record<string, unknown> & {
    difficulty: 'easy' | 'medium' | 'hard';
    failure_domain: string;
    failure_mode?: string;
  };
  snapshot_source?: SnapshotSourceOverride;
}

/** A dataset's replay scenarios plus the GCS source its snapshots live in. */
export interface ReplayDataset {
  id: string;
  gcs: GcsConfig;
  scenarios: ReplayScenario[];
}
