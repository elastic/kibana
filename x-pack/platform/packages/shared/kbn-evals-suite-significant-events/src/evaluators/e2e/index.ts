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
import { detectionMatchEvaluator } from './detection_match';
import { eventOutcomeEvaluator } from './event_outcome';
import { funnelCompletionEvaluator } from './funnel_completion';
import type { E2EEvaluator } from './types';

export type { E2EEvaluationExample, E2EEvaluator, E2EPipelineOutput } from './types';

/**
 * Full evaluator set for the end-to-end pipeline eval: checkpoint CODE evaluators for the
 * detection and event stages plus the funnel-completion summary, the reused discovery-stage
 * evaluators (grouping, evidence, tool usage, ES|QL grounding, calibration), and the LLM
 * scenario-criteria judge over the whole funnel.
 */
export const createE2EEvaluators = ({
  criteriaFn,
}: CreateScenarioCriteriaLlmEvaluatorOptions): E2EEvaluator[] => {
  const codeEvaluators: E2EEvaluator[] = [
    detectionMatchEvaluator,
    eventOutcomeEvaluator,
    funnelCompletionEvaluator,
  ];

  // DiscoveryEvaluator params are structurally satisfied by the e2e example/output types
  // (E2EPipelineOutput extends DiscoveryAgentOutput; the example input carries `detections`).
  // Invoked without scenario criteria so the funnel-wide criteria evaluator below stays the
  // single `scenario_criteria` entry.
  const discoveryStageEvaluators: E2EEvaluator[] = createDiscoveryEvaluators();

  return [
    ...selectEvaluators([...codeEvaluators, ...discoveryStageEvaluators]),
    createScenarioCriteriaLlmEvaluator({ criteriaFn }),
    createEvidenceDescriptionEvaluator({ criteriaFn }),
    createSeverityCalibrationEvaluator({ criteriaFn }),
    createConfidenceCalibrationEvaluator({ criteriaFn }),
  ];
};
