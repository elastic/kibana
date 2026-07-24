/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator } from '@kbn/evals';
import type { Detection, Discovery, SignificantEvent } from '@kbn/significant-events-schema';
import type { DiscoveryAgentOutput, ExampleOutputBase } from '@kbn/evals-suite-significant-events';
import type { ReplayExpectedEvent } from '../../scenarios/types';

/**
 * Full funnel output of one end-to-end pipeline run. Extends the discovery agent output shape so
 * the discovery-stage evaluators (grouping, evidence, tool usage, grounding) can be reused as-is.
 */
export interface ReplaySeededOutput extends DiscoveryAgentOutput {
  /** Synthetic `.rule-events` signals written per rule_uuid. */
  signalsByRule: Record<string, number>;
  /** Detections the real detection workflow wrote to `.significant_events-detections`. */
  detections: Detection[];
  /** Latest significant-event version per event_id from `.significant_events-events`. */
  significantEvents: SignificantEvent[];
}

export interface ReplaySeededExample {
  input: {
    scenario_id: string;
    stream_name: string;
    /**
     * Kept for structural compatibility with the reused discovery evaluators; always `[]` in
     * examples — the detections actually fed to the agent are produced at runtime and threaded
     * through `output.inputDetections`.
     */
    detections: Array<Partial<Detection>>;
  };
  output: ExampleOutputBase & {
    expected_detection_rule_uuids?: string[];
    allowed_detection_rule_uuids?: string[];
    expected_discoveries?: Array<Partial<Discovery>>;
    expected_events?: ReplayExpectedEvent[];
    expect_no_open_events?: boolean;
  } & Record<string, unknown>;
  metadata: Record<string, unknown> | null;
}

export type ReplaySeededEvaluator = Evaluator<ReplaySeededExample, ReplaySeededOutput>;
