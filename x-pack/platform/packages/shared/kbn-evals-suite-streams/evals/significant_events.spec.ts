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
import type { EvaluationCriterion } from '@kbn/evals/src/evaluators/criteria';
import type { ElasticsearchClient } from '@kbn/core/server';
import kbnDatemath from '@kbn/datemath';

import { evaluate } from '../src/evaluate';
import type { SignificantEventsEvaluationExample } from './significant_events_datasets';
import { SIGNIFICANT_EVENTS_DATASETS } from './significant_events_datasets';
import {
  checkKqlSyntax,
  checkExecutionHit,
  checkCategoryCompliance,
  checkSeverityCompliance,
  checkEvidenceGrounding,
  checkTitleQuality,
  CHECK_IDS,
  calculateSignificantEventsQuality,
  buildMetricsReasoning,
  type CheckResult,
  type QueryValidationDetail,
} from './significant_events_metrics';

const ALLOWED_CATEGORIES = [
  SIGNIFICANT_EVENT_TYPE_OPERATIONAL,
  SIGNIFICANT_EVENT_TYPE_CONFIGURATION,
  SIGNIFICANT_EVENT_TYPE_RESOURCE_HEALTH,
  SIGNIFICANT_EVENT_TYPE_ERROR,
  SIGNIFICANT_EVENT_TYPE_SECURITY,
] as const;

const BASE_LLM_CRITERIA: EvaluationCriterion[] = [
  {
    id: 'semantic_relevance',
    text: 'Each generated KQL query must be semantically relevant to the stream description and the patterns visible in the sample logs. Queries should target events that a user monitoring this specific system would care about. Queries that are generic or unrelated to the observed log patterns should FAIL.',
    score: 2,
  },
  {
    id: 'category_appropriateness',
    text: 'The category assigned to each query (operational, error, security, resource_health, configuration) must semantically match the nature of the event the query captures. For example, a query matching "Failed password" logs should be "security" not "operational". A query matching HTTP 5xx errors should be "error" not "resource_health".',
    score: 1,
  },
  {
    id: 'severity_proportionality',
    text: 'Severity scores should be proportional to the real-world impact of the detected event. Security incidents and crashes should score higher (60-100) than routine operational events (0-40). Scores should follow the documented scale: 80-100 critical, 60-79 high, 40-59 medium, 0-39 low.',
    score: 1,
  },
  {
    id: 'title_descriptiveness',
    text: 'Each query title must clearly describe what the query monitors in a way a user can understand without reading the KQL. Titles like "SSH Brute Force Attempts" or "Java NullPointerException" are good. Titles like "Query 1" or "Error Query" are bad.',
    score: 0.5,
  },
  {
    id: 'query_specificity',
    text: 'Queries should be specific enough to be actionable. Overly broad queries (e.g., message:* or error:*) that would match too many unrelated documents should FAIL. Queries should target specific event patterns identified in the logs or inferred from features.',
    score: 1.5,
  },
];

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
  const executionCheck: CheckResult = syntaxResult.passed
    ? await checkExecutionHit(kql, testIndex, esClient)
    : {
        check: CHECK_IDS.executionHit,
        passed: false,
        expected: '> 0 hits',
        actual: 'skipped (invalid KQL syntax)',
      };

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
    checks: [
      syntaxResult,
      executionCheck,
      categoryResult,
      severityResult,
      evidenceResult,
      titleResult,
    ],
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
      const emptyMetrics = calculateSignificantEventsQuality([], expected.expected_query);
      return {
        score: 0,
        reasoning: 'No queries generated',
        details: emptyMetrics,
      };
    }

    const validationDetails: QueryValidationDetail[] = [];
    const testIndex = metadata.test_index;
    if (!testIndex) throw new Error('test_index is required in metadata');
    for (const query of queries) {
      validationDetails.push(
        await validateQuery({
          query,
          sampleLogs: input.sample_logs,
          testIndex,
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

              try {
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
                          .criteria([...BASE_LLM_CRITERIA, ...expected.criteria])
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
              } finally {
                await esClient.indices.deleteDataStream({ name: testIndex }).catch(() => {});
              }
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

        try {
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
                name: 'llm_evaluator',
                kind: 'LLM',
                evaluate: async ({ input, output, expected, metadata }) => {
                  return evaluators
                    .criteria([
                      'Given an empty datastream with no log data, the output should either contain zero queries or only general-purpose monitoring queries',
                      'The system must not hallucinate specific event patterns, error types, or technology-specific queries without supporting evidence from log data',
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
        } finally {
          await esClient.indices.deleteDataStream({ name: testIndex }).catch(() => {});
        }
      }
    );
  }
);
