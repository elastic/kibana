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
import { mean } from 'lodash';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { selectEvaluators } from '@kbn/evals';
import type { EvaluationCriterion, Evaluator } from '@kbn/evals';
import type { SignificantEventType } from '@kbn/streams-ai/src/significant_events/types';
import type { SignificantEventsToolUsage } from '@kbn/streams-ai';
import { createScenarioCriteriaLlmEvaluator } from '../scenario_criteria/evaluators';
import { matchesEvidenceText } from '../common/matches_evidence_text';

const ALLOWED_CATEGORIES = [
  SIGNIFICANT_EVENT_TYPE_OPERATIONAL,
  SIGNIFICANT_EVENT_TYPE_CONFIGURATION,
  SIGNIFICANT_EVENT_TYPE_RESOURCE_HEALTH,
  SIGNIFICANT_EVENT_TYPE_ERROR,
  SIGNIFICANT_EVENT_TYPE_SECURITY,
];

interface KIQueryGenerationEvaluationExample {
  input: { sample_logs: string[] } & Record<string, unknown>;
  output: {
    expected_categories?: string[];
    esql_substrings?: string[];
  } & Record<string, unknown>;
  metadata: Record<string, unknown> | null;
}

interface Query {
  esql: string;
  title: string;
  category: SignificantEventType;
  severity_score: number;
  evidence?: string[];
}

interface KIQueryGenerationTaskOutput {
  queries: Query[];
  traceId?: string | null;
}

type KIQueryGenerationOutput = Query[] | KIQueryGenerationTaskOutput;

const getQueriesFromOutput = (output: KIQueryGenerationOutput): Query[] => {
  return Array.isArray(output) ? output : output.queries;
};

interface QueryValidationDetail {
  esql: string;
  isSyntaxValid: boolean;
  isExecutionHit: boolean;
  isCategoryCompliant: boolean;
  isSeverityCompliant: boolean;
  evidenceValidation: { allEvidenceFound: boolean; missingEvidence: string[] };
}

