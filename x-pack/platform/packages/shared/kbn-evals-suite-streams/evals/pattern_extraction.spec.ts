/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  extractGrokPatternDangerouslySlow,
  getReviewFields as getGrokReviewFields,
  getGrokProcessor,
  getGrokPattern,
} from '@kbn/grok-heuristics';
import {
  extractDissectPattern,
  serializeAST,
  getReviewFields as getDissectReviewFields,
  getDissectProcessorWithReview,
} from '@kbn/dissect-heuristics';
import type { KbnClient } from '@kbn/scout';
import { evaluate } from '../src/evaluate';
import {
  GROK_PATTERN_DATASETS,
  DISSECT_PATTERN_DATASETS,
  type PatternExtractionEvaluationExample,
} from './pattern_extraction_datasets';
import {
  calculateOverallQuality,
  type ParsedLog,
  type PatternQualityMetrics,
} from './pattern_extraction_metrics';

/**
 * Pattern extraction quality evaluation
 *
 * Tests the quality of Grok and Dissect pattern generation using real log samples
 * and comprehensive quality metrics.
 *
 * @tags @ess
 */

evaluate.describe.configure({ timeout: 300_000 });

evaluate.describe('Pattern extraction quality evaluation', () => {
  evaluate.beforeEach(async ({ apiServices }) => {
    await apiServices.streams.enable();
  });

  evaluate.afterEach(async ({ apiServices }) => {
    await apiServices.streams.disable();
  });

  /**
   * Run pattern extraction evaluation for a single example.
   *
   * This function:
   * 1. Generates initial pattern using heuristics
   * 2. Gets review fields from the pattern
   * 3. Calls suggestions API to get LLM-improved pattern
   * 4. Builds processor using getGrokProcessor/getDissectProcessorWithReview
   * 5. Simulates processing with the processor
   * 6. Calculates quality metrics by comparing results to expected fields
   */
  async function runPatternExtractionExperiment(
    example: PatternExtractionEvaluationExample,
    patternType: 'grok' | 'dissect',
    kbnClient: KbnClient,
    connector: any,
    fetch: any
  ): Promise<{
    input: typeof example.input;
    output: {
      heuristicPattern: string;
      suggestedProcessor: any;
      parsedLogs: ParsedLog[];
      metrics: PatternQualityMetrics;
    };
    expected: typeof example.output;
    metadata: typeof example.metadata;
  }> {
    const { input, output: expected, metadata } = example;

    let heuristicPattern: string;
    let reviewFields: any;
    let patternNodes: any;
    let dissectResult: any;

    if (patternType === 'grok') {
      // Generate Grok pattern using heuristics
      patternNodes = extractGrokPatternDangerouslySlow(input.sample_messages);
      heuristicPattern = getGrokPattern(patternNodes);
      reviewFields = getGrokReviewFields(patternNodes, 10);
    } else {
      // Generate Dissect pattern using heuristics
      dissectResult = extractDissectPattern(input.sample_messages);
      heuristicPattern = serializeAST(dissectResult.ast);
      reviewFields = getDissectReviewFields(dissectResult, 10);
    }

    // Get LLM suggestions and build processor
    let processor: any = null;
    let suggestedPattern = heuristicPattern;

    try {
      const suggestionResponse = await kbnClient.request({
        method: 'POST',
        path: `/internal/streams/logs/processing/_suggestions/${patternType}`,
        body: {
          connector_id: connector.id,
          sample_messages: input.sample_messages.slice(0, 10),
          review_fields: reviewFields,
        },
      });
      const responseLines = (suggestionResponse.data as string).split('\n');
      const dataLines = responseLines.filter((line: string) => line.startsWith('data: '));
      const lastDataLine = dataLines[dataLines.length - 1];
      const suggestionData = lastDataLine ? JSON.parse(lastDataLine.slice(6)) : null;

      if (patternType === 'grok') {
        // Build Grok processor with LLM suggestions
        if (suggestionData?.grokProcessor) {
          processor = getGrokProcessor(patternNodes, suggestionData.grokProcessor);
          if (processor?.patterns?.[0]) {
            suggestedPattern = processor.patterns[0];
          }
        }
      } else {
        // Build Dissect processor with LLM suggestions
        if (suggestionData?.dissectProcessor) {
          processor = getDissectProcessorWithReview(
            dissectResult,
            suggestionData.dissectProcessor,
            input.field_to_parse
          );
          if (processor?.pattern) {
            suggestedPattern = processor.pattern;
          }
        }
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error getting suggestions:', error);
      // If suggestions fail, use heuristic pattern
      suggestedPattern = heuristicPattern;
    }

    // Build processing steps
    const steps =
      patternType === 'grok'
        ? [
            {
              action: 'grok',
              customIdentifier: 'eval-grok',
              from: input.field_to_parse,
              patterns: processor?.patterns || [suggestedPattern],
              pattern_definitions: processor?.pattern_definitions || {},
            },
          ]
        : [
            {
              action: 'dissect',
              customIdentifier: 'eval-dissect',
              from: input.field_to_parse,
              pattern: processor?.pattern || suggestedPattern,
              append_separator: processor?.processor?.dissect?.append_separator,
            },
          ];

    const documents = input.sample_messages.map((msg) => ({
      [input.field_to_parse]: msg,
      'stream.name': 'logs',
      '@timestamp': '2025-01-01',
    }));

    let parsedLogs: ParsedLog[];
    try {
      const simulateResponse = await kbnClient.request({
        method: 'POST',
        path: `/internal/streams/logs/processing/_simulate`,
        body: {
          documents,
          processing: { steps },
        },
      });

      // The simulation response has structure: { documents: SimulationDocReport[], ... }
      // Each SimulationDocReport has: { status, value: FlattenRecord, detected_fields, errors }
      const simulationResult = simulateResponse.data as {
        documents: Array<{
          status: 'parsed' | 'partially_parsed' | 'skipped' | 'failed';
          value: Record<string, any>;
          detected_fields: Array<{ processor_id: string; name: string }>;
          errors: any[];
        }>;
      };

      parsedLogs = simulationResult.documents.map((docReport, idx: number) => {
        const fields: Record<string, string> = {};
        // Extract fields from the 'value' property, excluding the original field and metadata
        for (const [key, value] of Object.entries(docReport.value)) {
          if (
            key !== input.field_to_parse &&
            key !== 'stream.name' &&
            key !== '@timestamp' &&
            typeof value === 'string'
          ) {
            fields[key] = value;
          }
        }
        return {
          parsed: docReport.status === 'parsed',
          fields,
          originalMessage: input.sample_messages[idx],
        };
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error simulating processing:', error);
      // If simulation fails, mark all as unparsed
      parsedLogs = input.sample_messages.map((msg) => ({
        parsed: false,
        fields: {},
        originalMessage: msg,
      }));
    }

    // Calculate quality metrics
    const metrics = calculateOverallQuality(parsedLogs, expected);

    return {
      input,
      output: {
        heuristicPattern,
        suggestedProcessor: processor,
        parsedLogs,
        metrics,
      },
      expected,
      metadata,
    };
  }

  /**
   * Evaluator function that scores pattern quality using Phoenix.
   *
   * Scores are based on the weighted quality metrics:
   * - Parse rate: 25% (must parse successfully)
   * - Timestamp accuracy: 20% (timestamp field extracted)
   * - Log level accuracy: 15% (important for filtering)
   * - Field quality: 30% (most important for usefulness)
   * - Field count penalty: 10% (prevents over/under extraction)
   */
  const patternQualityEvaluator = {
    name: 'pattern_quality',
    kind: 'LLM' as const,
    evaluate: async ({ output }: { output: any }) => {
      // The output is the full result from runPatternExtractionExperiment
      const metrics: PatternQualityMetrics = output?.output?.metrics || output?.metrics;

      if (!metrics) {
        throw new Error('No metrics found in output');
      }

      return {
        score: metrics.overallQuality,
        details: {
          parseRate: metrics.parseRate,
          timestampAccuracy: metrics.timestampAccuracy,
          logLevelAccuracy: metrics.logLevelAccuracy,
          fieldQuality: metrics.fieldQuality,
          fieldCountPenalty: metrics.fieldCountPenalty,
        },
        reasoning: generateEvaluationReasoning(metrics),
      };
    },
  };

  /**
   * Generate human-readable reasoning for the evaluation score.
   */
  function generateEvaluationReasoning(metrics: PatternQualityMetrics): string {
    const issues: string[] = [];
    const strengths: string[] = [];

    // Analyze parse rate
    if (metrics.parseRate < 0.8) {
      issues.push(`Low parse rate (${(metrics.parseRate * 100).toFixed(1)}%)`);
    } else if (metrics.parseRate === 1.0) {
      strengths.push('Perfect parse rate');
    }

    // Analyze timestamp accuracy
    if (metrics.timestampAccuracy < 0.7) {
      issues.push(`Poor timestamp extraction (${(metrics.timestampAccuracy * 100).toFixed(1)}%)`);
    } else if (metrics.timestampAccuracy > 0.9) {
      strengths.push('Excellent timestamp extraction');
    }

    // Analyze log level accuracy
    if (metrics.logLevelAccuracy < 0.7 && metrics.logLevelAccuracy > 0) {
      issues.push(
        `Inaccurate log level extraction (${(metrics.logLevelAccuracy * 100).toFixed(1)}%)`
      );
    } else if (metrics.logLevelAccuracy > 0.9) {
      strengths.push('Accurate log level extraction');
    }

    // Analyze field quality
    if (metrics.fieldQuality < 0.6) {
      issues.push(`Low field quality (${(metrics.fieldQuality * 100).toFixed(1)}%)`);
    } else if (metrics.fieldQuality > 0.85) {
      strengths.push('High-quality field extraction');
    }

    // Analyze field count penalty
    if (metrics.fieldCountPenalty > 0.3) {
      issues.push(
        `Significant field count mismatch (penalty: ${(metrics.fieldCountPenalty * 100).toFixed(
          1
        )}%)`
      );
    } else if (metrics.fieldCountPenalty < 0.1) {
      strengths.push('Appropriate field count');
    }

    const parts: string[] = [];

    if (strengths.length > 0) {
      parts.push(`Strengths: ${strengths.join(', ')}`);
    }

    if (issues.length > 0) {
      parts.push(`Issues: ${issues.join(', ')}`);
    }

    if (parts.length === 0) {
      parts.push('Average performance across all metrics');
    }

    parts.push(`Overall quality score: ${(metrics.overallQuality * 100).toFixed(1)}%`);

    return parts.join('. ');
  }

  /**
   * Create LLM-based evaluator for pattern quality assessment.
   *
   * Uses the LLM to judge whether the extracted fields are meaningful and accurate
   * compared to the expected fields and original log messages.
   */
  function createLlmPatternEvaluator(evaluators: any) {
    return {
      name: 'llm_pattern_quality',
      kind: 'LLM' as const,
      evaluate: async ({ input, output, expected }: any) => {
        const parsedLogs = output?.output?.parsedLogs || output?.parsedLogs || [];
        const expectedFields = expected?.expected_fields || {};
        const sampleMessages = input?.sample_messages || [];

        // Create a summary of what was extracted
        const extractionSummary = parsedLogs.slice(0, 3).map((log: ParsedLog, idx: number) => {
          return {
            originalMessage: log.originalMessage,
            parsed: log.parsed,
            extractedFields: log.fields,
          };
        });

        const criteria = [
          'The extracted field names are semantically meaningful and follow the attributes.* naming convention',
          'The extracted field values accurately represent the information from the log messages',
          'Important information like timestamps, log levels, and key identifiers are extracted',
          'The extraction avoids over-extraction (too many unnecessary fields) or under-extraction (missing important fields)',
          'Field values are clean and properly formatted (not just raw capture groups)',
        ];

        const result = await evaluators.criteria(criteria).evaluate({
          input: {
            sample_messages: sampleMessages.slice(0, 3),
            expected_fields: expectedFields,
          },
          output: {
            extraction_summary: extractionSummary,
            pattern: output?.output?.suggestedProcessor || output?.suggestedProcessor,
          },
        });

        return result;
      },
    };
  }

  // Test Grok pattern datasets
  Object.entries(GROK_PATTERN_DATASETS).forEach(([categoryKey, dataset]) => {
    evaluate.describe(`Grok patterns: ${dataset.name}`, { tag: '@ess' }, () => {
      dataset.examples.forEach((example, index) => {
        evaluate(
          `Example ${index + 1}: ${example.input.stream_name}`,
          async ({ phoenixClient, kbnClient, connector, fetch, evaluators }) => {
            await phoenixClient.runExperiment(
              {
                dataset: {
                  name: `${dataset.name} - ${example.input.stream_name}`,
                  description: dataset.description,
                  examples: [
                    {
                      input: example.input,
                      output: example.output as unknown as Record<string, unknown>,
                      metadata: example.metadata,
                    },
                  ],
                },
                task: async () => {
                  return await runPatternExtractionExperiment(
                    example,
                    'grok',
                    kbnClient,
                    connector,
                    fetch
                  );
                },
              },
              [patternQualityEvaluator, createLlmPatternEvaluator(evaluators)]
            );
          }
        );
      });
    });
  });

  // Test Dissect pattern datasets
  Object.entries(DISSECT_PATTERN_DATASETS).forEach(([categoryKey, dataset]) => {
    evaluate.describe(`Dissect patterns: ${dataset.name}`, { tag: '@ess' }, () => {
      dataset.examples.forEach((example, index) => {
        evaluate(
          `Example ${index + 1}: ${example.input.stream_name}`,
          async ({ phoenixClient, kbnClient, connector, fetch, evaluators }) => {
            await phoenixClient.runExperiment(
              {
                dataset: {
                  name: `${dataset.name} - ${example.input.stream_name}`,
                  description: dataset.description,
                  examples: [
                    {
                      input: example.input,
                      output: example.output as unknown as Record<string, unknown>,
                      metadata: example.metadata,
                    },
                  ],
                },
                task: async () => {
                  return await runPatternExtractionExperiment(
                    example,
                    'dissect',
                    kbnClient,
                    connector,
                    fetch
                  );
                },
              },
              [patternQualityEvaluator, createLlmPatternEvaluator(evaluators)]
            );
          }
        );
      });
    });
  });

  // Summary test that reports aggregate metrics
  evaluate(
    'Pattern extraction aggregate metrics',
    { tag: '@ess' },
    async ({ phoenixClient, kbnClient, connector, fetch }) => {
      const grokResults: PatternQualityMetrics[] = [];
      const dissectResults: PatternQualityMetrics[] = [];

      // Run all Grok examples
      for (const [_, dataset] of Object.entries(GROK_PATTERN_DATASETS)) {
        for (const example of dataset.examples) {
          const result = await runPatternExtractionExperiment(
            example,
            'grok',
            kbnClient,
            connector,
            fetch
          );
          grokResults.push(result.output.metrics);
        }
      }

      // Run all Dissect examples
      for (const [_, dataset] of Object.entries(DISSECT_PATTERN_DATASETS)) {
        for (const example of dataset.examples) {
          const result = await runPatternExtractionExperiment(
            example,
            'dissect',
            kbnClient,
            connector,
            fetch
          );
          dissectResults.push(result.output.metrics);
        }
      }

      // Calculate aggregate statistics
      const aggregateGrok = calculateAggregateMetrics(grokResults);
      const aggregateDissect = calculateAggregateMetrics(dissectResults);
      const aggregateAll = calculateAggregateMetrics([...grokResults, ...dissectResults]);

      await phoenixClient.runExperiment(
        {
          dataset: {
            name: 'Pattern Extraction Aggregate Metrics',
            description: 'Summary of all pattern extraction evaluations',
            examples: [
              {
                input: {
                  totalExamples: grokResults.length + dissectResults.length,
                  grokExamples: grokResults.length,
                  dissectExamples: dissectResults.length,
                },
                output: {
                  aggregate: {
                    all: aggregateAll,
                    grok: aggregateGrok,
                    dissect: aggregateDissect,
                  },
                },
                metadata: {
                  difficulty: 'aggregate',
                  notes: 'Summary of all pattern extraction evaluations',
                },
              },
            ],
          },
          task: async ({ input, output, metadata }) => {
            return {
              input,
              output,
              expected: {
                description: 'Aggregate metrics across all pattern extraction examples',
              },
              metadata,
            };
          },
        },
        [
          {
            name: 'aggregate_quality',
            kind: 'LLM' as const,
            evaluate: async ({ output }: { output: any }) => {
              // Handle both direct output and nested output structure
              const aggregateData = output?.output?.aggregate || output?.aggregate;

              if (!aggregateData) {
                throw new Error('No aggregate data found in output');
              }

              const allMetrics = aggregateData.all;
              return {
                score: allMetrics.mean.overallQuality,
                details: {
                  grok: aggregateData.grok,
                  dissect: aggregateData.dissect,
                  all: allMetrics,
                },
                reasoning: `Average quality across all examples: ${(
                  allMetrics.mean.overallQuality * 100
                ).toFixed(1)}%. Grok: ${(aggregateData.grok.mean.overallQuality * 100).toFixed(
                  1
                )}%, Dissect: ${(aggregateData.dissect.mean.overallQuality * 100).toFixed(1)}%`,
              };
            },
          },
        ]
      );
    }
  );

  /**
   * Calculate aggregate statistics for a set of quality metrics.
   */
  function calculateAggregateMetrics(metrics: PatternQualityMetrics[]) {
    if (metrics.length === 0) {
      return {
        mean: {
          parseRate: 0,
          timestampAccuracy: 0,
          logLevelAccuracy: 0,
          fieldQuality: 0,
          fieldCountPenalty: 0,
          overallQuality: 0,
        },
        min: {
          parseRate: 0,
          timestampAccuracy: 0,
          logLevelAccuracy: 0,
          fieldQuality: 0,
          fieldCountPenalty: 0,
          overallQuality: 0,
        },
        max: {
          parseRate: 0,
          timestampAccuracy: 0,
          logLevelAccuracy: 0,
          fieldQuality: 0,
          fieldCountPenalty: 0,
          overallQuality: 0,
        },
      };
    }

    const sum = metrics.reduce(
      (acc, m) => ({
        parseRate: acc.parseRate + m.parseRate,
        timestampAccuracy: acc.timestampAccuracy + m.timestampAccuracy,
        logLevelAccuracy: acc.logLevelAccuracy + m.logLevelAccuracy,
        fieldQuality: acc.fieldQuality + m.fieldQuality,
        fieldCountPenalty: acc.fieldCountPenalty + m.fieldCountPenalty,
        overallQuality: acc.overallQuality + m.overallQuality,
      }),
      {
        parseRate: 0,
        timestampAccuracy: 0,
        logLevelAccuracy: 0,
        fieldQuality: 0,
        fieldCountPenalty: 0,
        overallQuality: 0,
      }
    );

    const mean = {
      parseRate: sum.parseRate / metrics.length,
      timestampAccuracy: sum.timestampAccuracy / metrics.length,
      logLevelAccuracy: sum.logLevelAccuracy / metrics.length,
      fieldQuality: sum.fieldQuality / metrics.length,
      fieldCountPenalty: sum.fieldCountPenalty / metrics.length,
      overallQuality: sum.overallQuality / metrics.length,
    };

    const min = metrics.reduce(
      (acc, m) => ({
        parseRate: Math.min(acc.parseRate, m.parseRate),
        timestampAccuracy: Math.min(acc.timestampAccuracy, m.timestampAccuracy),
        logLevelAccuracy: Math.min(acc.logLevelAccuracy, m.logLevelAccuracy),
        fieldQuality: Math.min(acc.fieldQuality, m.fieldQuality),
        fieldCountPenalty: Math.min(acc.fieldCountPenalty, m.fieldCountPenalty),
        overallQuality: Math.min(acc.overallQuality, m.overallQuality),
      }),
      {
        parseRate: 1,
        timestampAccuracy: 1,
        logLevelAccuracy: 1,
        fieldQuality: 1,
        fieldCountPenalty: 1,
        overallQuality: 1,
      }
    );

    const max = metrics.reduce(
      (acc, m) => ({
        parseRate: Math.max(acc.parseRate, m.parseRate),
        timestampAccuracy: Math.max(acc.timestampAccuracy, m.timestampAccuracy),
        logLevelAccuracy: Math.max(acc.logLevelAccuracy, m.logLevelAccuracy),
        fieldQuality: Math.max(acc.fieldQuality, m.fieldQuality),
        fieldCountPenalty: Math.max(acc.fieldCountPenalty, m.fieldCountPenalty),
        overallQuality: Math.max(acc.overallQuality, m.overallQuality),
      }),
      {
        parseRate: 0,
        timestampAccuracy: 0,
        logLevelAccuracy: 0,
        fieldQuality: 0,
        fieldCountPenalty: 0,
        overallQuality: 0,
      }
    );

    return { mean, min, max };
  }
});
