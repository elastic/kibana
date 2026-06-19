/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluationCriterion, Evaluator } from '@kbn/evals';
import type { Discovery, SigEvent } from '@kbn/streams-schema';
import type { DiscoveryInvestigatorToolUsage, JudgeToolUsage } from '../../agents/types';

export interface InvestigatorOutput {
  discoveries: Discovery[];
  toolUsage: DiscoveryInvestigatorToolUsage;
  traceId?: string | null;
}

export interface InvestigatorEvaluationExample {
  input: Record<string, unknown>;
  output: {
    expected_kind?: string;
    expected_min_evidence_count?: number;
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
  toolUsage: JudgeToolUsage;
  inputDiscoveries: Discovery[];
  traceId?: string | null;
}

export interface JudgeEvaluationExample {
  input: Record<string, unknown>;
  output: {
    expected_status?: string;
    expect_assessment_note?: boolean;
    criteria?: EvaluationCriterion[];
  } & Record<string, unknown>;
  metadata: Record<string, unknown> | null;
}

export type JudgeEvaluator = Evaluator<JudgeEvaluationExample, JudgeOutput>;

// ---------------------------------------------------------------------------
// Scenario criteria config type (shared by investigator and judge factories)
// ---------------------------------------------------------------------------

export interface ScenarioCriteriaConfig {
  criteriaFn: (criteria: EvaluationCriterion[]) => Evaluator;
  criteria?: EvaluationCriterion[];
}
