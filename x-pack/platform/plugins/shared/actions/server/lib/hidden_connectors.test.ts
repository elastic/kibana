/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, httpServerMock } from '@kbn/core/server/mocks';
import { securityServiceMock } from '@kbn/core-security-server-mocks';
import { nodeBuilder, toElasticsearchQuery } from '@kbn/es-query';

import { excludeHiddenConnectors, getHiddenConnectorIds } from './hidden_connectors';

const VISIBLE = { term: { 'acl.general_access': 'edit' } };

const hit = (id: string) => ({ _index: '.kibana_alerting_cases', _id: `action:${id}`, sort: [id] });

const mockPages = (
  esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>,
  pages: string[][]
) => {
  esClient.openPointInTime.mockResponse({ id: 'pit', _shards: {} as never });
  for (const page of pages) {
    esClient.search.mockResponseOnce({
      took: 1,
      timed_out: false,
      _shards: {} as never,
      pit_id: 'pit',
      hits: { hits: page.map(hit) },
    });
  }
};

describe('getHiddenConnectorIds', () => {
  const setup = ({ readFilter }: { readFilter?: object } = { readFilter: VISIBLE }) => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    const accessControl = { getReadFilter: jest.fn().mockResolvedValue(readFilter) };
    return { esClient, accessControl };
  };

  it('reads nothing when the caller can view every connector', async () => {
    const { esClient, accessControl } = setup({});

    await expect(
      getHiddenConnectorIds({ esClient, accessControl, spaceIds: ['default'] })
    ).resolves.toEqual([]);
    expect(esClient.openPointInTime).not.toHaveBeenCalled();
  });

  it('returns the IDs of connectors outside the read filter, page by page', async () => {
    const { esClient, accessControl } = setup();
    const firstPage = Array.from({ length: 1000 }, (_, index) => `c${index}`);
    mockPages(esClient, [firstPage, ['last']]);

    const ids = await getHiddenConnectorIds({ esClient, accessControl, spaceIds: ['a', 'b'] });

    expect(ids).toEqual([...firstPage, 'last']);
    expect(accessControl.getReadFilter).toHaveBeenCalledWith({
      type: 'action',
      spaceIds: ['a', 'b'],
    });
    expect(esClient.search).toHaveBeenCalledTimes(2);
    expect(esClient.search.mock.calls[0][0]).toMatchObject({
      query: {
        bool: {
          filter: [{ term: { type: 'action' } }, { terms: { namespaces: ['a', 'b'] } }],
          must_not: [VISIBLE],
        },
      },
      _source: false,
    });
    expect(esClient.search.mock.calls[1][0]).toMatchObject({ search_after: ['c999'] });
    expect(esClient.closePointInTime).toHaveBeenCalledWith({ id: 'pit' });
  });

  it('throws when the lookup fails, and still closes the point in time', async () => {
    const { esClient, accessControl } = setup();
    esClient.openPointInTime.mockResponse({ id: 'pit', _shards: {} as never });
    esClient.search.mockRejectedValueOnce(new Error('search failed'));

    await expect(
      getHiddenConnectorIds({ esClient, accessControl, spaceIds: ['default'] })
    ).rejects.toThrow('search failed');
    expect(esClient.closePointInTime).toHaveBeenCalledWith({ id: 'pit' });
  });
});

describe('excludeHiddenConnectors', () => {
  const FILTER = nodeBuilder.is('kibana.saved_objects.namespace', 'default');

  const setup = ({ enabled = true, hiddenIds = [] as string[] } = {}) => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    const securityService = securityServiceMock.createStart();
    const scoped = securityServiceMock.createScopedAccessControl();
    securityService.accessControl.asScoped.mockReturnValue(scoped);
    scoped.isEnabled.mockReturnValue(enabled);
    scoped.getReadFilter.mockResolvedValue(VISIBLE);
    mockPages(esClient, [hiddenIds]);
    const context = {
      request: httpServerMock.createKibanaRequest(),
      securityService,
      spaces: { getSpaceId: jest.fn().mockReturnValue('request-space') },
      esClient,
    };
    return { context, scoped };
  };

  it('keeps the filter while object-level security is disabled', async () => {
    const { context, scoped } = setup({ enabled: false });

    await expect(excludeHiddenConnectors(context, { filter: FILTER })).resolves.toBe(FILTER);
    expect(scoped.getReadFilter).not.toHaveBeenCalled();
  });

  it('keeps the filter when nothing is hidden', async () => {
    const { context } = setup();

    await expect(excludeHiddenConnectors(context, { filter: FILTER })).resolves.toBe(FILTER);
  });

  it('excludes events of hidden connectors within the nested saved object reference', async () => {
    const { context } = setup({ hiddenIds: ['h1', 'h2'] });

    const filter = await excludeHiddenConnectors(context, { filter: FILTER });

    expect(toElasticsearchQuery(filter)).toEqual({
      bool: {
        filter: [
          toElasticsearchQuery(FILTER),
          {
            bool: {
              must_not: {
                nested: {
                  path: 'kibana.saved_objects',
                  query: {
                    bool: {
                      filter: [
                        expect.objectContaining({
                          bool: expect.objectContaining({
                            should: [{ match: { 'kibana.saved_objects.type': 'action' } }],
                          }),
                        }),
                        expect.objectContaining({
                          bool: expect.objectContaining({
                            should: [
                              expect.objectContaining({
                                bool: expect.objectContaining({
                                  should: [{ match: { 'kibana.saved_objects.id': 'h1' } }],
                                }),
                              }),
                              expect.objectContaining({
                                bool: expect.objectContaining({
                                  should: [{ match: { 'kibana.saved_objects.id': 'h2' } }],
                                }),
                              }),
                            ],
                          }),
                        }),
                      ],
                    },
                  },
                  score_mode: 'none',
                },
              },
            },
          },
        ],
      },
    });
  });

  it('decides in the requested spaces, or in the request space', async () => {
    const { context, scoped } = setup();

    await excludeHiddenConnectors(context, { filter: FILTER, namespaces: [undefined, 'other'] });
    mockPages(context.esClient, [[]]);
    await excludeHiddenConnectors(context, { filter: FILTER });

    expect(scoped.getReadFilter.mock.calls).toEqual([
      [{ type: 'action', spaceIds: ['default', 'other'] }],
      [{ type: 'action', spaceIds: ['request-space'] }],
    ]);
  });
});
