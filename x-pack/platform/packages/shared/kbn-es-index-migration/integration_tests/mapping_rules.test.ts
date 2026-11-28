/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTestServers, type TestElasticsearchUtils } from '@kbn/core-test-helpers-kbn-server';
import type { Client } from '@elastic/elasticsearch';
import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { verifyAdditive } from '../src/verify';
import { classifyEsError } from '../src/es_errors';
import { VERSION_META_KEY, applyMappings, stampVersion } from '../src/backends/index_backend';

/**
 * Asks a real Elasticsearch whether the verifier's rules match its behaviour.
 *
 * The allowlist was built by observing a live cluster rather than by reasoning, because
 * reasoning got three of them wrong: `search_analyzer` is mutable where it looked fixed,
 * and `norms` and `null_value` are immutable where they looked harmless. Those two would
 * have let a breaking change through the gate.
 *
 * Elasticsearch's mapping rules also shift between versions, so this doubles as a
 * regression guard: if a rule relaxes, this fails and we can stop refusing it.
 */

jest.setTimeout(15 * 60 * 1000);

interface Case {
  name: string;
  create: MappingTypeMapping;
  update: MappingTypeMapping;
  /** What the verifier says. The assertion is that Elasticsearch agrees. */
  expectedAdditive: boolean;
}

const field = (type: string, extra: Record<string, unknown> = {}) => ({ type, ...extra });
const mapping = (properties: Record<string, unknown>): MappingTypeMapping =>
  ({ properties } as MappingTypeMapping);

const change = (
  name: string,
  type: string,
  parameter: string,
  from: unknown,
  to: unknown,
  expectedAdditive: boolean
): Case => ({
  name,
  create: mapping({ a: field(type, { [parameter]: from }) }),
  update: mapping({ a: field(type, { [parameter]: to }) }),
  expectedAdditive,
});

const CASES: Case[] = [
  // Additions - always safe.
  {
    name: 'new field added',
    create: mapping({ a: field('keyword') }),
    update: mapping({ a: field('keyword'), b: field('keyword') }),
    expectedAdditive: true,
  },
  {
    name: 'sub-field added',
    create: mapping({ a: field('keyword') }),
    update: mapping({ a: field('keyword', { fields: { t: field('text') } }) }),
    expectedAdditive: true,
  },
  {
    name: 'property added to an existing object',
    create: mapping({ o: { type: 'object', properties: { a: field('keyword') } } }),
    update: mapping({
      o: { type: 'object', properties: { a: field('keyword'), b: field('keyword') } },
    }),
    expectedAdditive: true,
  },

  // The allowlist - every entry must still be mutable.
  change('keyword.ignore_above', 'keyword', 'ignore_above', 256, 512, true),
  change('keyword.eager_global_ordinals', 'keyword', 'eager_global_ordinals', false, true, true),
  change('keyword.split_queries', 'keyword', 'split_queries_on_whitespace', false, true, true),
  change('text.search_analyzer', 'text', 'search_analyzer', 'standard', 'english', true),
  change('text.fielddata', 'text', 'fielddata', false, true, true),
  change('date.ignore_malformed', 'date', 'ignore_malformed', false, true, true),
  change('long.coerce', 'long', 'coerce', true, false, true),
  change('long.ignore_malformed', 'long', 'ignore_malformed', false, true, true),
  change('ip.ignore_malformed', 'ip', 'ignore_malformed', false, true, true),
  change('flattened.depth_limit', 'flattened', 'depth_limit', 20, 10, true),

  // Refusals - each one a change the gate must keep blocking.
  {
    name: 'type keyword -> text',
    create: mapping({ a: field('keyword') }),
    update: mapping({ a: field('text') }),
    expectedAdditive: false,
  },
  {
    name: 'type date -> long',
    create: mapping({ a: field('date') }),
    update: mapping({ a: field('long') }),
    expectedAdditive: false,
  },
  change('keyword.null_value', 'keyword', 'null_value', 'x', 'y', false),
  change('keyword.index', 'keyword', 'index', true, false, false),
  change('keyword.doc_values', 'keyword', 'doc_values', true, false, false),
  change('keyword.store', 'keyword', 'store', false, true, false),
  change('keyword.norms', 'keyword', 'norms', true, false, false),
  change('text.analyzer', 'text', 'analyzer', 'standard', 'english', false),
  change('text.index_options', 'text', 'index_options', 'positions', 'offsets', false),
  change('text.term_vector', 'text', 'term_vector', 'no', 'yes', false),
  change('date.format', 'date', 'format', 'strict_date_time', 'epoch_millis', false),
  change('long.null_value', 'long', 'null_value', 0, 1, false),
  change('scaled_float.scaling_factor', 'scaled_float', 'scaling_factor', 100, 1000, false),
  {
    name: 'object enabled true -> false',
    create: mapping({ a: { type: 'object', enabled: true } }),
    update: mapping({ a: { type: 'object', enabled: false } }),
    expectedAdditive: false,
  },
  {
    name: 'sub-field retyped',
    create: mapping({ a: field('keyword', { fields: { t: field('text') } }) }),
    update: mapping({ a: field('keyword', { fields: { t: field('keyword') } }) }),
    expectedAdditive: false,
  },
];

