/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { SignificantEventType } from '@kbn/streams-ai/src/significant_events/types';
import { createKIQueryGenerationEvaluators } from './ki_query_generation_evaluators';

const createEsClient = (
  responses: Record<string, { values?: unknown[][]; error?: Error }>
): ElasticsearchClient =>
  ({
    esql: {
      query: jest.fn(async ({ query }: { query: string }) => {
        const response = responses[query];
        if (response?.error) {
          throw response.error;
        }

        return {
          values: response?.values ?? [],
        };
      }),
    },
  } as unknown as ElasticsearchClient);

const getKIQueryGenerationCodeEvaluator = (esClient: ElasticsearchClient) =>
  createKIQueryGenerationEvaluators(esClient).find(
    (evaluator) => evaluator.name === 'ki_query_generation_code_evaluator'
  )!;

describe('KI query generation code evaluator', () => {
  it('scores full credit when generated queries satisfy all KI query generation checks', async () => {
    const firstQuery = 'FROM logs | WHERE message LIKE "*timeout*"';
    const secondQuery = 'FROM logs | WHERE message LIKE "*charge*"';
    const evaluator = getKIQueryGenerationCodeEvaluator(
      createEsClient({
        [firstQuery]: { values: [[1]] },
        [secondQuery]: { values: [[1]] },
      })
    );

    const result = await evaluator.evaluate({
      input: {
        sample_logs: ['payment timeout observed', 'failed to charge card'],
      },
      output: [
        {
          esql: firstQuery,
          title: 'Payment timeout rule',
          category: 'error',
          severity_score: 80,
          evidence: ['timeout'],
        },
        {
          esql: secondQuery,
          title: 'Charge failure rule',
          category: 'operational',
          severity_score: 60,
          evidence: ['charge'],
        },
      ],
      expected: {
        expected_categories: ['error', 'operational'],
        esql_substrings: ['timeout', 'charge'],
      },
      metadata: null,
    });

    expect(result.score).toBe(1);
    expect(result.details).toMatchObject({
      syntaxValidityRate: 1,
      executionHitRate: 1,
      categoryComplianceRate: 1,
      severityComplianceRate: 1,
      expectedCategoryCoverageRate: 1,
      esqlSubstringCoverageRate: 1,
      evidenceGroundingRate: 1,
    });
  });

  it('scores softly when rules miss expected categories, substrings, severity bounds, and evidence', async () => {
    const query = 'FROM logs | WHERE message LIKE "*alpha*"';
    const evaluator = getKIQueryGenerationCodeEvaluator(
      createEsClient({
        [query]: { values: [] },
      })
    );

    const result = await evaluator.evaluate({
      input: {
        sample_logs: ['Request TARGET completed'],
      },
      output: [
        {
          esql: query,
          title: 'Bad rule',
          category: 'not-a-real-category' as unknown as SignificantEventType,
          severity_score: 101,
          evidence: ['GET'],
        },
      ],
      expected: {
        expected_categories: ['error'],
        esql_substrings: ['timeout'],
      },
      metadata: null,
    });

    expect(result.score).toBeCloseTo(1 / 7, 5);
    expect(result.explanation).toContain('Missing expected categories: error');
    expect(result.explanation).toContain('Missing expected ES|QL substrings: timeout');
    expect(result.explanation).toContain('Evidence not found in sample logs: GET');
    expect(result.details).toMatchObject({
      syntaxValidityRate: 1,
      executionHitRate: 0,
      categoryComplianceRate: 0,
      severityComplianceRate: 0,
      expectedCategoryCoverageRate: 0,
      esqlSubstringCoverageRate: 0,
      evidenceGroundingRate: 0,
    });
  });
});
