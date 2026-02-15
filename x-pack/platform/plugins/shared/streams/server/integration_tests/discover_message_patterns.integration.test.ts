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

const INDEX_NAME = 'test-discover-message-patterns';
const BODY_TEXT_INDEX_NAME = 'test-discover-body-text-patterns';
const BOTH_FIELDS_INDEX_NAME = 'test-discover-both-fields';
const NO_TEXT_FIELD_INDEX_NAME = 'test-discover-no-text-field';
const SHORT_PATTERNS_INDEX_NAME = 'test-discover-short-patterns';
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

    // Create index with body.text field (OTel convention) instead of message
    await esClient.indices.create({
      index: BODY_TEXT_INDEX_NAME,
      mappings: {
        properties: {
          body: {
            properties: {
              text: { type: 'text' },
            },
          },
          '@timestamp': { type: 'date' },
        },
      },
    });

    const bodyTextOps: Array<
      { index: { _index: string } } | { body: { text: string }; '@timestamp': string }
    > = [];

    for (const template of templates) {
      for (let i = 0; i < DOCS_PER_PATTERN; i++) {
        bodyTextOps.push({ index: { _index: BODY_TEXT_INDEX_NAME } });
        bodyTextOps.push({
          body: { text: instantiateTemplate(template) },
          '@timestamp': docTimestamp.toISOString(),
        });
      }
    }

    const bodyTextBulk = await esClient.bulk({ operations: bodyTextOps, refresh: 'wait_for' });
    expect(bodyTextBulk.errors).toBe(false);

    // Create index with both message and body.text fields
    await esClient.indices.create({
      index: BOTH_FIELDS_INDEX_NAME,
      mappings: {
        properties: {
          message: { type: 'text' },
          body: {
            properties: {
              text: { type: 'text' },
            },
          },
          '@timestamp': { type: 'date' },
        },
      },
    });

    const bothFieldsOps: Array<
      | { index: { _index: string } }
      | { message: string; body: { text: string }; '@timestamp': string }
    > = [];

    for (const template of templates) {
      for (let i = 0; i < DOCS_PER_PATTERN; i++) {
        const text = instantiateTemplate(template);
        bothFieldsOps.push({ index: { _index: BOTH_FIELDS_INDEX_NAME } });
        bothFieldsOps.push({
          message: text,
          body: { text },
          '@timestamp': docTimestamp.toISOString(),
        });
      }
    }

    const bothFieldsBulk = await esClient.bulk({
      operations: bothFieldsOps,
      refresh: 'wait_for',
    });
    expect(bothFieldsBulk.errors).toBe(false);

    // Create index with no text field (only numeric data) for random fallback test
    await esClient.indices.create({
      index: NO_TEXT_FIELD_INDEX_NAME,
      mappings: {
        properties: {
          status_code: { type: 'integer' },
          '@timestamp': { type: 'date' },
        },
      },
    });

    const noTextOps: Array<
      { index: { _index: string } } | { status_code: number; '@timestamp': string }
    > = [];

    for (let i = 0; i < 100; i++) {
      noTextOps.push({ index: { _index: NO_TEXT_FIELD_INDEX_NAME } });
      noTextOps.push({
        status_code: faker.number.int({ min: 200, max: 599 }),
        '@timestamp': docTimestamp.toISOString(),
      });
    }

    const noTextBulk = await esClient.bulk({ operations: noTextOps, refresh: 'wait_for' });
    expect(noTextBulk.errors).toBe(false);

    // Create index with short-pattern messages (< MIN_EXCLUSION_TOKENS meaningful tokens)
    await esClient.indices.create({
      index: SHORT_PATTERNS_INDEX_NAME,
      mappings: {
        properties: {
          message: { type: 'text' },
          '@timestamp': { type: 'date' },
        },
      },
    });

    // Short patterns: only 1-2 meaningful words plus placeholders.
    // After placeholder stripping these have fewer than MIN_EXCLUSION_TOKENS tokens.
    const shortPatternTemplates = [
      'request {ip}',
      'sent {num}',
      'error {id}',
      'timeout {uuid}',
      'retry {num}',
      'denied {ip}',
      'closed {id}',
      'started {uuid}',
      'stopped {num}',
      'failed {ip}',
    ];

    const shortOps: Array<
      { index: { _index: string } } | { message: string; '@timestamp': string }
    > = [];

    for (const template of shortPatternTemplates) {
      for (let i = 0; i < DOCS_PER_PATTERN; i++) {
        shortOps.push({ index: { _index: SHORT_PATTERNS_INDEX_NAME } });
        shortOps.push({
          message: instantiateTemplate(template),
          '@timestamp': docTimestamp.toISOString(),
        });
      }
    }

    const shortBulk = await esClient.bulk({ operations: shortOps, refresh: 'wait_for' });
    expect(shortBulk.errors).toBe(false);
  }, 120_000);

  afterAll(async () => {
    await esClient.indices.delete({
      index: [
        INDEX_NAME,
        BODY_TEXT_INDEX_NAME,
        BOTH_FIELDS_INDEX_NAME,
        NO_TEXT_FIELD_INDEX_NAME,
        SHORT_PATTERNS_INDEX_NAME,
      ],
      ignore_unavailable: true,
    });
    await kbnRoot?.shutdown();
    await manageES?.stop();
  });

  /**
   * Iteratively discovers patterns from the given index, asserting that the
   * resolved categorization field matches expectations and that at least
   * {@link MIN_EXPECTED_PATTERNS} unique patterns are found.
   */
  const assertDiscoversPatternsFor = async ({
    index,
    expectedField,
    expectedDocProperties,
  }: {
    index: string;
    expectedField: string;
    expectedDocProperties: string[];
  }) => {
    const discoveredPatterns = new Set<string>();
    const excludePatterns: string[] = [];

    for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
      const result = await discoverMessagePatterns({
        esClient,
        index,
        start,
        end,
        excludePatterns: excludePatterns.length > 0 ? excludePatterns : undefined,
        sampleSize: 10,
      });

      const { categories, randomSampleDocuments, categorizationField } = result;

      expect(categorizationField).toBe(expectedField);

      if (categories.length === 0) {
        break;
      }
      expect(randomSampleDocuments.length).toBeGreaterThan(0);

      for (const category of categories) {
        expect(typeof category.pattern).toBe('string');
        expect(category.pattern.length).toBeGreaterThan(0);
        expect(category.sampleDocuments.length).toBeGreaterThan(0);

        for (const doc of category.sampleDocuments) {
          for (const prop of expectedDocProperties) {
            expect(doc).toHaveProperty(prop);
          }
        }

        discoveredPatterns.add(category.pattern);

        if (isMeaningfulPattern(category.pattern)) {
          excludePatterns.push(category.pattern);
        }
      }
    }

    expect(discoveredPatterns.size).toBeGreaterThanOrEqual(MIN_EXPECTED_PATTERNS);
  };

  it(
    'progressively discovers patterns across iterative calls with exclusions',
    () =>
      assertDiscoversPatternsFor({
        index: INDEX_NAME,
        expectedField: 'message',
        expectedDocProperties: ['message'],
      }),
    60_000
  );

  it(
    'discovers patterns using body.text field (OTel convention)',
    () =>
      assertDiscoversPatternsFor({
        index: BODY_TEXT_INDEX_NAME,
        expectedField: 'body.text',
        expectedDocProperties: ['body'],
      }),
    60_000
  );

  it(
    'prefers body.text over message when both fields are mapped',
    () =>
      assertDiscoversPatternsFor({
        index: BOTH_FIELDS_INDEX_NAME,
        expectedField: 'body.text',
        expectedDocProperties: ['body', 'message'],
      }),
    60_000
  );

  it('returns random sample documents when no text field is mapped', async () => {
    const result = await discoverMessagePatterns({
      esClient,
      index: NO_TEXT_FIELD_INDEX_NAME,
      start,
      end,
    });

    const { categories, randomSampleDocuments, categorizationField } = result;

    // No suitable text field should be found
    expect(categorizationField).toBeUndefined();

    // No text field is mapped, so categorization should yield no results
    expect(categories).toHaveLength(0);

    // Random sample documents should still be returned as fallback
    expect(randomSampleDocuments.length).toBeGreaterThan(0);

    // Each random sample should have the expected fields
    for (const doc of randomSampleDocuments) {
      expect(doc).toHaveProperty('status_code');
    }
  }, 60_000);

  it('marks short patterns as not meaningful for exclusion', async () => {
    const SAMPLE_SIZE = 10;
    const { categories, randomSampleDocuments } = await discoverMessagePatterns({
      esClient,
      index: SHORT_PATTERNS_INDEX_NAME,
      start,
      end,
      sampleSize: SAMPLE_SIZE,
    });

    expect(categories.length).toBeGreaterThan(0);
    expect(randomSampleDocuments).toHaveLength(SAMPLE_SIZE);

    for (const category of categories) {
      expect(category.isMeaningfulPattern).toBe(false);
    }
  }, 60_000);
});
