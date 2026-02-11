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
import { tags } from '@kbn/scout';
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
 * @tags @local-stateful-classic @cloud-stateful-classic
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
   * Run pattern extraction and simulation for a single example.
   */
  async function runPatternExtraction(
    example: PatternExtractionEvaluationExample,
    patternType: 'grok' | 'dissect',
    kbnClient: KbnClient,
    connector: { id: string }
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

    // Step 1: Generate pattern using heuristics
    const { heuristicPattern, reviewFields, patternNodes, dissectResult } =
      generateHeuristicPattern(input.sample_messages, patternType);

    // Step 2: Get LLM suggestions
    const { processor, suggestedPattern } = await getLlmSuggestions(
      kbnClient,
      connector.id,
      input.sample_messages,
      reviewFields,
      patternType,
      heuristicPattern,
      patternNodes,
      dissectResult,
      input.field_to_parse
    );

    // Step 3: Simulate processing
    const parsedLogs = await simulateProcessing(
      kbnClient,
      input.sample_messages,
      input.field_to_parse,
      patternType,
      processor,
      suggestedPattern
    );

    // Step 4: Calculate quality metrics
    const metrics = calculateOverallQuality(parsedLogs, expected);

    return {
      input,
      output: { heuristicPattern, suggestedProcessor: processor, parsedLogs, metrics },
      expected,
      metadata,
    };
  }

  function generateHeuristicPattern(
    messages: string[],
    patternType: 'grok' | 'dissect'
  ): {
    heuristicPattern: string;
    reviewFields: any;
    patternNodes?: any;
    dissectResult?: any;
  } {
    if (patternType === 'grok') {
      const patternNodes = extractGrokPatternDangerouslySlow(messages);
      return {
        heuristicPattern: getGrokPattern(patternNodes),
        reviewFields: getGrokReviewFields(patternNodes, 10),
        patternNodes,
      };
    } else {
      const dissectResult = extractDissectPattern(messages);
      return {
        heuristicPattern: serializeAST(dissectResult.ast),
        reviewFields: getDissectReviewFields(dissectResult, 10),
        dissectResult,
      };
    }
  }

  async function getLlmSuggestions(
    kbnClient: KbnClient,
    connectorId: string,
    messages: string[],
    reviewFields: any,
    patternType: 'grok' | 'dissect',
    heuristicPattern: string,
    patternNodes?: any,
    dissectResult?: any,
    fieldToParse?: string
  ): Promise<{ processor: any; suggestedPattern: string }> {
    try {
      const response = await kbnClient.request({
        method: 'POST',
        path: `/internal/streams/logs/processing/_suggestions/${patternType}`,
        body: {
          connector_id: connectorId,
          sample_messages: messages,
          review_fields: reviewFields,
        },
      });

      const suggestionData = parseSSEResponse(response.data as string);
      if (!suggestionData) {
        return { processor: null, suggestedPattern: heuristicPattern };
      }

      if (patternType === 'grok' && suggestionData.grokProcessor) {
        const processor = getGrokProcessor(patternNodes, suggestionData.grokProcessor);
        return {
          processor,
          suggestedPattern: processor?.patterns?.[0] || heuristicPattern,
        };
      }

      if (patternType === 'dissect' && suggestionData.dissectProcessor) {
        const processor = getDissectProcessorWithReview(
          dissectResult,
          suggestionData.dissectProcessor,
          fieldToParse!
        );
        return {
          processor,
          suggestedPattern: processor?.pattern || heuristicPattern,
        };
      }

      return { processor: null, suggestedPattern: heuristicPattern };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error getting LLM suggestions:', error);
      return { processor: null, suggestedPattern: heuristicPattern };
    }
  }

  function parseSSEResponse(data: string): any {
    const lines = data.split('\n').filter((line) => line.startsWith('data: '));
    const lastLine = lines[lines.length - 1];
    return lastLine ? JSON.parse(lastLine.slice(6)) : null;
  }

  async function simulateProcessing(
    kbnClient: KbnClient,
    messages: string[],
    fieldToParse: string,
    patternType: 'grok' | 'dissect',
    processor: any,
    suggestedPattern: string
  ): Promise<ParsedLog[]> {
    const step =
      patternType === 'grok'
        ? {
            action: 'grok',
            customIdentifier: 'eval-grok',
            from: fieldToParse,
            patterns: processor?.patterns || [suggestedPattern],
            pattern_definitions: processor?.pattern_definitions || {},
          }
        : {
            action: 'dissect',
            customIdentifier: 'eval-dissect',
            from: fieldToParse,
            pattern: processor?.pattern || suggestedPattern,
            append_separator: processor?.processor?.dissect?.append_separator,
          };

    const documents = messages.map((msg) => ({
      [fieldToParse]: msg,
      'stream.name': 'logs',
      '@timestamp': '2025-01-01',
    }));

    try {
      const response = await kbnClient.request({
        method: 'POST',
        path: `/internal/streams/logs/processing/_simulate`,
        body: { documents, processing: { steps: [step] } },
      });

      const result = response.data as {
        documents: Array<{
          status: 'parsed' | 'partially_parsed' | 'skipped' | 'failed';
          value: Record<string, any>;
        }>;
      };

      return result.documents.map((doc, idx) => ({
        parsed: doc.status === 'parsed',
        fields: extractFields(doc.value, fieldToParse, messages[idx]),
        originalMessage: messages[idx],
      }));
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error simulating processing:', error);
      return messages.map((msg) => ({ parsed: false, fields: {}, originalMessage: msg }));
    }
  }

  function extractFields(
    value: Record<string, any>,
    fieldToParse: string,
    originalMessage: string
  ): Record<string, string | number | boolean | null> {
    // Only exclude metadata fields, not fieldToParse
    // If the pattern extracts a body.text field, it's the extracted message (e.g., GREEDYDATA)
    // which IS a valid extraction result we want to show to the evaluator
    const excluded = new Set(['stream.name', '@timestamp']);
    const fields: Record<string, string | number | boolean | null> = {};

    for (const [key, val] of Object.entries(value)) {
      if (!excluded.has(key) && (typeof val === 'string' || typeof val === 'number')) {
        // Skip the fieldToParse only if its value equals the original message
        // (meaning it wasn't transformed/extracted, just passed through)
        if (key === fieldToParse && val === originalMessage) {
          continue;
        }
        fields[key] = val;
      }
    }
    return fields;
  }

  // =============================================================================
  // EVALUATORS
  // =============================================================================

  /** Format a number as a percentage string */
  const formatPercent = (n: number): string => `${(n * 100).toFixed(0)}%`;

  /**
   * Code-based evaluator that calculates pattern quality metrics.
   * Reports detailed breakdown of parse rate, timestamp, log level, and field quality.
   */
  const codeBasedEvaluator = {
    name: 'pattern_quality_score',
    kind: 'CODE' as const,
    evaluate: async ({ output }: { output: any }) => {
      const metrics: PatternQualityMetrics = output?.output?.metrics || output?.metrics;

      if (!metrics) {
        return { score: 0, reasoning: 'No metrics available' };
      }

      const issues: string[] = [];
      if (metrics.parseRate < 0.8)
        issues.push(`Low parse rate: ${formatPercent(metrics.parseRate)}`);
      if (metrics.timestampAccuracy < 0.7)
        issues.push(`Poor timestamp extraction: ${formatPercent(metrics.timestampAccuracy)}`);
      if (metrics.fieldQuality < 0.6)
        issues.push(`Low field quality: ${formatPercent(metrics.fieldQuality)}`);

      return {
        score: metrics.overallQuality,
        details: {
          parseRate: metrics.parseRate,
          timestampAccuracy: metrics.timestampAccuracy,
          logLevelAccuracy: metrics.logLevelAccuracy,
          fieldQuality: metrics.fieldQuality,
          fieldCountPenalty: metrics.fieldCountPenalty,
        },
        reasoning:
          issues.length > 0
            ? `Issues: ${issues.join('; ')}`
            : `Good quality: ${formatPercent(metrics.overallQuality)}`,
      };
    },
  };

  /**
   * LLM-based evaluator with clear, specific criteria.
   * Uses all relevant ground truth data to evaluate extraction quality.
   */
  function createLlmEvaluator(evaluators: any) {
    return {
      name: 'llm_extraction_quality',
      kind: 'LLM' as const,
      evaluate: async ({ input, output, expected }: any) => {
        const parsedLogs = output?.output?.parsedLogs || output?.parsedLogs || [];
        const heuristicPattern = output?.output?.heuristicPattern || '';
        const processor = output?.output?.suggestedProcessor;

        // Extract all ground truth data
        const expectedFields = expected?.expected_fields || output?.expected?.expected_fields || {};
        const characteristics =
          expected?.pattern_characteristics || output?.expected?.pattern_characteristics || {};

        // Timestamp info
        const expectedTimestamp = expectedFields.timestamp?.field_name;

        // Log level info with example values
        const expectedLogLevel = expectedFields.log_level?.field_name;
        const logLevelValues = expectedFields.log_level?.example_values || [];

        // Other fields with type info
        const requiredFields = (expectedFields.other_fields || [])
          .filter((f: any) => f.required)
          .map((f: any) => ({ name: f.name, type: f.type }));
        const optionalFields = (expectedFields.other_fields || [])
          .filter((f: any) => !f.required)
          .map((f: any) => ({ name: f.name, type: f.type }));

        // Field count expectations from ground truth
        const minFields = characteristics.expected_min_fields || 3;
        const maxFields = characteristics.expected_max_fields || 10;

        // Build extraction examples
        const examples = parsedLogs.map((log: ParsedLog) => ({
          original: log.originalMessage.slice(0, 200),
          parsed: log.parsed,
          extractedFields: Object.keys(log.fields),
          fieldValues: log.fields,
        }));

        const criteria = [
          // Criterion 1: Parse success rate
          `PARSE SUCCESS: The pattern must successfully parse log messages.
           Check if most examples have "parsed: true".
           - 100% parse rate: Excellent
           - 80%+ parse rate: Acceptable
           - Below 80%: Pattern has problems
           A failing parse indicates a fundamental pattern mismatch.`,

          // Criterion 2: Expected field extraction
          `EXPECTED FIELDS: The extraction must capture these specific fields:

           ${
             expectedTimestamp
               ? `TIMESTAMP: Look for a field like "${expectedTimestamp}"`
               : 'No timestamp field expected.'
           }
           ${
             expectedLogLevel
               ? `LOG LEVEL: Look for a field like "${expectedLogLevel}" with values like: ${logLevelValues.join(
                   ', '
                 )}`
               : 'No log level field expected.'
           }
           ${
             requiredFields.length > 0
               ? `REQUIRED FIELDS:\n${requiredFields
                   .map((f: { name: string; type: string }) => `  - "${f.name}" (${f.type})`)
                   .join('\n')}`
               : ''
           }
           ${
             optionalFields.length > 0
               ? `OPTIONAL FIELDS (bonus if present):\n${optionalFields
                   .map((f: { name: string; type: string }) => `  - "${f.name}" (${f.type})`)
                   .join('\n')}`
               : ''
           }

           Field names don't need to match exactly, but should be semantically equivalent.
           Example: "attributes.source.ip", "source_ip", "client_ip" all represent the source IP.`,

          // Criterion 3: Field naming conventions (OTEL/ECS standards)
          `FIELD NAMING: Field names should follow OpenTelemetry (OTEL) and Elastic Common Schema (ECS) standards.

           EXCELLENT naming (standard-compliant):
           - OTEL standard: "severity_text", "trace_id", "span_id", "service.name", "resource.attributes.*"
           - ECS standard: "source.ip", "host.name", "process.pid", "http.response.status_code", "user.name"
           - Combined: "attributes.source.ip", "attributes.http.status_code"
           - Body field: "body.text" (standard for message content)

           GOOD naming (semantic but non-standard):
           - Descriptive hierarchical names like "custom.timestamp", "nginx.error.connection_id"
           - Domain-specific names that describe the data

           BAD naming (avoid):
           - Numbered fields: "field1", "field2", "f0", "column1"
           - Generic placeholders: "data", "value", "content", "text"
           - Single letters or meaningless abbreviations

           The field name should describe what the data represents.`,

          // Criterion 4: Value type correctness
          `VALUE QUALITY: Extracted values should match their expected types:

           - TIMESTAMP values: Should contain date/time info (digits, separators, timezone)
           - IP values: Should look like IP addresses (e.g., "192.168.1.1" or IPv6)
           - NUMBER values: Should be numeric, not strings with units
           - KEYWORD values: Clean strings without excessive delimiters

           ACCEPTABLE: Quoted strings, special chars, brackets if part of original data.
           Example: User-agent "Mozilla/5.0 (Windows NT 6.1)" is correctly extracted.

           NOT ACCEPTABLE: Leading/trailing delimiters that should be stripped.
           Example: "[INFO]" when it should be "INFO".`,

          // Criterion 5: Field count (using ground truth values)
          `FIELD COUNT: This log format should extract ${minFields}-${maxFields} fields.

           - Less than ${minFields} fields: Important data is being missed
           - ${minFields}-${maxFields} fields: Optimal extraction
           - More than ${maxFields} fields: May indicate over-extraction or splitting

           Count the actual extracted fields in each example and compare.`,
        ];

        return evaluators.criteria(criteria).evaluate({
          input: {
            sample_logs: input?.sample_messages || [],
            pattern_type: processor?.patterns ? 'grok' : 'dissect',
          },
          output: {
            pattern: processor?.patterns?.[0] || processor?.pattern || heuristicPattern,
            extraction_examples: examples,
          },
          expected: {
            timestamp_field: expectedTimestamp,
            log_level_field: expectedLogLevel,
            log_level_values: logLevelValues,
            required_fields: requiredFields.map((f: { name: string }) => f.name),
            optional_fields: optionalFields.map((f: { name: string }) => f.name),
            field_count_range: `${minFields}-${maxFields}`,
          },
        });
      },
    };
  }

  // =============================================================================
  // TEST RUNNER
  // =============================================================================

  /**
   * Run tests for a collection of pattern datasets.
   */
  function runDatasetTests(
    datasets: Record<
      string,
      { name: string; description: string; examples: PatternExtractionEvaluationExample[] }
    >,
    patternType: 'grok' | 'dissect'
  ) {
    const label = patternType === 'grok' ? 'Grok' : 'Dissect';

    Object.entries(datasets).forEach(([_, dataset]) => {
      evaluate.describe(`${label}: ${dataset.name}`, { tag: tags.stateful.classic }, () => {
        dataset.examples.forEach((example, idx) => {
          evaluate(
            `${idx + 1}. ${example.input.stream_name}`,
            async ({ phoenixClient, kbnClient, connector, evaluators }) => {
              await phoenixClient.runExperiment(
                {
                  dataset: {
                    name: `${label} - ${example.input.stream_name}`,
                    description: dataset.description,
                    examples: [
                      {
                        input: example.input,
                        output: example.output as unknown as Record<string, unknown>,
                        metadata: example.metadata,
                      },
                    ],
                  },
                  task: () => runPatternExtraction(example, patternType, kbnClient, connector),
                },
                [codeBasedEvaluator, createLlmEvaluator(evaluators)]
              );
            }
          );
        });
      });
    });
  }

  // Run all pattern extraction tests
  runDatasetTests(GROK_PATTERN_DATASETS, 'grok');
  runDatasetTests(DISSECT_PATTERN_DATASETS, 'dissect');
});
