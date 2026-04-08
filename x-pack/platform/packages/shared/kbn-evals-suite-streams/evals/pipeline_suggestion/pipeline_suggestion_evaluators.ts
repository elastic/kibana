/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator, Example, DefaultEvaluators } from '@kbn/evals';
import type { PipelineSuggestionResult } from './pipeline_suggestion_task';
import type {
  PipelineSuggestionGroundTruth,
  PipelineSuggestionEvaluationExample,
} from './pipeline_suggestion_datasets';
import { formatPercent } from '../shared_helpers';

/**
 * Code-based evaluator that calculates pipeline quality metrics.
 */
export const pipelineQualityScoreEvaluator: Evaluator<Example, PipelineSuggestionResult> = {
  name: 'pipeline_quality_score',
  kind: 'CODE',
  evaluate: async ({ output }) => {
    const { metrics } = output.output;

    if (!metrics) {
      // eslint-disable-next-line no-console
      console.error('No metrics found in output:', JSON.stringify(output, null, 2));
      return { score: 0, reasoning: 'No metrics available' };
    }

    const issues: string[] = [];
    if (metrics.parseRate < 0.8) issues.push(`Low parse rate: ${formatPercent(metrics.parseRate)}`);
    if (metrics.otelCompliance < 0.7)
      issues.push(`Low OTel compliance: ${formatPercent(metrics.otelCompliance)}`);
    if (metrics.semanticFieldCoverage < 0.6)
      issues.push(`Missing semantic fields: ${formatPercent(metrics.semanticFieldCoverage)}`);
    if (metrics.stepEfficiency < 1.0)
      issues.push(
        `Too many steps (${metrics.stepCount}): efficiency ${formatPercent(metrics.stepEfficiency)}`
      );
    if (metrics.hasRedundantProcessors) issues.push(`Has redundant processors`);

    return {
      score: metrics.overallQuality,
      metadata: {
        parseRate: metrics.parseRate,
        otelCompliance: metrics.otelCompliance,
        semanticFieldCoverage: metrics.semanticFieldCoverage,
        typeCorrectness: metrics.typeCorrectness,
        stepCount: metrics.stepCount,
        stepEfficiency: metrics.stepEfficiency,
        processorFailureRates: metrics.processorFailureRates,
      },
      reasoning:
        issues.length > 0
          ? `Issues: ${issues.join('; ')}`
          : `Good quality: ${formatPercent(metrics.overallQuality)}`,
    };
  },
};

/**
 * LLM-based evaluator with clear criteria for pipeline quality assessment.
 */
export const createPipelineSuggestionLlmEvaluator = (
  evaluators: DefaultEvaluators
): Evaluator<Example, PipelineSuggestionResult> => ({
  name: 'llm_pipeline_quality',
  kind: 'LLM',
  evaluate: async ({ output, expected, input, metadata }) => {
    const { suggestedPipeline, metrics } = output.output;
    const exp = expected as PipelineSuggestionGroundTruth;
    const inp = input as PipelineSuggestionEvaluationExample['input'] | undefined;

    const expectsNoPipeline =
      exp.expected_processors?.parsing === undefined &&
      (exp.expected_processors?.normalization?.length ?? 0) === 0;

    const isEmptyPipeline = !suggestedPipeline || (suggestedPipeline.steps?.length ?? 0) === 0;

    if (expectsNoPipeline && isEmptyPipeline) {
      return { score: 1.0 };
    }

    if (expectsNoPipeline && !isEmptyPipeline) {
      return { score: 0.0 };
    }

    if (!metrics) {
      // eslint-disable-next-line no-console
      console.error('No metrics found for LLM evaluator:', JSON.stringify(output, null, 2));
    }

    const criteria = [
      `PARSING QUALITY: The pipeline should successfully parse log messages (≥80% parse rate).
       - Parse rate should be high (from simulation metrics)
       - Key semantic fields should be extracted (timestamp, log level, source info)
       - Field names should follow OTel standards (attributes.*, resource.attributes.*, etc.)`,

      `SCHEMA COMPLIANCE: Extracted field names must match expected OTel schema fields.
       - Check against expected_schema_fields list (OTel conventions only)
       - Fields should use OTel naming: attributes.*, severity_text, body.text, resource.attributes.*
       - At least 70% of expected fields should be present in final output
       - Only count fields that exist in final output (not intermediate fields)`,

      `NORMALIZATION QUALITY: Post-parsing processors should normalize data correctly.
       - DATE processors: Convert custom timestamps to @timestamp (ISO8601)
       - CONVERT processors: String fields converted to proper types (numbers, booleans, IPs)
       - REMOVE processors: Clean up temporary fields after conversion
       - RENAME processors: Map to schema-compliant names`,

      `EFFICIENCY: The pipeline should be optimized with minimal steps.
       - Optimal: 3-6 steps (parsing + essential normalization)
       - Acceptable: 7-8 steps (70% efficiency)
       - Poor: 9-10 steps (40% efficiency)
       - Very poor: >10 steps (10% efficiency - heavy penalty)
       - No duplicate processing or redundant processors
       - Each processor should have <20% failure rate`,

      `ERROR HANDLING: The pipeline should handle edge cases gracefully.
       - Processor failure rates should be reasonable (<20% per processor)
       - Pipeline should not fail completely on individual errors
       - Simulation should show acceptable error handling`,
    ];

    const steps = suggestedPipeline?.steps ?? [];
    const processorTypes = steps.map((s) => (s as { action?: string }).action).join(', ');

    return evaluators.criteria(criteria).evaluate({
      input: {
        system: inp?.system,
        sample_document_count: inp?.sample_document_count,
      },
      output: {
        pipeline_steps: steps,
        processor_types: processorTypes,
        step_count: metrics?.stepCount,
        step_efficiency: metrics?.stepEfficiency,
        parse_rate: metrics?.parseRate,
        processor_failure_rates: metrics?.processorFailureRates,
        semantic_field_coverage: metrics?.semanticFieldCoverage,
        otel_compliance: metrics?.otelCompliance,
      },
      expected: {
        min_parse_rate: exp.quality_thresholds?.min_parse_rate,
        required_fields: exp.quality_thresholds?.required_semantic_fields,
        expected_schema_fields: exp.schema_expectations?.expected_schema_fields,
        expected_processors: exp.expected_processors,
      },
      metadata: (metadata as Record<string, unknown> | null) ?? null,
    });
  },
});
