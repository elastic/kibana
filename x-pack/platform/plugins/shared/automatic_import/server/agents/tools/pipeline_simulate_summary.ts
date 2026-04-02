/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { estypes } from '@elastic/elasticsearch';

import {
  flattenDoc,
  formatSimulateDoc,
  groupErrors,
  stripBoilerplateFields,
  processSimulationResults,
} from './pipeline_utils';

const DEFAULT_MAX_SUCCESS_OUTPUTS = 2;
const DEFAULT_MAX_ERROR_GROUPS = 5;
const DEFAULT_SAMPLE_TRUNCATE = 200;

export interface LightweightSimulateSummaryOptions {
  esClient: ElasticsearchClient;
  pipeline: estypes.IngestPipeline;
  samples: string[];
  /** First line(s) of the simulate section, e.g. "Quick simulate (all samples):" */
  title?: string;
  maxSuccessOutputs?: number;
  maxErrorGroups?: number;
  sampleTruncate?: number;
}

/**
 * Runs ingest.simulate and returns a short plain-text summary (counts, a few outputs, grouped errors).
 * Does not perform ECS validation — use validate_pipeline for that.
 */
export async function runLightweightIngestSimulateSummary(
  options: LightweightSimulateSummaryOptions
): Promise<string> {
  const {
    esClient,
    pipeline,
    samples,
    title = 'Quick simulate (all samples, not persisted):',
    maxSuccessOutputs = DEFAULT_MAX_SUCCESS_OUTPUTS,
    maxErrorGroups = DEFAULT_MAX_ERROR_GROUPS,
    sampleTruncate = DEFAULT_SAMPLE_TRUNCATE,
  } = options;

  if (!samples.length) {
    return `${title}\nNo samples available — skipped simulation.`;
  }

  const docs = samples.map(formatSimulateDoc);

  let response: estypes.IngestSimulateResponse;
  try {
    response = await esClient.ingest.simulate({
      docs,
      pipeline,
    });
  } catch (simulateError) {
    return `${title}\nSimulation failed: ${(simulateError as Error).message}`;
  }

  const { failedSamples, successfulDocuments, successfulCount } = processSimulationResults(
    response,
    samples
  );

  const totalSamples = samples.length;
  const failedCount = failedSamples.length;
  const successRate = totalSamples > 0 ? (successfulCount / totalSamples) * 100 : 0;

  const lines: string[] = [title];

  if (failedCount === 0) {
    lines.push(`ALL ${totalSamples} samples succeeded (100%).`);
  } else {
    lines.push(
      `${successfulCount}/${totalSamples} succeeded (${successRate.toFixed(
        1
      )}%), ${failedCount} failed.`
    );
  }

  // 1-2 concrete sample outputs for immediate debugging context
  const sampleOutputs = successfulDocuments
    .slice(0, maxSuccessOutputs)
    .map((doc) => stripBoilerplateFields(doc as Record<string, unknown>));

  if (sampleOutputs.length > 0) {
    lines.push('', `Sample outputs (${sampleOutputs.length} of ${successfulCount}):`);
    for (const output of sampleOutputs) {
      lines.push(JSON.stringify(output));
    }
  }

  // Merged unique-fields map: iterate all successful docs, collect every flat key
  // and keep up to 2 distinct non-null example values per key.
  const mergedFields: Record<string, unknown[]> = {};
  for (const doc of successfulDocuments) {
    const flat = flattenDoc(stripBoilerplateFields(doc as Record<string, unknown>));
    for (const [key, value] of Object.entries(flat)) {
      if (value != null && value !== '') {
        const existing = mergedFields[key];
        if (!existing) {
          mergedFields[key] = [value];
        } else if (existing.length < 2 && !existing.some((v) => v === value)) {
          existing.push(value);
        }
      }
    }
  }

  if (Object.keys(mergedFields).length > 0) {
    // Unwrap single-item arrays to scalar for compactness
    const display = Object.fromEntries(
      Object.entries(mergedFields).map(([k, vs]) => [k, vs.length === 1 ? vs[0] : vs])
    );
    lines.push(
      '',
      'All fields seen across samples (with example values):',
      JSON.stringify(display)
    );
  }

  if (failedCount > 0) {
    const errorGroups = groupErrors(failedSamples, maxErrorGroups, sampleTruncate);
    const uniqueErrorCount = new Set(failedSamples.map((f) => f.error)).size;
    lines.push('', `Errors (${failedCount} failures, ${uniqueErrorCount} unique types):`);
    for (const group of errorGroups) {
      lines.push(`  [${group.count}x] ${group.error}`);
      lines.push(`      example: ${group.exampleSample}`);
    }
    if (uniqueErrorCount > maxErrorGroups) {
      lines.push(`  ... and ${uniqueErrorCount - maxErrorGroups} more error types`);
    }
  }

  lines.push(
    '',
    'Note: This is ingest simulation only — ECS/category checks are in validate_pipeline.'
  );

  return lines.join('\n');
}
