/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { selectEvaluators } from '@kbn/evals';
import { createDiscoveryEvaluators } from '@kbn/evals-suite-significant-events';
import { createEvidenceDescriptionEvaluator } from '@kbn/evals-suite-significant-events';
import {
  createConfidenceCalibrationEvaluator,
  createSeverityCalibrationEvaluator,
} from '@kbn/evals-suite-significant-events';
import type { CreateScenarioCriteriaLlmEvaluatorOptions } from '@kbn/evals-suite-significant-events';
import { createScenarioCriteriaLlmEvaluator } from '@kbn/evals-suite-significant-events';
import { detectionMatchEvaluator } from './detection_match';
import { eventOutcomeEvaluator } from './event_outcome';
import { funnelCompletionEvaluator } from './funnel_completion';
import type { ReplaySeededEvaluator } from './types';

export type { ReplaySeededExample, ReplaySeededEvaluator, ReplaySeededOutput } from './types';

/**
 * Full evaluator set for the end-to-end pipeline eval: checkpoint CODE evaluators for the
 * detection and event stages plus the funnel-completion summary, the reused discovery-stage
 * evaluators (grouping, evidence, tool usage, ES|QL grounding, calibration), and the LLM
 * scenario-criteria judge over the whole funnel.
 */
export const createReplaySeededEvaluators = ({
  criteriaFn,
}: CreateScenarioCriteriaLlmEvaluatorOptions): ReplaySeededEvaluator[] => {
  const codeEvaluators: ReplaySeededEvaluator[] = [
    detectionMatchEvaluator,
    eventOutcomeEvaluator,
    funnelCompletionEvaluator,
  ];

  // DiscoveryEvaluator params are structurally satisfied by the replay example/output types
  // (ReplaySeededOutput extends DiscoveryAgentOutput; the example input carries `detections`).
  // Invoked without scenario criteria so the funnel-wide criteria evaluator below stays the
  // single `scenario_criteria` entry.
  const discoveryStageEvaluators: ReplaySeededEvaluator[] = createDiscoveryEvaluators();

  return [
    ...selectEvaluators([...codeEvaluators, ...discoveryStageEvaluators]),
    createScenarioCriteriaLlmEvaluator({ criteriaFn }),
    createEvidenceDescriptionEvaluator({ criteriaFn }),
    createSeverityCalibrationEvaluator({ criteriaFn }),
    createConfidenceCalibrationEvaluator({ criteriaFn }),
  ];
};