describe('mapping rules against a real Elasticsearch', () => {
  let esServer: TestElasticsearchUtils;
  let esClient: Client;

  beforeAll(async () => {
    esServer = await createTestServers({ adjustTimeout: jest.setTimeout }).startES();
    esClient = esServer.es.getClient();
  });

  afterAll(async () => {
    await esServer?.stop();
  });

  it.each(CASES.map((testCase) => [testCase.name, testCase] as const))(
    'Elasticsearch agrees with the verifier: %s',
    async (_name, testCase) => {
      const index = `verifier-${_name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`.slice(0, 60);

      await esClient.indices.delete({ index }, { ignore: [404] });
      await esClient.indices.create({ index, mappings: testCase.create });

      let accepted = true;
      let errorKind: string | undefined;
      try {
        await esClient.indices.putMapping({ index, ...testCase.update });
      } catch (error) {
        accepted = false;
        errorKind = classifyEsError(error);
      }

      const verdict = verifyAdditive(testCase.create, testCase.update);

      expect(verdict.ok).toBe(testCase.expectedAdditive);
      // The assertion that matters: our answer and Elasticsearch's are the same.
      expect(accepted).toBe(verdict.ok);
      if (!accepted) {
        expect(errorKind).toBe('mapping_conflict');
      }

      await esClient.indices.delete({ index }, { ignore: [404] });
    }
  );

  it('reports a field-limit breach as its own kind, not as a conflict', async () => {
    const index = 'verifier-total-fields';
    await esClient.indices.delete({ index }, { ignore: [404] });
    await esClient.indices.create({
      index,
      settings: { 'index.mapping.total_fields.limit': 3 },
      mappings: mapping({ a: field('keyword'), b: field('keyword') }),
    });

    let errorKind: string | undefined;
    try {
      await esClient.indices.putMapping({
        index,
        ...mapping({ c: field('keyword'), d: field('keyword'), e: field('keyword') }),
      });
    } catch (error) {
      errorKind = classifyEsError(error);
    }

    // Purely additive by any diff, yet Elasticsearch still refuses - and with the same
    // exception type a real conflict uses, so only the reason string separates them.
    expect(errorKind).toBe('total_fields_breach');

    await esClient.indices.delete({ index }, { ignore: [404] });
  });

  it('keeps a removed field, so a declared removal is drift rather than a change', async () => {
    const index = 'verifier-removal';
    await esClient.indices.delete({ index }, { ignore: [404] });
    await esClient.indices.create({
      index,
      mappings: mapping({ keep: field('keyword'), drop: field('keyword') }),
    });

    await esClient.indices.putMapping({ index, ...mapping({ keep: field('keyword') }) });
    const after = await esClient.indices.getMapping({ index });

    expect(Object.keys(after[index].mappings.properties ?? {}).sort()).toEqual(['drop', 'keep']);

    await esClient.indices.delete({ index }, { ignore: [404] });
  });

  describe('_meta', () => {
    const index = 'verifier-meta';
    const metaOf = async () => (await esClient.indices.getMapping({ index }))[index].mappings._meta;

    beforeEach(async () => {
      await esClient.indices.delete({ index }, { ignore: [404] });
      await esClient.indices.create({
        index,
        mappings: {
          ...mapping({ a: field('keyword') }),
          // Stands in for metadata another owner keeps on the index, the way Asset
          // Criticality keeps its own `version`.
          _meta: { version: 4, managedBy: 'someone-else' },
        },
      });
    });

    afterEach(async () => {
      await esClient.indices.delete({ index }, { ignore: [404] });
    });

    it('is REPLACED by Elasticsearch, not merged - the reason the backend reads it first', async () => {
      await esClient.indices.putMapping({ index, _meta: { mine: 1 } });

      // The whole merge in `index_backend` exists because of this. If a future
      // Elasticsearch merged instead, this test fails and the merge becomes redundant
      // rather than load-bearing.
      expect(await metaOf()).toEqual({ mine: 1 });
    });

    it('survives a putMapping that does not mention it', async () => {
      await esClient.indices.putMapping({ index, ...mapping({ b: field('keyword') }) });

      expect(await metaOf()).toEqual({ version: 4, managedBy: 'someone-else' });
    });

    it('keeps foreign keys when the backend applies mappings', async () => {
      await applyMappings(
        esClient as unknown as ElasticsearchClient,
        index,
        mapping({ b: field('keyword') }),
        2
      );

      // Losing `version` here would make the owning code believe its own migration never
      // ran, so it would re-run on every startup for the life of the deployment.
      expect(await metaOf()).toEqual({
        version: 4,
        managedBy: 'someone-else',
        [VERSION_META_KEY]: 2,
      });
    });

    it('keeps foreign keys when the backend only stamps a version', async () => {
      await stampVersion(esClient as unknown as ElasticsearchClient, index, 3);

      expect(await metaOf()).toEqual({
        version: 4,
        managedBy: 'someone-else',
        [VERSION_META_KEY]: 3,
      });
    });

    it('advances its own stamp across repeated runs without accumulating', async () => {
      const client = esClient as unknown as ElasticsearchClient;

      await applyMappings(client, index, mapping({ b: field('keyword') }), 2);
      await applyMappings(client, index, mapping({ c: field('keyword') }), 3);

      expect(await metaOf()).toEqual({
        version: 4,
        managedBy: 'someone-else',
        [VERSION_META_KEY]: 3,
      });
    });
  });
});
