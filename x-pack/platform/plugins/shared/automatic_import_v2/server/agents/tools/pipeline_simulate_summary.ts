/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { estypes } from '@elastic/elasticsearch';

const DEFAULT_MAX_SUCCESS_OUTPUTS = 2;
const DEFAULT_MAX_ERROR_GROUPS = 5;
const DEFAULT_SAMPLE_TRUNCATE = 200;

const STRIPPED_OUTPUT_FIELDS = new Set(['event.original', 'ecs.version']);

interface DocTemplate {
  _index: string;
  _id: string;
  _source: {
    message: string;
    [key: string]: unknown;
  };
}

const formatDoc = (sample: string): DocTemplate => ({
  _index: 'index',
  _id: 'id',
  _source: { message: sample },
});

interface FailedSample {
  sampleIndex: number;
  sample: string;
  error: string;
}

interface ErrorGroup {
  error: string;
  count: number;
  exampleSample: string;
}

const groupErrors = (
  failedSamples: FailedSample[],
  maxGroups: number,
  sampleTruncate: number
): ErrorGroup[] => {
  const groups = new Map<string, { count: number; example: string }>();

  for (const { error, sample } of failedSamples) {
    const existing = groups.get(error);
    if (existing) {
      existing.count += 1;
    } else {
      groups.set(error, { count: 1, example: sample.substring(0, sampleTruncate) });
    }
  }

  return [...groups.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, maxGroups)
    .map(([error, { count, example }]) => ({
      error,
      count,
      exampleSample: example,
    }));
};

const stripBoilerplateFields = (source: Record<string, unknown>): Record<string, unknown> => {
  const result = { ...source };
  for (const field of STRIPPED_OUTPUT_FIELDS) {
    const dotIdx = field.indexOf('.');
    if (dotIdx !== -1) {
      const root = field.substring(0, dotIdx);
      const child = field.substring(dotIdx + 1);
      const rootObj = result[root];
      if (rootObj != null && typeof rootObj === 'object' && !Array.isArray(rootObj)) {
        const copy = { ...(rootObj as Record<string, unknown>) };
        delete copy[child];
        if (Object.keys(copy).length === 0) {
          delete result[root];
        } else {
          result[root] = copy;
        }
      }
    } else {
      delete result[field];
    }
  }
  return result;
};

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

  const docs = samples.map((sample) => formatDoc(sample));

  let response: estypes.IngestSimulateResponse;
  try {
    response = await esClient.ingest.simulate({
      docs,
      pipeline,
    });
  } catch (simulateError) {
    return `${title}\nSimulation failed: ${(simulateError as Error).message}`;
  }

  const failedSamples: FailedSample[] = [];
  const successfulOutputs: Array<Record<string, unknown>> = [];
  let successfulCount = 0;

  response.docs.forEach((doc, index) => {
    if (!doc) {
      failedSamples.push({
        sampleIndex: index,
        sample: samples[index],
        error: 'Document was dropped by the pipeline',
      });
    } else if (doc.doc?._source?.error) {
      const errorDetail =
        typeof doc.doc._source.error === 'string'
          ? doc.doc._source.error
          : JSON.stringify(doc.doc._source.error);
      failedSamples.push({
        sampleIndex: index,
        sample: samples[index],
        error: errorDetail,
      });
    } else if (doc.doc?._source) {
      successfulCount++;
      if (successfulOutputs.length < maxSuccessOutputs) {
        successfulOutputs.push(stripBoilerplateFields(doc.doc._source as Record<string, unknown>));
      }
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
      lines.push(JSON.stringify(output));
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
