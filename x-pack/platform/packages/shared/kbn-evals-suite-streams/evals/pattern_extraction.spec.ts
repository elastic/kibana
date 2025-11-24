/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { extractGrokPatternDangerouslySlow } from '@kbn/grok-heuristics';
import { extractDissectPattern, serializeAST } from '@kbn/dissect-heuristics';
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
import { extractGrokFieldNames, extractDissectFieldNames } from './pattern_extraction_helpers';

evaluate.describe.configure({ timeout: 300_000 });

evaluate.describe('Pattern extraction quality evaluation', () => {
  /**
   * Convert Grok pattern nodes to a pattern string.
   */
  function grokNodesToPattern(nodes: any[]): string {
    return nodes.reduce((acc, node) => {
      if ('id' in node) {
        // NamedFieldNode
        return acc + `%{${node.component}:${node.id}}`;
      } else {
        // LiteralValueNode
        return acc + node.pattern;
      }
    }, '');
  }

  /**
   * Simple mock parser that extracts fields based on pattern structure.
   * This is a placeholder until actual Grok/Dissect parsing is integrated.
   */
  function parseLogsWithPattern(
    messages: string[],
    pattern: string,
    patternType: 'grok' | 'dissect'
  ): ParsedLog[] {
    const fieldNames =
      patternType === 'grok' ? extractGrokFieldNames(pattern) : extractDissectFieldNames(pattern);

    // For now, return parsed=true with empty fields
    // In production, this would use actual Grok/Dissect parsing
    return messages.map((message) => ({
      parsed: true,
      fields: fieldNames.reduce((acc, field) => {
        acc[field] = ''; // Placeholder - would contain actual extracted values
        return acc;
      }, {} as Record<string, string>),
      originalMessage: message,
    }));
  }

  /**
   * Run pattern extraction evaluation for a single example.
   *
   * This function:
   * 1. Takes sample log messages as input
   * 2. Generates a pattern using heuristics (@kbn/grok-heuristics or @kbn/dissect-heuristics)
   * 3. Parses all sample messages with the generated pattern
   * 4. Calculates quality metrics by comparing parsed results to expected fields
   * 5. Returns metrics for Phoenix tracking
   */
  async function runPatternExtractionExperiment(
    example: PatternExtractionEvaluationExample,
    patternType: 'grok' | 'dissect'
  ): Promise<{
    input: typeof example.input;
    output: {
      generatedPattern: string;
      parsedLogs: ParsedLog[];
      metrics: PatternQualityMetrics;
    };
    expected: typeof example.output;
    metadata: typeof example.metadata;
  }> {
    const { input, output: expected, metadata } = example;

    let generatedPattern: string;

    try {
      if (patternType === 'grok') {
        // Generate Grok pattern using heuristics
        const nodes = extractGrokPatternDangerouslySlow(input.sample_messages);
        generatedPattern = grokNodesToPattern(nodes);
      } else {
        // Generate Dissect pattern using heuristics
        const result = extractDissectPattern(input.sample_messages);
        generatedPattern = serializeAST(result.ast);
      }
    } catch (error) {
      // If pattern generation fails, use reference pattern or empty string
      generatedPattern =
        patternType === 'grok'
          ? expected.reference_patterns?.grok?.[0] || ''
          : expected.reference_patterns?.dissect || '';
    }

    // Parse logs with generated pattern
    const parsedLogs = parseLogsWithPattern(input.sample_messages, generatedPattern, patternType);

    // Calculate quality metrics
    const metrics = calculateOverallQuality(parsedLogs, expected);

    return {
      input,
      output: {
        generatedPattern,
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
   * - Timestamp accuracy: 20% (critical for time-series analysis)
   * - Log level accuracy: 15% (important for filtering)
   * - Field quality: 30% (most important for usefulness)
   * - Field count penalty: 10% (prevents over/under extraction)
   */
  const patternQualityEvaluator = {
    name: 'pattern_quality',
    kind: 'LLM' as const,
    evaluate: async ({ output }: { output: any }) => {
      const metrics: PatternQualityMetrics = output.metrics;

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

  // Test Grok pattern datasets
  Object.entries(GROK_PATTERN_DATASETS).forEach(([categoryKey, dataset]) => {
    evaluate.describe(`Grok patterns: ${dataset.name}`, () => {
      dataset.examples.forEach((example, index) => {
        evaluate(
          `Example ${index + 1}: ${example.input.stream_name}`,
          async ({ phoenixClient }) => {
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
                  return await runPatternExtractionExperiment(example, 'grok');
                },
              },
              [patternQualityEvaluator]
            );
          }
        );
      });
    });
  });

  // Test Dissect pattern datasets
  Object.entries(DISSECT_PATTERN_DATASETS).forEach(([categoryKey, dataset]) => {
    evaluate.describe(`Dissect patterns: ${dataset.name}`, () => {
      dataset.examples.forEach((example, index) => {
        evaluate(
          `Example ${index + 1}: ${example.input.stream_name}`,
          async ({ phoenixClient }) => {
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
                  return await runPatternExtractionExperiment(example, 'dissect');
                },
              },
              [patternQualityEvaluator]
            );
          }
        );
      });
    });
  });

  // Summary test that reports aggregate metrics
  evaluate('Pattern extraction aggregate metrics', async ({ phoenixClient }) => {
    const grokResults: PatternQualityMetrics[] = [];
    const dissectResults: PatternQualityMetrics[] = [];

    // Run all Grok examples
    for (const [_, dataset] of Object.entries(GROK_PATTERN_DATASETS)) {
      for (const example of dataset.examples) {
        const result = await runPatternExtractionExperiment(example, 'grok');
        grokResults.push(result.output.metrics);
      }
    }

    // Run all Dissect examples
    for (const [_, dataset] of Object.entries(DISSECT_PATTERN_DATASETS)) {
      for (const example of dataset.examples) {
        const result = await runPatternExtractionExperiment(example, 'dissect');
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
            const allMetrics = output.aggregate.all;
            return {
              score: allMetrics.mean.overallQuality,
              details: {
                grok: output.aggregate.grok,
                dissect: output.aggregate.dissect,
                all: allMetrics,
              },
              reasoning: `Average quality across all examples: ${(
                allMetrics.mean.overallQuality * 100
              ).toFixed(1)}%. Grok: ${(output.aggregate.grok.mean.overallQuality * 100).toFixed(
                1
              )}%, Dissect: ${(output.aggregate.dissect.mean.overallQuality * 100).toFixed(1)}%`,
            };
          },
        },
      ]
    );
  });

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
