/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fromKueryExpression } from '@kbn/es-query';
import {
  SIGNIFICANT_EVENT_TYPE_CONFIGURATION,
  SIGNIFICANT_EVENT_TYPE_ERROR,
  SIGNIFICANT_EVENT_TYPE_OPERATIONAL,
  SIGNIFICANT_EVENT_TYPE_RESOURCE_HEALTH,
  SIGNIFICANT_EVENT_TYPE_SECURITY,
} from '@kbn/streams-ai/src/significant_events/types';
import type { Evaluator } from '@kbn/evals/src/types';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { selectEvaluators } from '@kbn/evals/src/evaluators/filter';
import type { EvaluationCriterion } from '@kbn/evals/src/evaluators/criteria';
import { createScenarioCriteriaLlmEvaluator } from './scenario_criteria_llm_evaluator';

const ALLOWED_CATEGORIES = [
  SIGNIFICANT_EVENT_TYPE_OPERATIONAL,
  SIGNIFICANT_EVENT_TYPE_CONFIGURATION,
  SIGNIFICANT_EVENT_TYPE_RESOURCE_HEALTH,
  SIGNIFICANT_EVENT_TYPE_ERROR,
  SIGNIFICANT_EVENT_TYPE_SECURITY,
];

const createQueryGenerationCodeEvaluator = (
  esClient: ElasticsearchClient,
  logger?: Logger
): Evaluator => ({
  name: 'significant_events_code_evaluator',
  kind: 'CODE' as const,
  evaluate: async ({ output, input, metadata }) => {
    const queries = Array.isArray(output) ? output : [output];

    if (queries.length === 0 || !queries[0] || !queries[0].kql) {
      return {
        score: 0,
        reasoning: 'No queries generated',
        details: {
          syntaxValidityRate: 0,
          executionHitRate: 0,
        },
      };
    }

    let validSyntaxCount = 0;
    let executionHitCount = 0;
    const validationDetails: Array<{
      kql: string;
      isSyntaxValid: boolean;
      isExecutionHit: boolean;
      executionError?: string;
      isCategoryCompliant: boolean;
      isSeverityCompliant: boolean;
      evidenceValidation: { allEvidenceFound: boolean; missingEvidence: string[] };
    }> = [];

    for (const query of queries) {
      const { kql, category, severity_score, evidence } = query;
      const { sample_logs } = input;

      // 1. KQL Syntax Validation
      let isSyntaxValid = false;
      try {
        fromKueryExpression(kql);
        isSyntaxValid = true;
        validSyntaxCount++;
      } catch (e) {
        // KQL is invalid
      }

      // 2. Execution Verification
      let isExecutionHit = false;
      let executionError: string | undefined;
      if (isSyntaxValid) {
        try {
          const searchResult = await esClient.search({
            index: metadata?.test_index as string,
            q: kql,
          });
          const total = searchResult.hits.total;
          const hits = typeof total === 'number' ? total : total?.value ?? 0;
          if (hits > 0) {
            isExecutionHit = true;
            executionHitCount++;
          }
        } catch (e) {
          executionError = e instanceof Error ? e.message : String(e);
          logger?.warn(`Execution verification failed for KQL "${kql}": ${executionError}`);
        }
      }

      // 3. Category Compliance
      const isCategoryCompliant = ALLOWED_CATEGORIES.includes(category);

      // 4. Severity Score Compliance
      const isSeverityCompliant = severity_score >= 0 && severity_score <= 100;

      // 5. Evidence Validation
      const evidenceValidation: {
        allEvidenceFound: boolean;
        missingEvidence: string[];
      } = {
        allEvidenceFound: true,
        missingEvidence: [],
      };
      if (evidence && evidence.length > 0) {
        const allLogs = (sample_logs as string[]).join('\n');
        const missing = evidence.filter((ev: string) => !allLogs.includes(ev));
        if (missing.length > 0) {
          evidenceValidation.allEvidenceFound = false;
          evidenceValidation.missingEvidence = missing;
        }
      }

      validationDetails.push({
        kql,
        isSyntaxValid,
        isExecutionHit,
        ...(executionError ? { executionError } : {}),
        isCategoryCompliant,
        isSeverityCompliant,
        evidenceValidation,
      });
    }

    const syntaxValidityRate = validSyntaxCount / queries.length;
    const executionHitRate = executionHitCount / queries.length;

    // The final score is a simple average of the two main metrics.
    const score = (syntaxValidityRate + executionHitRate) / 2;

    return {
      score,
      details: {
        syntaxValidityRate,
        executionHitRate,
        queries: validationDetails,
      },
    };
  },
});

export const createQueryGenerationEvaluators = (
  esClient: ElasticsearchClient,
  scenarioCriteria?: {
    criteriaFn: (criteria: EvaluationCriterion[]) => Evaluator;
    criteria: EvaluationCriterion[];
  },
  logger?: Logger
) => {
  const base = selectEvaluators([createQueryGenerationCodeEvaluator(esClient, logger)]);

  if (!scenarioCriteria) {
    return base;
  }

  const { criteriaFn, criteria } = scenarioCriteria;
  return [
    ...base,
    createScenarioCriteriaLlmEvaluator({
      criteriaFn,
      criteria,
    }),
  ];
};
