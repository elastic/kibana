/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import { VERSION_META_KEY, applyMappings, createIndex, stampVersion } from './index_backend';

const INDEX = '.test-index';

/**
 * An index is often managed by something other than this library. Asset Criticality
 * keeps its own `_meta.version`, and Elasticsearch replaces `_meta` wholesale rather
 * than merging it - so a careless write destroys whatever else was there.
 */
const FOREIGN_META = { version: 4, managedBy: 'asset-criticality' };

type Meta = Record<string, unknown>;
interface PutMappingArgs {
  index: string;
  _meta?: Meta;
  properties?: Record<string, unknown>;
}
interface CreateArgs {
  index: string;
  mappings: { _meta?: Meta };
}

const createEsClient = (meta: Meta = {}) => {
  // Args are typed so the assertions below can read them without casting.
  const putMapping = jest.fn(async (_args: PutMappingArgs) => ({ acknowledged: true }));
  const create = jest.fn(async (_args: CreateArgs) => ({ acknowledged: true }));

  const esClient = {
    indices: {
      getMapping: jest.fn(async () => ({ [INDEX]: { mappings: { _meta: meta } } })),
      putMapping,
      create,
    },
  } as unknown as ElasticsearchClient;

  return { esClient, putMapping, create };
};

const metaSentTo = (mock: jest.MockedFunction<(args: PutMappingArgs) => unknown>): Meta =>
  mock.mock.calls[0][0]._meta ?? {};

const mappings = { properties: { a: { type: 'keyword' } } } as MappingTypeMapping;

describe('applyMappings', () => {
  it('preserves metadata written by something else', async () => {
    const { esClient, putMapping } = createEsClient(FOREIGN_META);

    await applyMappings(esClient, INDEX, mappings, 2);

    // Losing `version` here makes the owning code believe its migration never ran, so it
    // re-runs on every startup for the life of the deployment.
    expect(metaSentTo(putMapping)).toEqual({
      version: 4,
      managedBy: 'asset-criticality',
      [VERSION_META_KEY]: 2,
    });
  });

  it('stamps its own version', async () => {
    const { esClient, putMapping } = createEsClient(FOREIGN_META);

    await applyMappings(esClient, INDEX, mappings, 7);

    expect(metaSentTo(putMapping)[VERSION_META_KEY]).toBe(7);
  });

  it('overwrites its own earlier stamp rather than accumulating', async () => {
    const { esClient, putMapping } = createEsClient({ [VERSION_META_KEY]: 1 });

    await applyMappings(esClient, INDEX, mappings, 2);

    expect(metaSentTo(putMapping)).toEqual({ [VERSION_META_KEY]: 2 });
  });

  it('lets a declared _meta win over a stale value on the index', async () => {
    const { esClient, putMapping } = createEsClient({ owner: 'old', version: 4 });

    await applyMappings(
      esClient,
      INDEX,
      { ...mappings, _meta: { owner: 'new' } } as MappingTypeMapping,
      2
    );

    expect(metaSentTo(putMapping)).toEqual({
      owner: 'new',
      version: 4,
      [VERSION_META_KEY]: 2,
    });
  });

  it('works on an index with no _meta at all', async () => {
    const { esClient, putMapping } = createEsClient();

    await applyMappings(esClient, INDEX, mappings, 2);

    expect(metaSentTo(putMapping)).toEqual({ [VERSION_META_KEY]: 2 });
  });

  it('still sends the mappings themselves', async () => {
    const { esClient, putMapping } = createEsClient(FOREIGN_META);

    await applyMappings(esClient, INDEX, mappings, 2);

    expect(putMapping.mock.calls[0][0]).toEqual(
      expect.objectContaining({ index: INDEX, properties: mappings.properties })
    );
  });
});

describe('stampVersion', () => {
  it('preserves metadata written by something else', async () => {
    const { esClient, putMapping } = createEsClient(FOREIGN_META);

    await stampVersion(esClient, INDEX, 3);

    expect(metaSentTo(putMapping)).toEqual({
      version: 4,
      managedBy: 'asset-criticality',
      [VERSION_META_KEY]: 3,
    });
  });

  it('does not touch the mappings', async () => {
    const { esClient, putMapping } = createEsClient(FOREIGN_META);

    await stampVersion(esClient, INDEX, 3);

    expect(putMapping.mock.calls[0][0]).not.toHaveProperty('properties');
  });
});

describe('createIndex', () => {
  it('stamps the version on a new index', async () => {
    const { esClient, create } = createEsClient();

    await createIndex(esClient, INDEX, mappings, 4);

    expect(create.mock.calls[0][0].mappings._meta).toEqual({ [VERSION_META_KEY]: 4 });
  });

  it('keeps a declared _meta', async () => {
    const { esClient, create } = createEsClient();

    await createIndex(
      esClient,
      INDEX,
      { ...mappings, _meta: { owner: 'me' } } as MappingTypeMapping,
      4
    );

    // Nothing to merge with on a create - there is no index yet.
    expect(create.mock.calls[0][0].mappings._meta).toEqual({
      owner: 'me',
      [VERSION_META_KEY]: 4,
    });
  });
});
