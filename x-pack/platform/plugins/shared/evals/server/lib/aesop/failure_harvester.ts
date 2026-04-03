/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';

const FAILURES_INDEX = '.kibana-eval-failures';

export interface HarvestConfig {
  minCount: number;
  timeRange: string;
  failureThreshold: number;
}

export interface RegressionCase {
  inputQuery: string;
  inputHash: string;
  failureCount: number;
  evaluatorsFailed: string[];
  lastSeen: string;
}

const DEFAULT_HARVEST_CONFIG: HarvestConfig = {
  minCount: 3,
  timeRange: '7d',
  failureThreshold: 0.3,
};

const hashInput = (input: string): string =>
  createHash('sha256').update(input).digest('hex').slice(0, 16);

/**
 * Ensures the failures index exists with proper mappings.
 */
export const ensureFailuresIndex = async (esClient: ElasticsearchClient): Promise<void> => {
  const exists = await esClient.indices.exists({ index: FAILURES_INDEX }).catch(() => false);
  if (exists) return;

  try {
    await esClient.indices.create({
      index: FAILURES_INDEX,
      settings: { number_of_shards: 1, number_of_replicas: 0, refresh_interval: '5s' },
      mappings: {
        properties: {
          skill_id: { type: 'keyword' },
          evaluator_name: { type: 'keyword' },
          input_hash: { type: 'keyword' },
          input_query: { type: 'text' },
          output_snippet: { type: 'text', index: false },
          score: { type: 'float' },
          label: { type: 'keyword' },
          explanation: { type: 'text', index: false },
          run_id: { type: 'keyword' },
          '@timestamp': { type: 'date' },
        },
      },
    });
  } catch (error) {
    // Ignore resource_already_exists_exception from concurrent creation races
    if (
      error instanceof Error &&
      'meta' in error &&
      (error as { meta?: { statusCode?: number } }).meta?.statusCode === 400 &&
      error.message.includes('resource_already_exists_exception')
    ) {
      return;
    }
    throw error;
  }
};

/**
 * Indexes evaluation failures from a completed eval run.
 * Filters results where score < failureThreshold and bulk-indexes them.
 */
export const indexFailures = async (
  esClient: ElasticsearchClient,
  runId: string,
  skillId: string,
  results: Array<{
    itemIndex: number;
    evaluator: string;
    score: number | null;
    label?: string;
    explanation?: string;
  }>,
  items: Array<{
    input: Record<string, unknown>;
    output: unknown;
  }>,
  logger: Logger,
  config: Partial<HarvestConfig> = {}
): Promise<number> => {
  const { failureThreshold } = { ...DEFAULT_HARVEST_CONFIG, ...config };
  const now = new Date().toISOString();

  const failures = results.filter((r) => r.score !== null && r.score < failureThreshold);

  if (failures.length === 0) return 0;

  await ensureFailuresIndex(esClient);

  const operations = failures.flatMap((failure) => {
    const item = items[failure.itemIndex];
    if (!item) return [];

    const inputQuery = String(
      (item.input as Record<string, unknown>)?.query ?? JSON.stringify(item.input)
    );
    const inputHash = hashInput(inputQuery);
    const outputStr =
      typeof item.output === 'string' ? item.output : JSON.stringify(item.output ?? '');
    const docId = `${skillId}:${inputHash}:${failure.evaluator}:${runId}`;

    return [
      { create: { _index: FAILURES_INDEX, _id: docId } },
      {
        skill_id: skillId,
        evaluator_name: failure.evaluator,
        input_hash: inputHash,
        input_query: inputQuery,
        output_snippet: outputStr.slice(0, 500),
        score: failure.score,
        label: failure.label ?? 'fail',
        explanation: failure.explanation ?? '',
        run_id: runId,
        '@timestamp': now,
      },
    ];
  });

  if (operations.length === 0) return 0;

  const resp = await esClient.bulk({ operations, refresh: false });
  const indexed = (resp.items ?? []).filter(
    (i) => i.create?.status === 201 || i.create?.status === 409
  ).length;

  logger.debug(`[AESOP] Indexed ${indexed} failure records for skill "${skillId}"`);
  return indexed;
};

/**
 * Harvests regression cases from the failures index.
 * Groups failures by input_hash and returns those that exceed the minimum count threshold.
 */
export const harvestRegressionCases = async (
  esClient: ElasticsearchClient,
  skillId: string,
  config: Partial<HarvestConfig> = {}
): Promise<RegressionCase[]> => {
  const { minCount, timeRange } = { ...DEFAULT_HARVEST_CONFIG, ...config };

  const exists = await esClient.indices.exists({ index: FAILURES_INDEX }).catch(() => false);
  if (!exists) return [];

  const result = await esClient.search({
    index: FAILURES_INDEX,
    size: 0,
    query: {
      bool: {
        filter: [
          { term: { skill_id: skillId } },
          { range: { '@timestamp': { gte: `now-${timeRange}` } } },
        ],
      },
    },
    aggs: {
      by_input: {
        terms: { field: 'input_hash', size: 100, min_doc_count: minCount },
        aggs: {
          sample: { top_hits: { size: 1, _source: ['input_query', '@timestamp'] } },
          evaluators: { terms: { field: 'evaluator_name', size: 20 } },
        },
      },
    },
  });

  const buckets =
    (
      result.aggregations?.by_input as {
        buckets?: Array<{
          key: string;
          doc_count: number;
          sample: {
            hits: { hits: Array<{ _source: { input_query: string; '@timestamp': string } }> };
          };
          evaluators: { buckets: Array<{ key: string }> };
        }>;
      }
    )?.buckets ?? [];

  return buckets.map((bucket) => {
    const sampleHit = bucket.sample.hits.hits[0]?._source;
    return {
      inputQuery: sampleHit?.input_query ?? '',
      inputHash: bucket.key,
      failureCount: bucket.doc_count,
      evaluatorsFailed: bucket.evaluators.buckets.map((eb) => eb.key),
      lastSeen: sampleHit?.['@timestamp'] ?? '',
    };
  });
};

/**
 * Creates regression dataset examples from harvested failure cases.
 * Uses the dataset client to add examples with `source: 'regression'` metadata.
 */
export const createRegressionDatasetExamples = async (
  datasetClient: {
    upsert: (
      name: string,
      description: string,
      examples: Array<{
        input?: Record<string, unknown>;
        output?: Record<string, unknown>;
        metadata?: Record<string, unknown> | null;
      }>
    ) => Promise<{ dataset_id: string; added: number; removed: number; unchanged: number }>;
  },
  skillId: string,
  cases: RegressionCase[]
): Promise<{ datasetId: string; added: number }> => {
  if (cases.length === 0) return { datasetId: '', added: 0 };

  const datasetName = `skill-eval:${skillId}`;
  const examples = cases.map((c) => ({
    input: { query: c.inputQuery },
    output: {
      note: `Regression test case — this input historically fails on evaluators: ${c.evaluatorsFailed.join(
        ', '
      )}`,
    },
    metadata: {
      source: 'regression',
      harvested_at: new Date().toISOString(),
      failure_count: c.failureCount,
      input_hash: c.inputHash,
    },
  }));

  const result = await datasetClient.upsert(
    datasetName,
    `Eval dataset for skill: ${skillId} (includes regression cases)`,
    examples
  );

  return { datasetId: result.dataset_id, added: result.added };
};
