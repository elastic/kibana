/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator, Example, DefaultEvaluators } from '@kbn/evals';
import type { Condition } from '@kbn/streamlang';
import type { PartitionSuggestionResult } from './partitioning_task';
import type { PartitioningGroundTruth } from './partitioning_datasets';
import { formatPercent } from '../shared_helpers';

const conditionUsesBodyText = (condition: Condition): boolean => {
  if ('and' in condition) {
    return condition.and.some(conditionUsesBodyText);
  }
  if ('or' in condition) {
    return condition.or.some(conditionUsesBodyText);
  }
  if ('not' in condition) {
    return conditionUsesBodyText(condition.not);
  }
  if ('field' in condition) {
    return condition.field === 'body.text';
  }
  return false;
};

export const coverageEvaluator: Evaluator<Example, PartitionSuggestionResult> = {
  name: 'partition_coverage',
  kind: 'CODE',
  evaluate: async ({ output, expected }) => {
    const { metrics } = output.output;
    const exp = expected as PartitioningGroundTruth;

    if (exp.expected_reason) {
      const isExpectedReason =
        output.output.reason === exp.expected_reason || metrics.partitionCount === 0;
      return {
        score: isExpectedReason ? 1 : 0,
        label: isExpectedReason ? 'PASS' : 'FAIL',
        explanation: isExpectedReason
          ? `Expected reason '${exp.expected_reason}' matched`
          : `Expected reason '${exp.expected_reason}' but got '${output.output.reason}' with ${metrics.partitionCount} partitions`,
      };
    }

    const threshold = exp.coverage_threshold;
    const passed = metrics.coverage >= threshold;

    return {
      score: metrics.coverage,
      label: passed ? 'PASS' : 'FAIL',
      explanation: `${formatPercent(
        metrics.coverage
      )} of documents captured by suggested partitions (threshold: ${formatPercent(threshold)})`,
    };
  },
};

export const overlapEvaluator: Evaluator<Example, PartitionSuggestionResult> = {
  name: 'overlap_score',
  kind: 'CODE',
  evaluate: async ({ output, expected }) => {
    const { metrics } = output.output;
    const exp = expected as PartitioningGroundTruth;

    if (exp.expected_reason || metrics.partitionCount <= 1) {
      return {
        score: 1,
        label: 'PASS',
        explanation: 'No overlap applicable (single or no partitions)',
      };
    }

    const threshold = exp.max_overlap_threshold;
    const passed = metrics.overlapScore <= threshold;

    return {
      score: 1 - metrics.overlapScore,
      label: passed ? 'PASS' : 'FAIL',
      explanation: `Score: ${(1 - metrics.overlapScore).toFixed(2)} (${formatPercent(
        metrics.overlapScore
      )} documents match multiple partitions; max allowed: ${formatPercent(threshold)})`,
    };
  },
};

export const createPartitionQualityLlmEvaluator = (
  evaluators: DefaultEvaluators
): Evaluator<Example, PartitionSuggestionResult> => ({
  name: 'llm_partition_quality',
  kind: 'LLM',
  evaluate: async ({ output, expected, input }) => {
    const { suggestedPartitions, reason, metrics } = output.output;
    const exp = expected as PartitioningGroundTruth;
    const inp = input as PartitioningGroundTruth | undefined;

    const isEdgeCase = exp.expected_reason || exp.max_partitions === 0;

    if (isEdgeCase) {
      const hasNoPartitions = suggestedPartitions.length === 0;
      const reasonMatches = !exp.expected_reason || reason === exp.expected_reason;

      if (hasNoPartitions && reasonMatches) return { score: 1.0 };
      if (hasNoPartitions && !reasonMatches) return { score: 0.5 };
      return { score: 0.0 };
    }

    const criteria = [
      `COMPLETENESS: The suggested partitions should capture all distinct log sources/services in the data.
       - Coverage should be at least ${formatPercent(exp.coverage_threshold)}
       - Each distinct system in the data should have a corresponding partition
       - Current coverage: ${formatPercent(metrics.coverage)}`,

      `PURITY: Each partition should correspond to a single unique system or service.
       - Partitions should not overlap significantly (max ${formatPercent(
         exp.max_overlap_threshold
       )} overlap)
       - Current overlap score: ${(1 - metrics.overlapScore).toFixed(2)} (${formatPercent(
        metrics.overlapScore
      )} overlap)
       - Each partition should capture a cohesive group of documents`,

      `NAMING: Partition names should be descriptive and follow naming conventions.
       - Lowercase with dashes (e.g., 'apache-access', 'syslog-auth')
       - No dots in names
       - Names should reflect the content they capture`,

      `GRANULARITY: The number of partitions should be appropriate for the data.
       - Expected ${exp.min_partitions}-${exp.max_partitions} partitions
       - ${metrics.partitionCount} partitions suggested
       - Too many partitions over-fragments the data
       - Too few partitions misses meaningful distinctions`,

      `FIELD SELECTION: Partitions should prefer structured metadata fields over body.text.
       - Using body.text for partitioning is an anti-pattern and should be avoided when structured fields are available
       - ${
         suggestedPartitions.some((p) => conditionUsesBodyText(p.condition))
           ? 'WARNING: Some partitions use body.text'
           : 'No partitions use body.text'
       }
       - Prefer fields like service.name, host.name, cloud.provider, data_layer, os.platform, etc.`,

      `GROUND TRUTH ALIGNMENT: The suggested partitions should semantically match the expected ground truth.
       - Expected partitions describe: ${exp.expected_partitions.map((p) => p.name).join(', ')}
       - Suggested partitions: ${suggestedPartitions.map((p) => p.name).join(', ')}
       - Conditions should target similar fields as expected key fields
       - Same logical grouping, even if exact conditions differ`,
    ];

    return evaluators.criteria(criteria).evaluate({
      input: {
        stream_name: (inp as Record<string, unknown> | undefined)?.stream_name,
        existing_partitions: (inp as Record<string, unknown> | undefined)?.existing_partitions,
        user_prompt: (inp as Record<string, unknown> | undefined)?.user_prompt,
      },
      output: {
        suggested_partitions: suggestedPartitions.map((p) => ({
          name: p.name,
          condition: p.condition,
        })),
        coverage: metrics.coverage,
        overlap_score: metrics.overlapScore,
        partition_count: metrics.partitionCount,
        per_partition_stats: metrics.perPartitionStats,
        reason,
      },
      expected: {
        expected_partitions: exp.expected_partitions,
        min_partitions: exp.min_partitions,
        max_partitions: exp.max_partitions,
        coverage_threshold: exp.coverage_threshold,
        max_overlap_threshold: exp.max_overlap_threshold,
      },
      metadata: null,
    });
  },
});
