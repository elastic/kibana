/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator } from '@kbn/evals';
import { selectEvaluators } from '@kbn/evals';
import type { ElasticsearchClient } from '@kbn/core/server';
import { createScenarioCriteriaLlmEvaluator } from '../../scenario_criteria/evaluators';
import type {
  InvestigatorEvaluationExample,
  InvestigatorEvaluator,
  InvestigatorOutput,
  ScenarioCriteriaConfig,
} from '../types';
import { schemaValidityInvestigatorEvaluator } from './schema_validity';
import { toolUsageSequenceEvaluator } from './tool_usage_sequence';
import { executeEsqlCoverageEvaluator } from './execute_esql_coverage';
import { createKindCorrectnessEvaluator } from './kind_correctness';

export type { ScenarioCriteriaConfig } from '../types';

/**
 * Factory that creates the full set of evaluators for the investigator agent eval suite.
 */
export const createInvestigatorEvaluators = (
  esClient: ElasticsearchClient,
  scenarioCriteria?: ScenarioCriteriaConfig
): Array<Evaluator<InvestigatorEvaluationExample, InvestigatorOutput>> => {
  const codeEvaluators: InvestigatorEvaluator[] = [
    schemaValidityInvestigatorEvaluator,
    toolUsageSequenceEvaluator,
    executeEsqlCoverageEvaluator,
  ];

  const base = selectEvaluators(codeEvaluators);

  if (!scenarioCriteria) {
    return base;
  }

  const { criteriaFn, criteria } = scenarioCriteria;

  return [
    ...base,
    createKindCorrectnessEvaluator(criteriaFn),
    createScenarioCriteriaLlmEvaluator<InvestigatorEvaluationExample, InvestigatorOutput>({
      criteriaFn: (c) =>
        criteriaFn(c) as Evaluator<InvestigatorEvaluationExample, InvestigatorOutput>,
      criteria,
    }),
  ];
};
