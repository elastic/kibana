/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { faker } from '@faker-js/faker';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { InternalCoreStart } from '@kbn/core-lifecycle-server-internal';
import type { createRootWithCorePlugins } from '@kbn/core-test-helpers-kbn-server';
import { createTestServers, type TestElasticsearchUtils } from '@kbn/core-test-helpers-kbn-server';
import {
  discoverMessagePatterns,
  isMeaningfulPattern,
} from '../routes/utils/discover_message_patterns';
import type { MessageCategory } from '../routes/utils/discover_message_patterns';

const INDEX_NAME = 'test-discover-message-patterns';
const PATTERN_COUNT = 100;
/**
 * Each pattern needs enough documents so the random_sampler (probability 0.1)
 * still yields a meaningful sample. With 100 docs per pattern the expected
 * sampled count is ~10, extrapolated back to ~100 — well above the
 * categorize_text MIN_DOC_COUNT of 10.
 */
const DOCS_PER_PATTERN = 100;
const MAX_ITERATIONS = 10;

/**
 * Soft lower-bound on unique patterns discovered across all iterations.
 * With random sampling some patterns may still be merged or missed, so we
 * do not require all 100.
 */
const MIN_EXPECTED_PATTERNS = 90;

/** Generate a random ISO-8601 timestamp within a fixed day. */
const randomTimestamp = (): string =>
  faker.date.between({ from: '2025-01-15T00:00:00Z', to: '2025-01-15T23:59:59Z' }).toISOString();

/** Maps `{placeholder}` tokens to their random-value generators. */
const PLACEHOLDER_GENERATORS: Record<string, () => string> = {
  ip: () => faker.internet.ipv4(),
  timestamp: () => randomTimestamp(),
  httpmethod: () => faker.internet.httpMethod(),
  url: () => faker.internet.url(),
  email: () => faker.internet.email(),
  uuid: () => faker.string.uuid(),
  id: () => faker.string.hexadecimal({ length: faker.number.int({ min: 8, max: 16 }), prefix: '' }),
  num: () => String(faker.number.int({ min: 1000, max: 99999 })),
};

const PLACEHOLDER_REGEX = /\{(\w+)\}/g;

/** Replace all `{placeholder}` tokens with random concrete values in a single pass. */
const instantiateTemplate = (template: string): string =>
  template.replace(PLACEHOLDER_REGEX, (_, name: string) => {
    const generator = PLACEHOLDER_GENERATORS[name];
    if (!generator) {
      throw new Error(`Unknown placeholder: {${name}}`);
    }
    return generator();
  });

/**
 * Suffix builders split into two groups so that shared placeholder tokens
 * don't push inter-pattern similarity above the categorize_text
 * similarity_threshold (70 %):
 *
 *   Group A (prefixes 0-4): IP, TIMESTAMP, URL, NUM
 *   Group B (prefixes 5-9): EMAIL, UUID, ID, HTTPMETHOD, NUM
 *
 * Together the two groups cover all 8 PLACEHOLDER_REPLACEMENTS types
 * (URL, UUID, ID, IP, EMAIL, TIMESTAMP, HTTPMETHOD, NUM).
 */
const SUFFIX_BUILDERS: Array<(middle: string) => string> = [
  (middle) => `from {ip} {timestamp} ${middle} {url} code {num}`,
  (middle) => `{email} {uuid} ${middle} {httpmethod} {id} code {num}`,
];

const PREFIXES_PER_GROUP = 5;

/**
 * Builds 100 distinct log-message templates by combining 10 unique prefixes
 * (7 tokens each) with 10 unique middle phrases (8 tokens each).
 *
 * Every prefix-middle combination shares fewer than 70 % of its tokens with
 * any other combination, keeping patterns below the categorize_text
 * similarity_threshold (70) so they are not merged.
 */
