/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConverseStep, EvaluationCriterion, Evaluator } from '@kbn/evals';
import type { Discovery, SigEvent } from '@kbn/streams-schema';

/** Fields every discovery agent output carries: the converse trail and trace id. */
export interface AgentOutputBase {
  steps?: ConverseStep[];
  traceId?: string | null;
}

/** Common per-scenario expectations shared by every discovery example's `output`. */
export interface ExpectedBase {
  /** Tool ids the agent is expected to call; defaults to the discovery tool set when omitted. */
  expectedTools?: string[];
  criteria?: EvaluationCriterion[];
}

export interface InvestigatorAgentOutput extends AgentOutputBase {
  discoveries: Discovery[];
}

export interface InvestigatorEvaluationExample {
  input: Record<string, unknown>;
  output: ExpectedBase & {
    expected_kind?: string;
    expected_min_evidence_count?: number;
    /**
     * Canonical expected discoveries (detections + evidences + cause_kis) — the grouping check
     * derives its expected groups from these discoveries' `detections[].rule_name`s.
     */
    expected_discoveries?: Array<Partial<Discovery>>;
  } & Record<string, unknown>;
  metadata: Record<string, unknown> | null;
}

export type InvestigatorEvaluator = Evaluator<
  InvestigatorEvaluationExample,
  InvestigatorAgentOutput
>;

export interface JudgeAgentOutput extends AgentOutputBase {
  significantEvents: SigEvent[];
  inputDiscoveries: Discovery[];
}

export interface JudgeEvaluationExample {
  input: Record<string, unknown>;
  output: ExpectedBase & {
    expected_status?: string;
    expect_assessment_note?: boolean;
  } & Record<string, unknown>;
  metadata: Record<string, unknown> | null;
}

export type JudgeEvaluator = Evaluator<JudgeEvaluationExample, JudgeAgentOutput>;
