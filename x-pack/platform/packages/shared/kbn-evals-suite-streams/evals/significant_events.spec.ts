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
import { generateSignificantEvents } from '@kbn/streams-ai';
import { significantEventsPrompt } from '@kbn/streams-ai/src/significant_events/prompt';
import { tags } from '@kbn/scout';
import type { EvaluatorParams } from '@kbn/evals/src/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import kbnDatemath from '@kbn/datemath';
import { evaluate } from '../src/evaluate';
import type { SignificantEventsEvaluationExample } from './significant_events_datasets';
import { SIGNIFICANT_EVENTS_DATASETS } from './significant_events_datasets';
import {
  checkKqlSyntax,
  checkCategoryCompliance,
  checkSeverityCompliance,
  checkEvidenceGrounding,
  checkTitleQuality,
  calculateSignificantEventsQuality,
  buildMetricsReasoning,
  type QueryValidationDetail,
} from './significant_events_metrics';

const ALLOWED_CATEGORIES = [
  SIGNIFICANT_EVENT_TYPE_OPERATIONAL,
  SIGNIFICANT_EVENT_TYPE_CONFIGURATION,
  SIGNIFICANT_EVENT_TYPE_RESOURCE_HEALTH,
  SIGNIFICANT_EVENT_TYPE_ERROR,
  SIGNIFICANT_EVENT_TYPE_SECURITY,
] as const;

type SignificantEventsQuery = Awaited<
  ReturnType<typeof generateSignificantEvents>
>['queries'][number];

/**
 * Validate a single generated query by running all atomic checks.
 * ES execution check is performed only when syntax is valid.
 */
const validateQuery = async ({
  query,
  sampleLogs,
  testIndex,
  esClient,
}: {
  query: SignificantEventsQuery;
  sampleLogs: string[];
  testIndex: string;
  esClient: ElasticsearchClient;
}): Promise<QueryValidationDetail> => {
  const { kql, title, category, severity_score: severityScore, evidence } = query;

  // 1. KQL Syntax
  const syntaxResult = checkKqlSyntax(kql);

  // 2. Execution Verification (only when syntax is valid)
  let isExecutionHit = false;
  if (syntaxResult.passed) {
    const searchResult = await esClient.search({ index: testIndex, q: kql });
    const total = searchResult.hits.total;
    const hits = typeof total === 'number' ? total : total?.value ?? 0;
    isExecutionHit = hits > 0;
  }

  // 3. Category Compliance
  const categoryResult = checkCategoryCompliance(category, ALLOWED_CATEGORIES);

  // 4. Severity Compliance
  const severityResult = checkSeverityCompliance(severityScore);

  // 5. Evidence Grounding
  const evidenceResult = checkEvidenceGrounding(evidence, sampleLogs);

  // 6. Title Quality
  const titleResult = checkTitleQuality(title);

  return {
    kql,
    title,
    category,
    severityScore,
    isSyntaxValid: syntaxResult.passed,
    isExecutionHit,
    isCategoryCompliant: categoryResult.passed,
    isSeverityCompliant: severityResult.passed,
    hasValidEvidence: evidenceResult.passed,
    hasMeaningfulTitle: titleResult.passed,
  };
};

/**
 * Code-based evaluator that validates generated significant event queries
 * against deterministic rules and ground truth expectations.
 *
 * Returns an overall quality score (0-1) with per-query validation details
 * and structured reasoning.
 */
