/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConverseStep, EvaluationCriterion, Evaluator } from '@kbn/evals';
import type { Discovery, SigEvent } from '@kbn/streams-schema';

export interface InvestigatorOutput {
  discoveries: Discovery[];
  /** Raw converse steps — the trajectory and grounding evaluators read tool calls from these. */
  steps: ConverseStep[];
  traceId?: string | null;
}

export interface InvestigatorEvaluationExample {
  input: Record<string, unknown>;
  output: {
    expected_kind?: string;
    expected_min_evidence_count?: number;
    /**
     * Canonical expected discoveries (detections + evidences + cause_kis) — the grouping check
     * derives its expected groups from these discoveries' `detections[].rule_name`s.
     */
    expected_discoveries?: Array<Partial<Discovery>>;
    /** Tool ids the agent is expected to call; defaults to the discovery tool set when omitted. */
    expectedTools?: string[];
    criteria?: EvaluationCriterion[];
  } & Record<string, unknown>;
  metadata: Record<string, unknown> | null;
}

export type InvestigatorEvaluator = Evaluator<InvestigatorEvaluationExample, InvestigatorOutput>;

// ---------------------------------------------------------------------------
// Judge evaluator types
// ---------------------------------------------------------------------------

export interface JudgeOutput {
  significantEvents: SigEvent[];
  /** Raw converse steps — the trajectory and grounding evaluators read tool calls from these. */
  steps: ConverseStep[];
  inputDiscoveries: Discovery[];
  traceId?: string | null;
}

export interface JudgeEvaluationExample {
  input: Record<string, unknown>;
  output: {
    expected_status?: string;
    expect_assessment_note?: boolean;
    /** Tool ids the agent is expected to call; defaults to the discovery tool set when omitted. */
    expectedTools?: string[];
    criteria?: EvaluationCriterion[];
  } & Record<string, unknown>;
  metadata: Record<string, unknown> | null;
}

export type JudgeEvaluator = Evaluator<JudgeEvaluationExample, JudgeOutput>;

export interface ScenarioCriteriaConfig {
  criteriaFn: (criteria: EvaluationCriterion[]) => Evaluator;
  criteria?: EvaluationCriterion[];
}
