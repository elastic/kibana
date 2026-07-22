/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { selectEvaluators } from '@kbn/evals';
import { createDiscoveryEvaluators } from '../discovery';
import { createEvidenceDescriptionEvaluator } from '../discovery/common/evidence_quality';
import {
  createConfidenceCalibrationEvaluator,
  createSeverityCalibrationEvaluator,
} from '../discovery/common/scores_calibration';
import type { CreateScenarioCriteriaLlmEvaluatorOptions } from '../scenario_criteria/evaluators';
import { createScenarioCriteriaLlmEvaluator } from '../scenario_criteria/evaluators';
import { liveEventOutcomeEvaluator } from './live_event_outcome';
import { liveFunnelCompletionEvaluator } from './live_funnel_completion';
import {
  liveCachedTokensEvaluator,
  liveInputTokensEvaluator,
  liveLlmCallsEvaluator,
  liveOutputTokensEvaluator,
  livePipelineDurationEvaluator,
  liveToolCallsEvaluator,
} from './live_usage';
import type { E2ELiveEvaluator } from './types';

export type { E2ELiveEvaluationExample, E2ELiveEvaluator, E2ELivePipelineOutput } from './types';

/**
 * Evaluator set for the fully live pipeline eval. Live mode has no canonical rule catalog, so
 * deterministic scoring is count/status-based (funnel completion, event outcome) and quality is
 * judged by the LLM: scenario criteria over the whole funnel plus the reused discovery-stage
 * evaluators fed with the agent's conversation steps. The uuid-based discovery CODE evaluators
 * (grouping, evidence collection) degrade to `score: null` without canonical expectations; tool
 * usage and ES|QL grounding still score from the steps.
 */
export const createE2ELiveEvaluators = ({
  criteriaFn,
}: CreateScenarioCriteriaLlmEvaluatorOptions): E2ELiveEvaluator[] => {
  const codeEvaluators: E2ELiveEvaluator[] = [
    liveFunnelCompletionEvaluator,
    liveEventOutcomeEvaluator,
    // Deterministic cost/latency accounting — the trace-based evaluators cannot see the
    // workflow-side spans in live mode (see live_usage.ts).
    liveInputTokensEvaluator,
    liveOutputTokensEvaluator,
    liveCachedTokensEvaluator,
    liveLlmCallsEvaluator,
    liveToolCallsEvaluator,
    livePipelineDurationEvaluator,
  ];

  const discoveryStageEvaluators: E2ELiveEvaluator[] = createDiscoveryEvaluators();

  return [
    ...selectEvaluators([...codeEvaluators, ...discoveryStageEvaluators]),
    createScenarioCriteriaLlmEvaluator({ criteriaFn }),
    createEvidenceDescriptionEvaluator({ criteriaFn }),
    createSeverityCalibrationEvaluator({ criteriaFn }),
    createConfidenceCalibrationEvaluator({ criteriaFn }),
  ];
};
