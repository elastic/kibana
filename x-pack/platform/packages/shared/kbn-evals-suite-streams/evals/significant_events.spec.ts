/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fromKueryExpression } from '@kbn/es-query';
import { evaluate } from '@kbn/evals';
import { httpResponseIntoObservable } from '@kbn/sse-utils-client';
import {
  SIGNIFICANT_EVENT_TYPE_CONFIGURATION,
  SIGNIFICANT_EVENT_TYPE_ERROR,
  SIGNIFICANT_EVENT_TYPE_OPERATIONAL,
  SIGNIFICANT_EVENT_TYPE_RESOURCE_HEALTH,
  SIGNIFICANT_EVENT_TYPE_SECURITY,
} from '@kbn/streams-ai/src/significant_events/types';
import { from, lastValueFrom, toArray } from 'rxjs';
import type { SignificantEventsEvaluationExample } from './significant_events_datasets';
import { SIGNIFICANT_EVENTS_DATASETS } from './significant_events_datasets';

const ALLOWED_CATEGORIES = [
  SIGNIFICANT_EVENT_TYPE_OPERATIONAL,
  SIGNIFICANT_EVENT_TYPE_CONFIGURATION,
  SIGNIFICANT_EVENT_TYPE_RESOURCE_HEALTH,
  SIGNIFICANT_EVENT_TYPE_ERROR,
  SIGNIFICANT_EVENT_TYPE_SECURITY,
];

const codeBasedEvaluator = {
  name: 'significant_events_code_evaluator',
  kind: 'CODE' as const,
  evaluate: async ({ output, esClient, example, metadata }: any) => {
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
    const validationDetails = [];

    for (const query of queries) {
      const { kql, category, severity_score, evidence } = query;
      const { sample_logs } = example.input;

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
      if (isSyntaxValid) {
        const searchResult = await esClient.search({
          index: metadata.test_index,
          q: kql,
        });
        const hits = searchResult.hits.total.value;
        if (hits > 0) {
          isExecutionHit = true;
          executionHitCount++;
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
        const allLogs = sample_logs.join('\n');
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
};

evaluate.describe('Significant events query generation', { tag: '@svlOblt' }, () => {
  evaluate.beforeEach(async ({ apiServices }) => {
    await apiServices.streams.enable();
  });

  evaluate.afterEach(async ({ apiServices }) => {
    await apiServices.streams.disable();
  });

  SIGNIFICANT_EVENTS_DATASETS.forEach((dataset) => {
    evaluate.describe(dataset.name, () => {
      dataset.examples.forEach((example: SignificantEventsEvaluationExample) => {
        evaluate(
          example.input.stream_name,
          async ({ phoenixClient, evaluators, connector, fetch, esClient }) => {
            const testIndex = `logs-sig-events-test-${Date.now()}`;

            let bulkBody;
            if ((example.input as any).ingest_mode === 'single_doc') {
              bulkBody = [
                { index: { _index: testIndex } },
                {
                  '@timestamp': new Date().toISOString(),
                  'event.original': example.input.sample_logs.join('\n'),
                },
              ];
            } else {
              bulkBody = example.input.sample_logs.flatMap((doc) => [
                { index: { _index: testIndex } },
                { '@timestamp': new Date().toISOString(), 'event.original': doc },
              ]);
            }
            await esClient.bulk({ refresh: true, body: bulkBody });

            await phoenixClient.runExperiment(
              {
                dataset: {
                  name: `sig_events: ${example.input.stream_name}`,
                  description: example.input.feature_description,
                  examples: [
                    {
                      input: example.input,
                      output: example.output as unknown as Record<string, unknown>,
                      metadata: {
                        ...example.metadata,
                        test_index: testIndex,
                      },
                    },
                  ],
                },
                task: async () => {
                  const events = await lastValueFrom(
                    from(
                      fetch('/api/streams/logs/significant_events/_generate', {
                        method: 'GET',
                        asResponse: true,
                        rawResponse: true,
                        query: {
                          connectorId: connector.id,
                          index: testIndex,
                        },
                      })
                    ).pipe(httpResponseIntoObservable(), toArray())
                  );

                  // The task should return the array of generated queries
                  return events.map((e: any) => e.query);
                },
              },
              [
                codeBasedEvaluator,
                {
                  name: 'llm_evaluator',
                  kind: 'LLM',
                  evaluate: async ({ input, output, expected, metadata }) => {
                    return evaluators
                      .criteria(['Assert the KQL queries are generated following the user intent'])
                      .evaluate({
                        input,
                        expected,
                        output,
                        metadata,
                      });
                  },
                },
              ]
            );

            // Cleanup the test data stream
            await esClient.indices.deleteDataStream({ name: testIndex });
          }
        );
      });
    });
  });

  evaluate('empty datastream', async ({ phoenixClient, evaluators, connector, fetch }) => {
    await phoenixClient.runExperiment(
      {
        dataset: {
          name: 'sig_events: empty datastream',
          description: 'Significant events query generation with empty stream data',
          examples: [
            {
              input: {},
              output: {},
              metadata: {},
            },
          ],
        },
        task: async () => {
          const events = await lastValueFrom(
            from(
              fetch('/api/streams/logs/significant_events/_generate', {
                method: 'GET',
                asResponse: true,
                rawResponse: true,
                query: {
                  connectorId: connector.id,
                },
              })
            ).pipe(httpResponseIntoObservable(), toArray())
          );

          return events.map((e: any) => e.query);
        },
      },
      [
        {
          name: 'evaluator',
          kind: 'LLM',
          evaluate: async ({ input, output, expected, metadata }) => {
            return evaluators
              .criteria(['Assert the KQL queries are generated following the user intent'])
              .evaluate({
                input,
                expected,
                output,
                metadata,
              });
          },
        },
      ]
    );
  });
});
