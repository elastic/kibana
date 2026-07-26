/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator, Example, DefaultEvaluators } from '@kbn/evals';
import type { PatternExtractionResult } from './pattern_extraction_task';
import type {
  PatternExtractionGroundTruth,
  PatternExtractionEvaluationExample,
} from './pattern_extraction_datasets';
import { formatPercent } from '../shared_helpers';

/**
 * Raw parse rate as a standalone metric for baseline comparison.
 */
export const parseRateEvaluator: Evaluator<Example, PatternExtractionResult> = {
  name: 'parse_rate',
  kind: 'CODE',
  evaluate: async ({ output }) => {
    const { metrics } = output.output;
    return { score: metrics?.parseRate ?? 0 };
  },
};

/**
 * Code-based evaluator that calculates pattern quality metrics.
 * Reports detailed breakdown of parse rate, timestamp, log level, and field quality.
 */
export const patternQualityScoreEvaluator: Evaluator<Example, PatternExtractionResult> = {
  name: 'pattern_quality_score',
  kind: 'CODE',
  evaluate: async ({ output }) => {
    const { metrics } = output.output;

    if (!metrics) {
      return { score: 0, reasoning: 'No metrics available' };
    }

    const issues: string[] = [];
    if (metrics.parseRate < 0.8) issues.push(`Low parse rate: ${formatPercent(metrics.parseRate)}`);
    if (metrics.timestampAccuracy < 0.7)
      issues.push(`Poor timestamp extraction: ${formatPercent(metrics.timestampAccuracy)}`);
    if (metrics.fieldQuality < 0.6)
      issues.push(`Low field quality: ${formatPercent(metrics.fieldQuality)}`);

    return {
      score: metrics.overallQuality,
      metadata: {
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
export const createPatternExtractionLlmEvaluator = (
  evaluators: DefaultEvaluators
): Evaluator<Example, PatternExtractionResult> => ({
  name: 'llm_extraction_quality',
  kind: 'LLM',
  evaluate: async ({ output, expected, input, metadata }) => {
    const { parsedLogs, heuristicPattern, suggestedProcessor, patternType } = output.output;
    const exp = expected as PatternExtractionGroundTruth | undefined;
    const inp = input as PatternExtractionEvaluationExample['input'] | undefined;

    const expectedFields = exp?.expected_fields;
    const characteristics = exp?.pattern_characteristics;

    const expectedTimestamp = expectedFields?.timestamp?.field_name;
    const expectedLogLevel = expectedFields?.log_level?.field_name;
    const logLevelValues = expectedFields?.log_level?.example_values ?? [];

    const otherFields = expectedFields?.other_fields ?? [];
    const requiredFields = otherFields
      .filter((f) => f.required)
      .map((f) => ({ name: f.name, type: f.type }));
    const optionalFields = otherFields
      .filter((f) => !f.required)
      .map((f) => ({ name: f.name, type: f.type }));

    const minFields = characteristics?.expected_min_fields ?? 3;
    const maxFields = characteristics?.expected_max_fields ?? 10;

    const examples = parsedLogs.map((log) => ({
      original: log.originalMessage.slice(0, 200),
      parsed: log.parsed,
      extractedFields: Object.keys(log.fields),
      fieldValues: log.fields,
    }));

    const criteria = [
      `PARSE SUCCESS: The pattern must successfully parse log messages.
       Check if most examples have "parsed: true".
       - 100% parse rate: Excellent
       - 80%+ parse rate: Acceptable
       - Below 80%: Pattern has problems
       A failing parse indicates a fundamental pattern mismatch.`,

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
               .map((f) => `  - "${f.name}" (${f.type})`)
               .join('\n')}`
           : ''
       }
       ${
         optionalFields.length > 0
           ? `OPTIONAL FIELDS (bonus if present):\n${optionalFields
               .map((f) => `  - "${f.name}" (${f.type})`)
               .join('\n')}`
           : ''
       }

       Field names don't need to match exactly, but should be semantically equivalent.
       Example: "attributes.source.ip", "source_ip", "client_ip" all represent the source IP.`,

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

      `VALUE QUALITY: Extracted values should match their expected types:

       - TIMESTAMP values: Should contain date/time info (digits, separators, timezone)
       - IP values: Should look like IP addresses (e.g., "192.168.1.1" or IPv6)
       - NUMBER values: Should be numeric, not strings with units
       - KEYWORD values: Clean strings without excessive delimiters

       ACCEPTABLE: Quoted strings, special chars, brackets if part of original data.
       Example: User-agent "Mozilla/5.0 (Windows NT 6.1)" is correctly extracted.

       NOT ACCEPTABLE: Leading/trailing delimiters that should be stripped.
       Example: "[INFO]" when it should be "INFO".`,

      `FIELD COUNT: This log format should extract ${minFields}-${maxFields} fields.

       - Less than ${minFields} fields: Important data is being missed
       - ${minFields}-${maxFields} fields: Optimal extraction
       - More than ${maxFields} fields: May indicate over-extraction or splitting

       Count the actual extracted fields in each example and compare.`,
    ];

    const proc = suggestedProcessor as Record<string, unknown> | null;
    const procPatterns = proc?.patterns as string[] | undefined;

    return evaluators.criteria(criteria).evaluate({
      input: {
        sample_logs: inp?.sample_messages ?? [],
        pattern_type: patternType,
      },
      output: {
        pattern: procPatterns?.[0] ?? (proc?.pattern as string | undefined) ?? heuristicPattern,
        extraction_examples: examples,
      },
      expected: {
        timestamp_field: expectedTimestamp,
        log_level_field: expectedLogLevel,
        log_level_values: logLevelValues,
        required_fields: requiredFields.map((f) => f.name),
        optional_fields: optionalFields.map((f) => f.name),
        field_count_range: `${minFields}-${maxFields}`,
      },
      metadata: (metadata as Record<string, unknown> | null) ?? null,
    });
  },
});
