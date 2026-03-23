/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { estypes } from '@elastic/elasticsearch';

import {
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

  const { failedSamples, successfulCount } = processSimulationResults(response, samples);

  const successfulOutputs: Array<Record<string, unknown>> = [];
  response.docs.forEach((doc) => {
    if (doc?.doc?._source && !doc.doc._source.error && successfulOutputs.length < maxSuccessOutputs) {
      successfulOutputs.push(stripBoilerplateFields(doc.doc._source as Record<string, unknown>));
    }
  });

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

  if (successfulOutputs.length > 0) {
    lines.push(
      '',
      `Example successful outputs (${successfulOutputs.length} of ${successfulCount}):`
    );
    for (const output of successfulOutputs) {
      lines.push(JSON.stringify(output, null, 2));
    }
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
