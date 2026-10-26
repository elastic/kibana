/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { matchesIndexPattern } from '../../common/resolution';

type SampleDocument = Record<string, string | number | boolean>;

interface SampleTarget {
  name: string;
  createDocuments: (now: number) => SampleDocument[];
}

const DAY_MS = 24 * 60 * 60 * 1000;
const DATA_STREAM_HISTORY_DAYS = 30;

const range = (count: number): number[] => Array.from({ length: count }, (_, index) => index);

/** Spreads `count` timestamps evenly across the last 30 days, newest first. */
const recentTimestamps = (now: number, count: number): string[] =>
  range(count).map((index) =>
    new Date(now - (index * DATA_STREAM_HISTORY_DAYS * DAY_MS) / count).toISOString()
  );

const PRODUCT_CATEGORIES = ['electronics', 'home', 'outdoor', 'apparel'] as const;

const SAMPLE_INDICES: readonly SampleTarget[] = [
  {
    name: 'products',
    createDocuments: () =>
      range(40).map((index) => ({
        name: `Product ${index + 1}`,
        category: PRODUCT_CATEGORIES[index % PRODUCT_CATEGORIES.length],
        price: 10 + ((index * 7) % 190),
        in_stock: index % 5 !== 0,
      })),
  },
  {
    name: 'catalog-2026-spring',
    createDocuments: () =>
      range(15).map((index) => ({
        sku: `SPR-${index + 1}`,
        season: 'spring',
        featured: index < 3,
      })),
  },
  {
    name: 'catalog-2026-fall',
    createDocuments: () =>
      range(15).map((index) => ({ sku: `FAL-${index + 1}`, season: 'fall', featured: index < 3 })),
  },
  {
    name: 'archive-2024',
    createDocuments: () =>
      range(25).map((index) => ({
        order_id: `2024-${index + 1}`,
        total: 20 + index,
        status: 'shipped',
      })),
  },
  {
    name: 'archive-2025',
    createDocuments: () =>
      range(25).map((index) => ({
        order_id: `2025-${index + 1}`,
        total: 25 + index,
        status: 'shipped',
      })),
  },
  {
    name: 'synonyms',
    createDocuments: () =>
      ['tv, television', 'laptop, notebook', 'sofa, couch', 'sneakers, trainers'].map((rule) => ({
        rule,
      })),
  },
  {
    name: 'users',
    createDocuments: () =>
      range(20).map((index) => ({
        username: `user${index + 1}`,
        plan: index % 3 ? 'free' : 'pro',
      })),
  },
];

const SAMPLE_DATA_STREAMS: readonly SampleTarget[] = [
  {
    name: 'logs-checkout-default',
    createDocuments: (now) =>
      recentTimestamps(now, 60).map((timestamp, index) => ({
        '@timestamp': timestamp,
        message: index % 10 === 0 ? 'Payment declined' : 'Order placed',
        'log.level': index % 10 === 0 ? 'warn' : 'info',
      })),
  },
  {
    name: 'logs-search-default',
    createDocuments: (now) =>
      recentTimestamps(now, 60).map((timestamp, index) => ({
        '@timestamp': timestamp,
        message: `Search completed in ${20 + (index % 30)}ms`,
        'log.level': 'info',
      })),
  },
  {
    name: 'metrics-hosts-default',
    createDocuments: (now) =>
      recentTimestamps(now, 60).map((timestamp, index) => ({
        '@timestamp': timestamp,
        'host.name': `host-${(index % 3) + 1}`,
        'system.cpu.pct': (index % 100) / 100,
      })),
  },
  {
    name: 'clicks-web',
    createDocuments: (now) =>
      recentTimestamps(now, 60).map((timestamp, index) => ({
        '@timestamp': timestamp,
        page: `/products/${(index % 40) + 1}`,
        user_id: `user${(index % 20) + 1}`,
      })),
  },
  {
    name: 'clicks-mobile',
    createDocuments: (now) =>
      recentTimestamps(now, 40).map((timestamp, index) => ({
        '@timestamp': timestamp,
        screen: index % 2 ? 'home' : 'product',
        user_id: `user${(index % 20) + 1}`,
      })),
  },
  {
    name: 'events-app',
    createDocuments: (now) =>
      recentTimestamps(now, 40).map((timestamp, index) => ({
        '@timestamp': timestamp,
        'event.action': index % 4 === 0 ? 'signup' : 'login',
      })),
  },
];

