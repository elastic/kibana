/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Verifies that an unchanged alerts-as-data backing index mapping is not re-PUT on
 * every install (see https://github.com/elastic/kibana/issues/271251).
 *
 * The skip is driven by a `_meta.content_hash` stamp the installer writes alongside
 * the mapping, so its correctness depends on how a real Elasticsearch round-trips
 * that stamp: whether `_meta` survives a `put_mapping`, comes back on `get_mapping`
 * for both plain indices and data streams, and is readable through the `filter_path`
 * the installer uses to avoid pulling multi-MB field definitions down on every check.
 * None of that is observable against a mocked client, which is why these run against
 * a real Elasticsearch; only Elasticsearch is booted, no Kibana server.
 */

import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { TestElasticsearchUtils } from '@kbn/core-test-helpers-kbn-server';
import { createTestServers } from '@kbn/core-test-helpers-kbn-server';
import type { ConcreteIndexInfo } from '../alerts_service/lib/create_concrete_write_index';
import { updateIndexMappingsAndSettings } from '../alerts_service/lib/create_concrete_write_index';
import { RESOURCE_CONTENT_HASH_META_FIELD } from '../alerts_service/lib/resource_hash';

const TOTAL_FIELDS_LIMIT = 2500;

const buildMapping = (fieldCount: number): MappingTypeMapping => {
  const properties: Record<string, { type: 'keyword' | 'date' }> = {
    '@timestamp': { type: 'date' },
  };
  for (let i = 0; i < fieldCount; i++) {
    properties[`skip_field_${i}`] = { type: 'keyword' };
  }
  return { dynamic: false, properties };
};

describe('skipping unchanged alerts-as-data backing index mappings', () => {
  let esServer: TestElasticsearchUtils;
  let esClient: ElasticsearchClient;
  let logger: Logger;
  let putMapping: jest.SpyInstance;
  let uniqueId = 0;

  jest.setTimeout(10 * 60 * 1000);

  beforeAll(async () => {
    const { startES } = createTestServers({
      adjustTimeout: (t: number) => jest.setTimeout(t),
      settings: {
        es: {
          license: 'basic',
        },
      },
    });
    esServer = await startES();
    esClient = esServer.es.getClient();
  });

  afterAll(async () => {
    await esServer?.stop();
  });

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
    putMapping = jest.spyOn(esClient.indices, 'putMapping');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const createConcreteIndex = async (mappings: MappingTypeMapping): Promise<ConcreteIndexInfo> => {
    const alias = `.alerts-skiptest-${++uniqueId}`;
    const index = `.internal.${alias.slice(1)}-000001`;
    await esClient.indices.create({
      index,
      aliases: { [alias]: { is_write_index: true, is_hidden: true } },
      settings: {
        'index.number_of_replicas': 0,
        'index.number_of_shards': 1,
        'index.mapping.total_fields.limit': TOTAL_FIELDS_LIMIT,
      },
      mappings,
    });
    return { index, alias, isWriteIndex: true, isHidden: true };
  };

  const install = (concreteIndices: ConcreteIndexInfo[], simulatedMapping: MappingTypeMapping) =>
    updateIndexMappingsAndSettings({
      logger,
      esClient,
      totalFieldsLimit: TOTAL_FIELDS_LIMIT,
      concreteIndices,
      simulatedMapping,
    });

  // Reads the stamp back the way an operator would, without the installer's filter_path,
  // ordered by index name so a data stream's backing indices read oldest first.
  const readContentHashes = async (index: string): Promise<Array<string | undefined>> => {
    const response = await esClient.indices.getMapping({ index });
    return Object.keys(response)
      .sort()
      .map(
        (name) =>
          response[name].mappings._meta?.[RESOURCE_CONTENT_HASH_META_FIELD] as string | undefined
      );
  };

  it('stamps a content hash on install and skips the PUT while the mapping is unchanged', async () => {
    const concreteIndex = await createConcreteIndex({ dynamic: false });
    const simulatedMapping = buildMapping(50);

    await install([concreteIndex], simulatedMapping);

    expect(putMapping).toHaveBeenCalledTimes(1);
    const [contentHash] = await readContentHashes(concreteIndex.index);
    expect(contentHash).toEqual(expect.any(String));

    putMapping.mockClear();
    await install([concreteIndex], simulatedMapping);

    expect(putMapping).not.toHaveBeenCalled();
    expect(await readContentHashes(concreteIndex.index)).toEqual([contentHash]);
  });

  it('PUTs again once the simulated mapping changes', async () => {
    const concreteIndex = await createConcreteIndex({ dynamic: false });
    await install([concreteIndex], buildMapping(50));
    const [firstHash] = await readContentHashes(concreteIndex.index);

    putMapping.mockClear();
    await install([concreteIndex], buildMapping(60));

    expect(putMapping).toHaveBeenCalledTimes(1);
    const [secondHash] = await readContentHashes(concreteIndex.index);
    expect(secondHash).toEqual(expect.any(String));
    expect(secondHash).not.toEqual(firstHash);
  });

  it('PUTs when the installed mapping carries no _meta at all', async () => {
    const simulatedMapping = buildMapping(50);
    // An index installed before the stamp existed. Its mapping is nothing but field
    // definitions, so it is also the shape the installer's `filter_path` strips down to
    // the least: an index that came back empty must still count as unstamped.
    const concreteIndex = await createConcreteIndex({ properties: simulatedMapping.properties });

    // Everything this index has is filtered away, and it must still come back listed:
    // Elasticsearch omits an index whose filtered mapping is empty, and an index that
    // went missing rather than reporting no stamp is how an unstamped index sitting
    // next to stamped ones would wrongly have its update skipped. The `index.uuid` the
    // installer asks for alongside `_meta` is what holds the entry in the response.
    const filtered = await esClient.indices.get({
      index: concreteIndex.index,
      features: ['mappings', 'settings'],
      filter_path: ['*.settings.index.uuid', '*.mappings._meta'],
    });
    expect(Object.keys(filtered)).toEqual([concreteIndex.index]);
    expect(filtered[concreteIndex.index].mappings).toBeUndefined();

    await install([concreteIndex], simulatedMapping);

    expect(putMapping).toHaveBeenCalledTimes(1);
    expect(await readContentHashes(concreteIndex.index)).toEqual([expect.any(String)]);
  });

  it('skips a data stream whose backing indices are all stamped, and PUTs once one is not', async () => {
    const name = `.alerts-skiptest-ds-${++uniqueId}`;
    await esClient.indices.putIndexTemplate({
      name: `${name}-template`,
      index_patterns: [`${name}*`],
      data_stream: {},
      template: {
        settings: {
          'index.number_of_replicas': 0,
          'index.mapping.total_fields.limit': TOTAL_FIELDS_LIMIT,
          'index.mapping.total_fields.ignore_dynamic_beyond_limit': true,
        },
        mappings: { dynamic: false, properties: { '@timestamp': { type: 'date' } } },
      },
    });
    await esClient.indices.createDataStream({ name });

    const dataStream: ConcreteIndexInfo = {
      index: name,
      alias: name,
      isWriteIndex: true,
      isHidden: true,
    };
    const simulatedMapping = buildMapping(50);
    await install([dataStream], simulatedMapping);

    // The stamp is read through the data stream name, so it has to resolve to the
    // backing indices the same way the PUT does.
    putMapping.mockClear();
    await install([dataStream], simulatedMapping);
    expect(putMapping).not.toHaveBeenCalled();

    // A rollover adds a backing index built from the template, i.e. without the stamp.
    await esClient.indices.rollover({ alias: name });
    expect(await readContentHashes(name)).toEqual([expect.any(String), undefined]);

    putMapping.mockClear();
    await install([dataStream], simulatedMapping);

    expect(putMapping).toHaveBeenCalledTimes(1);
    const hashes = await readContentHashes(name);
    expect(hashes[0]).toEqual(expect.any(String));
    expect(hashes).toEqual([hashes[0], hashes[0]]);
  });
});
