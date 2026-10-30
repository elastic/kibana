/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import type { EntityType } from '../../../common/domain/definitions/entity_schema';
import { collectEntityMetadata, getFleetPackageNames, toSourceKind } from './entity_metadata';

const columnsOf = (names: string[]) => names.map((name) => ({ name, type: 'long' }));

describe('toSourceKind', () => {
  const packages = new Set(['okta', 'system']);

  it('uses the first dotted chunk to find the package', () => {
    expect(toSourceKind('okta', packages)).toBe('integration');
    expect(toSourceKind('system.auth', packages)).toBe('integration');
    expect(toSourceKind('my_app.audit', packages)).toBe('custom');
  });
});

describe('getFleetPackageNames', () => {
  it('keeps only packages managed by fleet', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.indices.getIndexTemplate.mockResolvedValue({
      index_templates: [
        { index_template: { _meta: { managed_by: 'fleet', package: { name: 'okta' } } } },
        { index_template: { _meta: { managed_by: 'other', package: { name: 'x' } } } },
        { index_template: {} },
      ],
    } as never);

    await expect(getFleetPackageNames(esClient, loggerMock.create())).resolves.toEqual(
      new Set(['okta'])
    );
  });

  it('returns an empty set and warns when the lookup fails', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.indices.getIndexTemplate.mockRejectedValue(new Error('forbidden'));
    const logger = loggerMock.create();

    await expect(getFleetPackageNames(esClient, logger)).resolves.toEqual(new Set());
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('forbidden'));
  });
});

describe('collectEntityMetadata', () => {
  const signal = new AbortController().signal;
  const run = (
    esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>,
    entityType: EntityType,
    deadline = Date.now() + 9 * 60_000
  ) =>
    collectEntityMetadata({
      esClient,
      index: 'idx',
      namespace: 'default',
      entityType,
      totalEntities: 10,
      groupSizes: [{ size: 2, groups: 3 }],
      fleetPackages: new Set(),
      signal,
      deadline,
    });

  const clientWith = (
    esql: (query: string) => {
      columns: Array<{ name: string; type: string }>;
      values: unknown[][];
    },
    search: (params: Record<string, unknown>) => unknown = () => ({ aggregations: {} })
  ) => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.esql.query.mockImplementation((async ({ query }: { query: string }) =>
      esql(query)) as never);
    esClient.search.mockImplementation((async (params: Record<string, unknown>) =>
      search(params)) as never);
    return esClient;
  };

  it('pairs sources that share a value and counts the values already linked', async () => {
    const esClient = clientWith((query) => {
      if (query.includes('TOP(')) {
        return {
          columns: columnsOf(['v', 'srcs', 'groups', 'sources']),
          values: [
            ['a@x.io', 2, 1, ['okta', 'okta', 'azure']],
            ['b@x.io', 2, 2, ['azure', 'okta']],
            ['c@x.io', 3, 1, ['azure', 'okta', 'aws']],
          ],
        };
      }
      return { columns: [], values: [] };
    });

    const { metadata } = await run(esClient, 'user');

    const pairs = metadata.unlinkedDuplicates.sameValueAcrossSources!;
    expect(pairs).toContainEqual({
      sourceA: 'azure',
      sourceB: 'okta',
      field: 'user.email',
      sharedValues: 3,
      alreadyLinked: 2,
    });
    expect(pairs.length).toBeLessThanOrEqual(10);
    expect(esClient.esql.query.mock.calls.every(([params]) => !/VALUES\(/.test(params.query))).toBe(
      true
    );
  });

  it('runs the duplicate and identifier parts only for the types they apply to', async () => {
    const esClient = clientWith(() => ({ columns: [], values: [] }));

    const generic = await run(esClient, 'generic');
    expect(generic.metadata.collection.map((entry) => entry.part)).toEqual(['sourceResolution']);
    expect(generic.metadata.identifiers).toBeUndefined();

    const host = await run(esClient, 'host');
    expect(host.metadata.collection.map((entry) => entry.part)).toEqual([
      'sameIdDifferentCase',
      'primaryIdentifier',
      'sourceResolution',
    ]);
  });

  it('reads the primary identifier per source and in total', async () => {
    const esClient = clientWith(
      () => ({ columns: [], values: [] }),
      (params) =>
        params.runtime_mappings
          ? {
              aggregations: {
                overall: { buckets: [{ key: 'host.id', doc_count: 8 }] },
                bySource: {
                  buckets: [
                    {
                      key: 'okta',
                      doc_count: 8,
                      identifiers: { buckets: [{ key: 'host.id', doc_count: 8 }] },
                    },
                  ],
                },
              },
            }
          : {
              aggregations: {
                sources: { buckets: [{ key: 'okta', doc_count: 8 }] },
              },
            }
    );

    const { metadata, sourceStates } = await run(esClient, 'host');

    expect(metadata.identifiers).toEqual({
      byPrimaryIdentifier: [{ identifier: 'host.id', entities: 8 }],
    });
    expect(sourceStates[0].byPrimaryIdentifier).toEqual([{ identifier: 'host.id', entities: 8 }]);
  });

  it('adds targets and standalone to each source when the resolution part completes', async () => {
    const esClient = clientWith(
      (query) =>
        query.includes('INLINE STATS')
          ? {
              columns: columnsOf(['entities', 'entity.source', 'role']),
              values: [
                [3, 'okta', 'target'],
                [4, 'okta', 'standalone'],
              ],
            }
          : { columns: [], values: [] },
      () => ({ aggregations: { sources: { buckets: [{ key: 'okta', doc_count: 9 }] } } })
    );

    const { sourceStates } = await run(esClient, 'service');

    expect(sourceStates[0]).toMatchObject({ source: 'okta', targets: 3, standalone: 4 });
  });

  it('leaves targets and standalone out when the resolution part fails', async () => {
    const esClient = clientWith(
      () => {
        throw new Error('no INLINE STATS');
      },
      () => ({ aggregations: { sources: { buckets: [{ key: 'okta', doc_count: 9 }] } } })
    );

    const { sourceStates, metadata } = await run(esClient, 'service');

    expect(sourceStates[0]).not.toHaveProperty('targets');
    expect(sourceStates[0]).not.toHaveProperty('standalone');
    expect(metadata.collection).toEqual([
      expect.objectContaining({ part: 'sourceResolution', outcome: 'failed' }),
    ]);
  });

  it('skips every part when the deadline is too close, and still returns the cheap pass', async () => {
    const esClient = clientWith(() => ({ columns: [], values: [] }));

    const { metadata } = await run(esClient, 'user', Date.now() + 1_000);

    expect(metadata.collection.length).toBeGreaterThan(0);
    expect(metadata.collection.every((entry) => entry.outcome === 'skipped')).toBe(true);
    expect(esClient.esql.query).not.toHaveBeenCalled();
    expect(metadata.totalEntities).toBe(10);
  });
});
