/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { selectEvaluators } from '@kbn/evals';
import { createScenarioCriteriaLlmEvaluator } from '../../scenario_criteria/evaluators';
import type { CreateScenarioCriteriaLlmEvaluatorOptions } from '../../scenario_criteria/evaluators';
import type { DiscoveryEvaluator } from '../types';
import { createExecuteEsqlGroundingEvaluator } from '../common/esql_grounding';
import { createDiscoveryToolUsageEvaluator } from './tool_usage/tool_usage';
import {
  createSeverityCalibrationEvaluator,
  createConfidenceCalibrationEvaluator,
} from '../common/scores_calibration';
import {
  createEvidenceDescriptionEvaluator,
  createNarrativeFieldsEvaluator,
  createSignalEvidenceConsistencyEvaluator,
} from '../common/evidence_quality';
import { groupingCorrectnessEvaluator } from './grouping/grouping_correctness';
import { topologyCorrectnessEvaluator } from './grouping/topology_correctness';
import { evidenceCollectionEvaluator } from './evidences/evidence_collection';
import { continuationTrajectoryEvaluator } from './tool_usage/tool_usage';
import {
  continuationRoutingEvaluator,
  continuationStabilityEvaluator,
  continuationTopologyStabilityEvaluator,
  type ContinuationEvaluator,
} from './continuation/continuation_stability';
import { continuationSeverityStabilityEvaluator } from './continuation/continuation_severity_stability';
import { confirmedEvidencesEvaluator } from './evidences/confirmed_evidences';
import { confirmationAlignmentEvaluator } from './evidences/confirmation_alignment';
import { severityExactEvaluator } from './severity/severity_exact';
import { createStatusCorrectnessEvaluator } from './status/status_correctness';

/**
 * Factory that creates the full set of evaluators for the discovery agent eval suite.
 */
export const createDiscoveryEvaluators = (
  scenarioCriteria?: CreateScenarioCriteriaLlmEvaluatorOptions
): DiscoveryEvaluator[] => {
  const codeEvaluators: DiscoveryEvaluator[] = [
    groupingCorrectnessEvaluator,
    topologyCorrectnessEvaluator,
    evidenceCollectionEvaluator,
    createDiscoveryToolUsageEvaluator(),
    createExecuteEsqlGroundingEvaluator(),
    confirmedEvidencesEvaluator,
    confirmationAlignmentEvaluator,
    severityExactEvaluator,
  ];

  const base = selectEvaluators(codeEvaluators);

  if (!scenarioCriteria) {
    return base;
  }

  const { criteriaFn, criteria } = scenarioCriteria;

  return [
    ...base,
    createStatusCorrectnessEvaluator(criteriaFn),
    createScenarioCriteriaLlmEvaluator({ criteriaFn, criteria }),
    createEvidenceDescriptionEvaluator({ criteriaFn }),
    createNarrativeFieldsEvaluator({ criteriaFn }),
    createSignalEvidenceConsistencyEvaluator({ criteriaFn }),
    createSeverityCalibrationEvaluator({ criteriaFn }),
    createConfidenceCalibrationEvaluator({ criteriaFn }),
  ];
};

/**
 * Factory that creates the evaluators for the "continuation over time" discovery agent eval —
 * mirrors `createDiscoveryEvaluators`'s shape, just a smaller, fixed evaluator set (no
 * scenario-criteria variant; the continuation output has no `expected` criteria to score against).
 */
export const createContinuationEvaluators = (): ContinuationEvaluator[] =>
  selectEvaluators([
    continuationStabilityEvaluator,
    continuationRoutingEvaluator,
    continuationSeverityStabilityEvaluator,
    continuationTopologyStabilityEvaluator,
    continuationTrajectoryEvaluator,
  ]);
