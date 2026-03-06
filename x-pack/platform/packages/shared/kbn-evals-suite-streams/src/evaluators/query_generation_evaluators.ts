/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SIGNIFICANT_EVENT_TYPE_CONFIGURATION,
  SIGNIFICANT_EVENT_TYPE_ERROR,
  SIGNIFICANT_EVENT_TYPE_OPERATIONAL,
  SIGNIFICANT_EVENT_TYPE_RESOURCE_HEALTH,
  SIGNIFICANT_EVENT_TYPE_SECURITY,
} from '@kbn/streams-ai/src/significant_events/types';
import type { Evaluator } from '@kbn/evals';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { selectEvaluators } from '@kbn/evals';
import type { EvaluationCriterion } from '@kbn/evals';
import type { SignificantEventType } from '@kbn/streams-ai/src/significant_events/types';
import { createScenarioCriteriaLlmEvaluator } from './scenario_criteria_llm_evaluator';

const ALLOWED_CATEGORIES = [
  SIGNIFICANT_EVENT_TYPE_OPERATIONAL,
  SIGNIFICANT_EVENT_TYPE_CONFIGURATION,
  SIGNIFICANT_EVENT_TYPE_RESOURCE_HEALTH,
  SIGNIFICANT_EVENT_TYPE_ERROR,
  SIGNIFICANT_EVENT_TYPE_SECURITY,
];

interface QueryGenerationEvaluationExample {
  input: { sample_logs: string[] } & Record<string, unknown>;
  output: Record<string, unknown>;
  metadata: Record<string, unknown> | null;
}

interface Query {
  esql: string;
  title: string;
  category: SignificantEventType;
  severity_score: number;
  evidence?: string[];
}

const createQueryGenerationCodeEvaluator = (
  esClient: ElasticsearchClient,
  logger?: Logger
): Evaluator<QueryGenerationEvaluationExample, Query[]> => ({
  name: 'query_generation_code_evaluator',
  kind: 'CODE' as const,
  evaluate: async ({ output, input }) => {
    const queries = output;

    if (queries.length === 0 || !queries[0] || !queries[0].esql) {
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
      esql: string;
      isSyntaxValid: boolean;
      isExecutionHit: boolean;
      isCategoryCompliant: boolean;
      isSeverityCompliant: boolean;
      evidenceValidation: { allEvidenceFound: boolean; missingEvidence: string[] };
    }> = [];

    for (const query of queries) {
      const { esql, category, severity_score, evidence } = query;
      const { sample_logs: sampleLogs } = input;

      let isSyntaxValid = false;
      let isExecutionHit = false;
      try {
        const result = await esClient.esql.query({ query: esql });
        isSyntaxValid = true;
        validSyntaxCount++;
        if (result.values && result.values.length > 0) {
          isExecutionHit = true;
          executionHitCount++;
        }
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        logger?.warn(`ES|QL validation failed for "${esql}": ${errorMessage}`);
      }

      // Category Compliance
      const isCategoryCompliant = ALLOWED_CATEGORIES.includes(category);

      // Severity Score Compliance
      const isSeverityCompliant = severity_score >= 0 && severity_score <= 100;

      // Evidence Validation
      const evidenceValidation: {
        allEvidenceFound: boolean;
        missingEvidence: string[];
      } = {
        allEvidenceFound: true,
        missingEvidence: [],
      };
      if (evidence && evidence.length > 0) {
        const allLogs = sampleLogs.join('\n');
        const missing = evidence.filter((ev: string) => !allLogs.includes(ev));
        if (missing.length > 0) {
          evidenceValidation.allEvidenceFound = false;
          evidenceValidation.missingEvidence = missing;
        }
      }

      validationDetails.push({
        esql,
        isSyntaxValid,
        isExecutionHit,
        isCategoryCompliant,
        isSeverityCompliant,
        evidenceValidation,
      });
    }

    const syntaxValidityRate = validSyntaxCount / queries.length;
    const executionHitRate = executionHitCount / queries.length;

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
    createScenarioCriteriaLlmEvaluator<QueryGenerationEvaluationExample, Query[]>({
      criteriaFn: (c) => criteriaFn(c) as Evaluator<QueryGenerationEvaluationExample, Query[]>,
      criteria,
    }),
  ];
};