const codeBasedEvaluator = {
  name: 'significant_events_code_evaluator',
  kind: 'CODE' as const,
  evaluate: async ({
    output,
    esClient,
    input,
    expected,
    metadata,
  }: EvaluatorParams<
    SignificantEventsEvaluationExample,
    SignificantEventsQuery | SignificantEventsQuery[]
  > & {
    esClient: ElasticsearchClient;
  }) => {
    const queries = Array.isArray(output) ? output : [output];

    if (queries.length === 0 || !queries[0] || !queries[0].kql) {
      return {
        score: 0,
        reasoning: 'No queries generated',
        details: {},
      };
    }

    const validationDetails: QueryValidationDetail[] = [];
    for (const query of queries) {
      validationDetails.push(
        await validateQuery({
          query,
          sampleLogs: input.sample_logs,
          testIndex: metadata.test_index ?? '',
          esClient,
        })
      );
    }

    // Calculate aggregate metrics against ground truth
    const metrics = calculateSignificantEventsQuality(validationDetails, expected.expected_query);

    return {
      score: metrics.overallQuality,
      details: { ...metrics, queries: validationDetails },
      reasoning: buildMetricsReasoning(metrics),
    };
  },
};

evaluate.describe(
  'Significant events query generation',
  { tag: tags.serverless.observability.complete },
  () => {
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
            async ({
              executorClient,
              evaluators,
              esClient,
              inferenceClient,
              logger,
              apiServices,
            }) => {
              const testIndex = `logs-sig-events-test-${Date.now()}`;

              // Create the data stream before we start writing to it
              await esClient.indices.createDataStream({ name: testIndex });

              let bulkBody;
              if (example.input.ingest_mode === 'single_doc') {
                const message = example.input.sample_logs.join('\n');
                bulkBody = [
                  { create: { _index: testIndex } },
                  {
                    '@timestamp': new Date().toISOString(),
                    'event.original': message,
                    message,
                  },
                ];
              } else {
                bulkBody = example.input.sample_logs.flatMap((doc) => [
                  { create: { _index: testIndex } },
                  { '@timestamp': new Date().toISOString(), 'event.original': doc, message: doc },
                ]);
              }
              await esClient.bulk({ refresh: true, body: bulkBody });

              await executorClient.runExperiment(
                {
                  dataset: {
                    name: `sig_events: ${example.input.stream_name}`,
                    description: example.input.stream_description,
                    examples: [
                      {
                        input: example.input,
                        output: example.output,
                        metadata: {
                          ...example.metadata,
                          test_index: testIndex,
                        },
                      },
                    ],
                  },
                  task: async () => {
                    const { stream } = await apiServices.streams.getStreamDefinition(testIndex);
                    const { queries } = await generateSignificantEvents({
                      stream,
                      esClient,
                      start: kbnDatemath.parse('now-24h')!.valueOf(),
                      end: kbnDatemath.parse('now')!.valueOf(),
                      inferenceClient,
                      logger,
                      signal: new AbortController().signal,
                      systemPrompt: significantEventsPrompt,
                      getFeatures: async () => example.input.features,
                    });

                    // The task should return the array of generated queries
                    return queries;
                  },
                },

                [
                  {
                    ...codeBasedEvaluator,
                    evaluate: (args) => codeBasedEvaluator.evaluate({ ...args, esClient }),
                  },
                  {
                    name: 'llm_evaluator',
                    kind: 'LLM',
                    evaluate: async ({ input, output, expected, metadata }) => {
                      return evaluators
                        .criteria([
                          'Assert the KQL queries are generated following the user intent',
                        ])
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

    evaluate(
      'empty datastream',
      async ({ executorClient, evaluators, esClient, inferenceClient, logger, apiServices }) => {
        const testIndex = `logs-sig-events-test-${Date.now()}`;
        await esClient.indices.createDataStream({ name: testIndex });
        await executorClient.runExperiment(
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
              const { stream } = await apiServices.streams.getStreamDefinition(testIndex);
              const { queries } = await generateSignificantEvents({
                stream,
                esClient,
                start: kbnDatemath.parse('now-24h')!.valueOf(),
                end: kbnDatemath.parse('now')!.valueOf(),
                inferenceClient,
                logger,
                signal: new AbortController().signal,
                systemPrompt: significantEventsPrompt,
                getFeatures: async () => [],
              });

              return queries;
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
      }
    );
  }
);