const validateQueries = async ({
  queries,
  sampleLogs,
  esClient,
  logger,
}: {
  queries: Query[];
  sampleLogs: string[];
  esClient: ElasticsearchClient;
  logger?: Logger;
}): Promise<{
  validationDetails: QueryValidationDetail[];
  validSyntaxCount: number;
  executionHitCount: number;
  categoryComplianceCount: number;
  severityComplianceCount: number;
  groundedEvidenceCount: number;
  totalEvidenceCount: number;
}> => {
  let validSyntaxCount = 0;
  let executionHitCount = 0;
  let categoryComplianceCount = 0;
  let severityComplianceCount = 0;
  let groundedEvidenceCount = 0;
  let totalEvidenceCount = 0;

  const validationDetails: QueryValidationDetail[] = [];

  for (const query of queries) {
    const { esql, category, severity_score, evidence = [] } = query;

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

    const isCategoryCompliant = ALLOWED_CATEGORIES.includes(category);
    if (isCategoryCompliant) {
      categoryComplianceCount++;
    }

    const isSeverityCompliant = severity_score >= 0 && severity_score <= 100;
    if (isSeverityCompliant) {
      severityComplianceCount++;
    }

    const evidenceValidation: {
      allEvidenceFound: boolean;
      missingEvidence: string[];
    } = {
      allEvidenceFound: true,
      missingEvidence: [],
    };
    if (evidence.length > 0) {
      totalEvidenceCount += evidence.length;
      const missing = evidence.filter(
        (ev: string) => !sampleLogs.some((logLine) => matchesEvidenceText(logLine, ev))
      );
      if (missing.length > 0) {
        evidenceValidation.allEvidenceFound = false;
        evidenceValidation.missingEvidence = missing;
      }
      groundedEvidenceCount += evidence.length - missing.length;
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

  return {
    validationDetails,
    validSyntaxCount,
    executionHitCount,
    categoryComplianceCount,
    severityComplianceCount,
    groundedEvidenceCount,
    totalEvidenceCount,
  };
};

const computeExpectedCoverage = (expectedValues: string[], observedValues: Set<string>) => {
  const missing = expectedValues.filter((value) => !observedValues.has(value));
  const coverageRate =
    expectedValues.length > 0
      ? (expectedValues.length - missing.length) / expectedValues.length
      : null;

  return { coverageRate, missing };
};

const computeEsqlSubstringCoverage = (expectedSubstrings: string[], queries: Query[]) => {
  const normalizedEsql = queries.map((query) => query.esql.toLowerCase());
  const missing = expectedSubstrings.filter(
    (substring) => !normalizedEsql.some((esql) => esql.includes(substring.toLowerCase()))
  );
  const coverageRate =
    expectedSubstrings.length > 0
      ? (expectedSubstrings.length - missing.length) / expectedSubstrings.length
      : null;

  return { coverageRate, missing };
};

/**
 * Formats human-readable validation failures for the KI query generation CODE evaluator.
 */
const buildKIQueryGenerationValidationIssues = ({
  queriesCount,
  validSyntaxCount,
  executionHitCount,
  invalidCategoriesCount,
  invalidSeveritiesCount,
  missingExpectedCategories,
  missingEsqlSubstrings,
  missingEvidence,
}: {
  queriesCount: number;
  validSyntaxCount: number;
  executionHitCount: number;
  invalidCategoriesCount: number;
  invalidSeveritiesCount: number;
  missingExpectedCategories: string[];
  missingEsqlSubstrings: string[];
  missingEvidence: string[];
}): string[] => {
  const issues: string[] = [];

  if (validSyntaxCount < queriesCount) {
    issues.push(
      `${queriesCount - validSyntaxCount}/${queriesCount} queries have invalid ES|QL syntax`
    );
  }
  if (executionHitCount < queriesCount) {
    issues.push(`${queriesCount - executionHitCount}/${queriesCount} queries returned no hits`);
  }
  if (invalidCategoriesCount > 0) {
    issues.push(`${invalidCategoriesCount} queries use unsupported categories`);
  }
  if (invalidSeveritiesCount > 0) {
    issues.push(`${invalidSeveritiesCount} queries have severity outside [0, 100]`);
  }
  if (missingExpectedCategories.length > 0) {
    issues.push(`Missing expected categories: ${missingExpectedCategories.join(', ')}`);
  }
  if (missingEsqlSubstrings.length > 0) {
    issues.push(`Missing expected ES|QL substrings: ${missingEsqlSubstrings.join(', ')}`);
  }
  if (missingEvidence.length > 0) {
    issues.push(`Evidence not found in sample logs: ${missingEvidence.slice(0, 5).join(', ')}`);
  }

  return issues;
};

const evaluateKIQueryGenerationCode = async ({
  queries,
  sampleLogs,
  expectedCategories,
  expectedEsqlSubstrings,
  esClient,
  logger,
}: {
  queries: Query[];
  sampleLogs: string[];
  expectedCategories: string[];
  expectedEsqlSubstrings: string[];
  esClient: ElasticsearchClient;
  logger?: Logger;
}) => {
  if (queries.length === 0 || !queries[0] || !queries[0].esql) {
    return {
      score: 0,
      explanation: 'No queries generated',
      details: {
        syntaxValidityRate: 0,
        executionHitRate: 0,
      },
    };
  }

  const {
    validationDetails,
    validSyntaxCount,
    executionHitCount,
    categoryComplianceCount,
    severityComplianceCount,
    groundedEvidenceCount,
    totalEvidenceCount,
  } = await validateQueries({ queries, sampleLogs, esClient, logger });

  const syntaxValidityRate = validSyntaxCount / queries.length;
  const executionHitRate = executionHitCount / queries.length;
  const categoryComplianceRate = categoryComplianceCount / queries.length;
  const severityComplianceRate = severityComplianceCount / queries.length;

  const observedCategories = new Set(queries.map((query) => query.category.toLowerCase()));
  const { coverageRate: expectedCategoryCoverageRate, missing: missingExpectedCategories } =
    computeExpectedCoverage(expectedCategories, observedCategories);

  const { coverageRate: esqlSubstringCoverageRate, missing: missingEsqlSubstrings } =
    computeEsqlSubstringCoverage(expectedEsqlSubstrings, queries);

  const evidenceGroundingRate =
    totalEvidenceCount > 0 ? groundedEvidenceCount / totalEvidenceCount : null;

  const scoreComponents = [
    syntaxValidityRate,
    executionHitRate,
    categoryComplianceRate,
    severityComplianceRate,
    ...(expectedCategoryCoverageRate == null ? [] : [expectedCategoryCoverageRate]),
    ...(esqlSubstringCoverageRate == null ? [] : [esqlSubstringCoverageRate]),
    ...(evidenceGroundingRate == null ? [] : [evidenceGroundingRate]),
  ];
  const score = mean(scoreComponents);

  const invalidCategoriesCount = queries.length - categoryComplianceCount;
  const invalidSeveritiesCount = queries.length - severityComplianceCount;
  const missingEvidence = validationDetails.flatMap(
    (detail) => detail.evidenceValidation.missingEvidence
  );
  const issues = buildKIQueryGenerationValidationIssues({
    queriesCount: queries.length,
    validSyntaxCount,
    executionHitCount,
    invalidCategoriesCount,
    invalidSeveritiesCount,
    missingExpectedCategories,
    missingEsqlSubstrings,
    missingEvidence,
  });

  return {
    score,
    explanation:
      issues.length > 0
        ? `${issues.join('; ')} (score=${score.toFixed(2)})`
        : `All ${queries.length} generated queries passed code validation`,
    details: {
      syntaxValidityRate,
      executionHitRate,
      categoryComplianceRate,
      severityComplianceRate,
      expectedCategoryCoverageRate,
      missingExpectedCategories,
      esqlSubstringCoverageRate,
      missingEsqlSubstrings,
      evidenceGroundingRate,
      groundedEvidenceCount,
      totalEvidenceCount,
      queries: validationDetails,
    },
  };
};

const createKIQueryGenerationCodeEvaluator = (
  esClient: ElasticsearchClient,
  logger?: Logger
): Evaluator<KIQueryGenerationEvaluationExample, KIQueryGenerationOutput> => ({
  name: 'ki_query_generation_code_evaluator',
  kind: 'CODE' as const,
  evaluate: async ({ output, input, expected }) => {
    const queries = getQueriesFromOutput(output ?? []);
    const { sample_logs: sampleLogs } = input;
    const expectedCategories = (expected.expected_categories ?? []).map((category) =>
      category.toLowerCase()
    );
    const expectedEsqlSubstrings = expected.esql_substrings ?? [];

    return evaluateKIQueryGenerationCode({
      queries,
      sampleLogs,
      expectedCategories,
      expectedEsqlSubstrings,
      esClient,
      logger,
    });
  },
});

interface ToolUsageTaskOutput {
  toolUsage?: SignificantEventsToolUsage;
}

/**
 * Validates that the `get_stream_features` and `add_queries` tools were
 * invoked correctly during significant event generation.
 *
 * Checks:
 * - `get_stream_features` was called at least once
 * - `add_queries` was called at least once
 * - No tool call failures occurred
 */
const createToolUsageEvaluator = (): Evaluator => ({
  name: 'tool_usage_validation',
  kind: 'CODE',
  evaluate: async ({ output }) => {
    const toolUsage = (output as ToolUsageTaskOutput)?.toolUsage;

    if (!toolUsage) {
      return {
        score: null,
        label: 'unavailable',
        explanation: 'No toolUsage data returned from task',
      };
    }

    const scores: number[] = [];
    const issues: string[] = [];

    if (toolUsage.get_stream_features.calls >= 1) {
      scores.push(1);
    } else {
      scores.push(0);
      issues.push('get_stream_features was never called');
    }

    if (toolUsage.add_queries.calls >= 1) {
      scores.push(1);
    } else {
      scores.push(0);
      issues.push('add_queries was never called');
    }

    const totalCalls = toolUsage.get_stream_features.calls + toolUsage.add_queries.calls;
    const totalFailures = toolUsage.get_stream_features.failures + toolUsage.add_queries.failures;

    if (totalCalls > 0) {
      const successRate = 1 - totalFailures / totalCalls;
      scores.push(successRate);
      if (totalFailures > 0) {
        issues.push(`${totalFailures}/${totalCalls} tool calls failed`);
      }
    }

    const score = scores.reduce((sum, s) => sum + s, 0) / scores.length;

    return {
      score,
      explanation:
        issues.length > 0
          ? issues.join('; ')
          : `All tool calls succeeded (get_stream_features: ${toolUsage.get_stream_features.calls}, add_queries: ${toolUsage.add_queries.calls})`,
      metadata: {
        get_stream_features: toolUsage.get_stream_features,
        add_queries: toolUsage.add_queries,
      },
    };
  },
});

export const createKIQueryGenerationEvaluators = (
  esClient: ElasticsearchClient,
  scenarioCriteria?: {
    criteriaFn: (criteria: EvaluationCriterion[]) => Evaluator;
    criteria: EvaluationCriterion[];
  },
  logger?: Logger
) => {
  const base = [
    ...selectEvaluators([createKIQueryGenerationCodeEvaluator(esClient, logger)]),
    createToolUsageEvaluator(),
  ];

  if (!scenarioCriteria) {
    return base;
  }

  const { criteriaFn, criteria } = scenarioCriteria;
  return [
    ...base,
    createScenarioCriteriaLlmEvaluator<KIQueryGenerationEvaluationExample, KIQueryGenerationOutput>(
      {
        criteriaFn: (c) =>
          criteriaFn(c) as Evaluator<KIQueryGenerationEvaluationExample, KIQueryGenerationOutput>,
        criteria,
        transformOutput: (output) => getQueriesFromOutput(output),
      }
    ),
  ];
};