const generatePatternTemplates = (): string[] => {
  const prefixes = [
    'Server initialization completed for primary application cluster',
    'Database migration finished across all regional data shards',
    'Authentication challenge verified against centralized security policy',
    'Cache eviction triggered because allocated memory pressure threshold',
    'Load balancer redistributed incoming traffic across backend pool',
    'Message queue consumer flushed accumulated backlog buffer items',
    'Scheduler dispatched pending recurring batch job to worker',
    'File indexer completed scanning directory tree for modifications',
    'Network diagnostic probe detected unexpected latency gateway spike',
    'Session lifecycle cleanup removed stale expired active entries',
  ];

  const middles = [
    'handling encrypted payload during outbound secure transmission phase',
    'processing accumulated batched records into distributed warehouse storage',
    'evaluating granular access control permissions against defined rules',
    'compressing archived stored data segments before offsite backup',
    'routing prioritized upstream network packets through optimized tunnel',
    'transforming structured incoming telemetry events for analytics pipeline',
    'validating complex nested schema constraints against registered definition',
    'aggregating sampled performance metric observations for trend analysis',
    'replicating committed transaction journal entries across standby nodes',
    'synchronizing updated service catalog configuration with deployment registry',
  ];

  return prefixes.flatMap((prefix, i) => {
    const buildSuffix = SUFFIX_BUILDERS[Math.floor(i / PREFIXES_PER_GROUP)];
    return middles.map((middle) => `${prefix} ${buildSuffix(middle)}`);
  });
};

describe('discoverMessagePatterns integration', () => {
  let manageES: TestElasticsearchUtils;
  let kbnRoot: ReturnType<typeof createRootWithCorePlugins>;
  let esClient: ElasticsearchClient;
  let coreStart: InternalCoreStart;

  const docTimestamp = new Date('2025-01-15T12:00:00.000Z');
  const start = new Date('2025-01-15T00:00:00.000Z').getTime();
  const end = new Date('2025-01-16T00:00:00.000Z').getTime();

  beforeAll(async () => {
    const { startES, startKibana } = createTestServers({ adjustTimeout: jest.setTimeout });
    const testServers = await Promise.all([startES(), startKibana()]);
    manageES = testServers[0];
    ({ root: kbnRoot, coreStart } = testServers[1]);
    esClient = coreStart.elasticsearch.client.asInternalUser;

    // categorize_text aggregation requires a trial/platinum license
    await esClient.license.postStartTrial({ acknowledge: true });

    // Create a plain index with message + @timestamp fields
    await esClient.indices.create({
      index: INDEX_NAME,
      mappings: {
        properties: {
          message: { type: 'text' },
          '@timestamp': { type: 'date' },
        },
      },
    });

    // Build 10 000 documents: 100 patterns x 100 docs each
    const templates = generatePatternTemplates();
    expect(templates).toHaveLength(PATTERN_COUNT);

    const operations: Array<
      { index: { _index: string } } | { message: string; '@timestamp': string }
    > = [];

    for (const template of templates) {
      for (let i = 0; i < DOCS_PER_PATTERN; i++) {
        operations.push({ index: { _index: INDEX_NAME } });
        operations.push({
          message: instantiateTemplate(template),
          '@timestamp': docTimestamp.toISOString(),
        });
      }
    }

    const bulkResponse = await esClient.bulk({ operations, refresh: 'wait_for' });
    expect(bulkResponse.errors).toBe(false);
  }, 120_000);

  afterAll(async () => {
    await esClient.indices.delete({ index: INDEX_NAME, ignore_unavailable: true });
    await kbnRoot?.shutdown();
    await manageES?.stop();
  });

  it('progressively discovers patterns across iterative calls with exclusions', async () => {
    const discoveredPatterns = new Set<string>();
    const excludePatterns: string[] = [];

    for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
      const categories: MessageCategory[] = await discoverMessagePatterns({
        esClient,
        index: INDEX_NAME,
        start,
        end,
        excludePatterns: excludePatterns.length > 0 ? excludePatterns : undefined,
      });

      if (categories.length === 0) {
        break;
      }

      for (const category of categories) {
        // Verify shape: pattern is a non-empty string
        expect(typeof category.pattern).toBe('string');
        expect(category.pattern.length).toBeGreaterThan(0);

        // Verify shape: sampleDocuments is a non-empty array
        expect(Array.isArray(category.sampleDocuments)).toBe(true);
        expect(category.sampleDocuments.length).toBeGreaterThan(0);

        // Every sample document must carry a message field
        for (const doc of category.sampleDocuments) {
          expect(doc).toHaveProperty('message');
        }

        discoveredPatterns.add(category.pattern);

        // Feed excludable patterns back for the next iteration
        if (isMeaningfulPattern(category.pattern)) {
          excludePatterns.push(category.pattern);
        }
      }
    }

    // Soft assertion: random sampling and similarity merging may prevent
    // every pattern from being discovered. We expect at least
    // MIN_EXPECTED_PATTERNS unique patterns across up to MAX_ITERATIONS
    // iterations.
    expect(discoveredPatterns.size).toBeGreaterThanOrEqual(MIN_EXPECTED_PATTERNS);
  }, 60_000);
});
