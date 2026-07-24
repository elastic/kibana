/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConverseStep, Evaluator } from '@kbn/evals';
import type { Detection, SignificantEvent } from '@kbn/significant-events-schema';
import type { DiscoveryAgentOutput, ExampleOutputBase } from '@kbn/evals-suite-significant-events';
import type { LiveStageTokenUsage } from '../../data_generators/live_token_usage';
import type { GeneratedRuleBackedQuery } from '../../data_generators/run_live_onboarding';

/**
 * Full funnel output of one LIVE pipeline run: everything was produced by the real product
 * (LLM onboarding, real rule executions over the streamed tail, orchestrator workflows).
 * Extends the discovery agent output shape so the discovery-stage evaluators can be reused;
 * `steps` holds the discovery agent's conversation steps fetched from the Agent Builder API.
 */
export interface ReplayLiveOutput extends DiscoveryAgentOutput {
  /** Rule-backed queries the LLM onboarding generated (with real rule ids). */
  generatedQueries: GeneratedRuleBackedQuery[];
  /** `.rule-events` signal doc count per rule id — real rule firing over the streamed tail. */
  signalCountsByRule: Record<string, number>;
  detections: Detection[];
  significantEvents: SignificantEvent[];
  /** The judge agent's conversation steps (triage), for diagnostics. */
  judgeSteps?: ConverseStep[];
  /**
   * Deterministic per-stage LLM usage: onboarding from the workflow status payload, discovery
   * and judge from conversation `model_usage`. Replaces the trace-based token evaluators, which
   * cannot see workflow-side spans (they carry Kibana's trace ids, not the eval's).
   */
  tokenUsage: {
    onboarding: LiveStageTokenUsage;
    discovery: LiveStageTokenUsage;
    judge: LiveStageTokenUsage;
  };
  /** Wall-clock stage durations, for the pipeline-duration evaluator. */
  stageDurationsMs: {
    onboarding: number;
    streaming: number;
    orchestrator: number;
    total: number;
  };
}

export interface ReplayLiveExample {
  input: {
    scenario_id: string;
    stream_name: string;
    /** Structural compatibility with reused discovery evaluators; always `[]` in examples. */
    detections: Array<Partial<Detection>>;
  };
  output: ExampleOutputBase & {
    /** True when the scenario's incident must end the run as at least one open event. */
    expect_open_event?: boolean;
    /** True when no event may end the run open (healthy baseline). */
    expect_no_open_events?: boolean;
  } & Record<string, unknown>;
  metadata: Record<string, unknown> | null;
}

export type ReplayLiveEvaluator = Evaluator<ReplayLiveExample, ReplayLiveOutput>;