interface SampleDataStreamTemplate {
  name: string;
  indexPatterns: string[];
  /** How long the data stream lifecycle keeps data, or indefinitely without one. */
  dataRetention?: string;
}

// Every sample data stream gets a data stream lifecycle, as every data stream has on serverless.
// Without these templates, stateful deployments such as a-la-carte would manage the `logs-*-*` and
// `metrics-*-*` ones with ILM, through Elasticsearch's built-in templates. Retentions vary to show
// the range, and keep at least the 90 days of illustrative history (see sample_sizes.ts).
const SAMPLE_DATA_STREAM_TEMPLATES: readonly SampleDataStreamTemplate[] = [
  {
    name: 'boost-prototype-logs',
    indexPatterns: ['logs-checkout-default', 'logs-search-default'],
    dataRetention: '90d',
  },
  { name: 'boost-prototype-metrics', indexPatterns: ['metrics-hosts-default'] },
  { name: 'boost-prototype-clicks', indexPatterns: ['clicks-*'], dataRetention: '180d' },
  { name: 'boost-prototype-events', indexPatterns: ['events-*'], dataRetention: '365d' },
];

const bulkIndex = async (
  client: ElasticsearchClient,
  { name, createDocuments }: SampleTarget,
  now: number,
  operation: 'index' | 'create'
) => {
  const operations = createDocuments(now).flatMap((document) => [
    { [operation]: { _index: name } },
    document,
  ]);
  const { errors, items } = await client.bulk({ operations });

  // Bulk requests report per-document failures in the response instead of throwing.
  if (errors) {
    const reason = items.flatMap((item) => Object.values(item)).find((result) => result?.error)
      ?.error?.reason;
    throw new Error(`Failed to index sample documents into [${name}]: ${reason}`);
  }
};

/** Creates or updates the sample data streams' templates, above Elasticsearch's built-in ones. */
const putTemplates = async (client: ElasticsearchClient) => {
  for (const { name, indexPatterns, dataRetention } of SAMPLE_DATA_STREAM_TEMPLATES) {
    await client.indices.putIndexTemplate({
      name,
      index_patterns: indexPatterns,
      data_stream: {},
      priority: 200,
      template: {
        mappings: { properties: { '@timestamp': { type: 'date' } } },
        lifecycle: { data_retention: dataRetention },
      },
      _meta: { description: 'Search boost prototype sample data' },
    });
  }
};

/**
 * Gives an existing sample data stream its template's lifecycle, since templates only apply as data
 * streams are created.
 */
const putLifecycle = async (client: ElasticsearchClient, name: string) => {
  const template = SAMPLE_DATA_STREAM_TEMPLATES.find(({ indexPatterns }) =>
    indexPatterns.some((pattern) => matchesIndexPattern(pattern, name))
  );
  await client.indices.putDataLifecycle({ name, data_retention: template?.dataRetention });
};

const dataStreamExists = async (client: ElasticsearchClient, name: string): Promise<boolean> => {
  const { data_streams: dataStreams } = await client.indices.getDataStream(
    { name },
    { ignore: [404] }
  );
  return (dataStreams ?? []).length > 0;
};

/**
 * Creates any missing sample indices and data streams (with documents), leaving existing ones'
 * documents untouched, and gives every sample data stream its lifecycle. Returns the names that
 * were created.
 */
export const ensureSampleData = async (client: ElasticsearchClient): Promise<string[]> => {
  const now = Date.now();
  const created: string[] = [];

  await putTemplates(client);

  for (const index of SAMPLE_INDICES) {
    if (!(await client.indices.exists({ index: index.name }))) {
      await client.indices.create({ index: index.name });
      await bulkIndex(client, index, now, 'index');
      created.push(index.name);
    }
  }

  for (const dataStream of SAMPLE_DATA_STREAMS) {
    if (await dataStreamExists(client, dataStream.name)) {
      await putLifecycle(client, dataStream.name);
    } else {
      await client.indices.createDataStream({ name: dataStream.name });
      await bulkIndex(client, dataStream, now, 'create');
      created.push(dataStream.name);
    }
  }

  return created;
};
