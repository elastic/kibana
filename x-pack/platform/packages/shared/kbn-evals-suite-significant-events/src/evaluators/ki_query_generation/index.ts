/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { Evaluator } from '@kbn/evals';
import { createScenarioCriteriaLlmEvaluator } from '../scenario_criteria/evaluators';
import { createSyntaxValidationEvaluator } from './syntax/syntax_validation';
import { categoryComplianceEvaluator } from './category/category_compliance';
import { expectedCategoryCoverageEvaluator } from './category/expected_category_coverage';
import { severityComplianceEvaluator } from './severity/severity_compliance';
import { evidenceGroundingEvaluator } from './evidence/evidence_grounding';
import { queryTypeDistributionEvaluator } from './query_type/query_type_distribution';
import { statsStructureValidationEvaluator } from './stats/stats_structure_validation';
import { createStatsQualityCalibrationEvaluator } from './stats/stats_quality_calibration';
import { createToolUsageEvaluator } from './tool_usage/tool_usage_validation';
import { exactDuplicateAvoidanceEvaluator } from './novelty/exact_duplicate_avoidance';
import { generationSuccessEvaluator } from './generation_success';
import { expectedGenerationOutcomeEvaluator } from './expected_generation_outcome';
import type {
  KIQueryGenerationEvaluationExample,
  KIQueryGenerationEvaluator,
  KIQueryGenerationOutput,
  ScenarioCriteriaConfig,
} from './types';
import { getQueriesFromOutput } from './types';

export type {
  Query,
  KIQueryGenerationEvaluationExample,
  KIQueryGenerationOutput,
  KIQueryGenerationEvaluator,
  ScenarioCriteriaConfig,
} from './types';

export { getQueriesFromOutput } from './types';

export const createKIQueryGenerationEvaluators = (
  esClient: ElasticsearchClient,
  scenarioCriteria?: ScenarioCriteriaConfig,
  logger?: Logger
) => {
  const evaluators: KIQueryGenerationEvaluator[] = [
    createSyntaxValidationEvaluator(esClient, logger),
    categoryComplianceEvaluator,
    expectedCategoryCoverageEvaluator,
    severityComplianceEvaluator,
    evidenceGroundingEvaluator,
    queryTypeDistributionEvaluator,
    statsStructureValidationEvaluator,
    createToolUsageEvaluator(),
    exactDuplicateAvoidanceEvaluator,
    generationSuccessEvaluator,
    expectedGenerationOutcomeEvaluator,
  ];
  if (!scenarioCriteria) {
    return evaluators;
  }

  const { criteriaFn, criteria } = scenarioCriteria;
  return [
    ...evaluators,
    createScenarioCriteriaLlmEvaluator<KIQueryGenerationEvaluationExample, KIQueryGenerationOutput>(
      {
        criteriaFn: (c) =>
          criteriaFn(c) as Evaluator<KIQueryGenerationEvaluationExample, KIQueryGenerationOutput>,
        criteria,
        // Judging an empty output returns a low score that reads as poor query quality when it
        // actually means generation produced nothing. `generation_success` reports that instead.
        skipWhen: (output) =>
          getQueriesFromOutput(output).length === 0 ? 'No queries generated' : undefined,
        transformOutput: (output) => {
          // Rerun arms also expose attempts so the judge can see semantic retreads.
          if (
            output != null &&
            typeof output === 'object' &&
            !Array.isArray(output) &&
            (output as { evaluation_arm?: string }).evaluation_arm === 'rerun'
          ) {
            return {
              queries: getQueriesFromOutput(output),
              query_attempts: (output as { query_attempts?: unknown[] }).query_attempts ?? [],
            } as unknown as KIQueryGenerationOutput;
          }
          return getQueriesFromOutput(output) as unknown as KIQueryGenerationOutput;
        },
      }
    ),
    createStatsQualityCalibrationEvaluator({ criteriaFn }),
  ];
};
