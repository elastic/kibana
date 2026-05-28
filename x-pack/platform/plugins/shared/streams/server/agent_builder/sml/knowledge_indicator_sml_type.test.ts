/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreSetup,
  ElasticsearchClient,
  KibanaRequest,
  Logger,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import { errors } from '@elastic/elasticsearch';
import type { TransportResult } from '@elastic/elasticsearch';
import type { StreamsPluginStartDependencies } from '../../types';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import {
  KI_ATTACHMENT_TYPE,
  KI_ORIGIN_KIND_FEATURE,
  KI_ORIGIN_KIND_QUERY,
  KI_SML_TYPE,
} from '@kbn/streams-schema';
import type {
  SmlContext,
  SmlDocument,
  SmlListItem,
  SmlToAttachmentContext,
} from '@kbn/agent-context-layer-plugin/server';
import type { GetScopedClients, RouteHandlerScopedClients } from '../../routes/types';
import {
  FEATURE_EXCLUDED_AT,
  FEATURE_EXPIRES_AT,
  FEATURE_LAST_SEEN,
  FEATURE_UUID,
} from '../../lib/streams/feature/fields';
import {
  ASSET_TYPE,
  ASSET_UUID,
  QUERY_ESQL_QUERY,
  QUERY_TITLE,
  QUERY_TYPE,
  RULE_BACKED,
} from '../../lib/streams/assets/fields';
import { featureStorageSettings } from '../../lib/streams/feature/storage_settings';
import { queryStorageSettings } from '../../lib/streams/assets/storage_settings';

jest.mock('./internal_ki_clients', () => ({
  getInternalFeatureClient: jest.fn(),
  getInternalQueryClient: jest.fn(),
}));

import { createKnowledgeIndicatorSmlType } from './knowledge_indicator_sml_type';
import { getInternalFeatureClient, getInternalQueryClient } from './internal_ki_clients';

const mockedGetInternalFeatureClient = getInternalFeatureClient as jest.MockedFunction<
  typeof getInternalFeatureClient
>;
const mockedGetInternalQueryClient = getInternalQueryClient as jest.MockedFunction<
  typeof getInternalQueryClient
>;

const FEATURE_UUID_A = 'feat-uuid-a';
const FEATURE_UUID_B = 'feat-uuid-b';
const FEATURE_UUID_C = 'feat-uuid-c';
const QUERY_UUID_A = 'query-uuid-a';
const QUERY_UUID_B = 'query-uuid-b';

const makeLogger = (): Logger => loggingSystemMock.createLogger();

const makeCoreSetup = () => ({} as unknown as CoreSetup<StreamsPluginStartDependencies>);

const makeGetScopedClients = (
  overrides: Partial<RouteHandlerScopedClients>
): jest.MockedFunction<GetScopedClients> =>
  jest.fn(
    async () => overrides as unknown as RouteHandlerScopedClients
  ) as unknown as jest.MockedFunction<GetScopedClients>;

interface StubEsClient {
  openPointInTime: jest.Mock;
  closePointInTime: jest.Mock;
  search: jest.Mock;
}

const stubEsClient = (): StubEsClient => ({
  openPointInTime: jest.fn(async () => ({ id: 'pit-1' })),
  closePointInTime: jest.fn(async () => undefined),
  search: jest.fn(),
});

const consumePages = async <T>(iterable: AsyncIterable<T[]>): Promise<T[]> => {
  const out: T[] = [];
  for await (const page of iterable) {
    out.push(...page);
  }
  return out;
};

const featureHit = ({
  uuid,
  lastSeen,
  sort,
}: {
  uuid: string;
  lastSeen?: string;
  sort: unknown[];
}) => ({
  _id: uuid,
  _source: {
    [FEATURE_UUID]: uuid,
    ...(lastSeen ? { [FEATURE_LAST_SEEN]: lastSeen } : {}),
  },
  sort,
});

const queryHit = ({ uuid, sort }: { uuid: string; sort: unknown[] }) => ({
  _id: uuid,
  _source: { [ASSET_UUID]: uuid },
  sort,
});

const makeContext = (esClient: StubEsClient): SmlContext =>
  ({
    esClient: esClient as unknown as ElasticsearchClient,
    savedObjectsClient: {} as SavedObjectsClientContract,
    logger: makeLogger(),
  } as SmlContext);

describe('createKnowledgeIndicatorSmlType', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('id', () => {
    it('registers under the KI SML type id', () => {
      const type = createKnowledgeIndicatorSmlType({
        coreSetup: makeCoreSetup(),
        logger: makeLogger(),
        getScopedClients: jest.fn() as unknown as GetScopedClients,
      });
      expect(type.id).toBe(KI_SML_TYPE);
    });
  });

  describe('list()', () => {
    it('yields features then queries with the correct origin id prefix and updatedAt', async () => {
      const esClient = stubEsClient();
      esClient.search
        .mockResolvedValueOnce({
          hits: {
            hits: [
              featureHit({
                uuid: FEATURE_UUID_A,
                lastSeen: '2024-06-01T00:00:00.000Z',
                sort: [FEATURE_UUID_A],
              }),
              featureHit({
                uuid: FEATURE_UUID_B,
                lastSeen: '2024-06-02T00:00:00.000Z',
                sort: [FEATURE_UUID_B],
              }),
            ],
          },
        })
        .mockResolvedValueOnce({
          hits: {
            hits: [
              queryHit({ uuid: QUERY_UUID_A, sort: [QUERY_UUID_A] }),
              queryHit({ uuid: QUERY_UUID_B, sort: [QUERY_UUID_B] }),
            ],
          },
        });

      const type = createKnowledgeIndicatorSmlType({
        coreSetup: makeCoreSetup(),
        logger: makeLogger(),
        getScopedClients: jest.fn() as unknown as GetScopedClients,
      });

      const items = await consumePages<SmlListItem>(type.list(makeContext(esClient)));

      expect(items).toEqual([
        {
          id: `${KI_ORIGIN_KIND_FEATURE}:${FEATURE_UUID_A}`,
          updatedAt: '2024-06-01T00:00:00.000Z',
          spaces: ['*'],
        },
        {
          id: `${KI_ORIGIN_KIND_FEATURE}:${FEATURE_UUID_B}`,
          updatedAt: '2024-06-02T00:00:00.000Z',
          spaces: ['*'],
        },
        {
          id: `${KI_ORIGIN_KIND_QUERY}:${QUERY_UUID_A}`,
          updatedAt: expect.stringMatching(/^1970-01-01T00:00:00\.000Z#[a-f0-9]{40}$/),
          spaces: ['*'],
        },
        {
          id: `${KI_ORIGIN_KIND_QUERY}:${QUERY_UUID_B}`,
          updatedAt: expect.stringMatching(/^1970-01-01T00:00:00\.000Z#[a-f0-9]{40}$/),
          spaces: ['*'],
        },
      ]);
    });

    it('returns identical query updatedAt hashes for two queries with identical content fields', async () => {
      const esClient = stubEsClient();
      esClient.search.mockResolvedValueOnce({ hits: { hits: [] } }).mockResolvedValueOnce({
        hits: {
          hits: [
            queryHit({ uuid: QUERY_UUID_A, sort: [QUERY_UUID_A] }),
            queryHit({ uuid: QUERY_UUID_B, sort: [QUERY_UUID_B] }),
          ],
        },
      });

      const type = createKnowledgeIndicatorSmlType({
        coreSetup: makeCoreSetup(),
        logger: makeLogger(),
        getScopedClients: jest.fn() as unknown as GetScopedClients,
      });

      const items = await consumePages<SmlListItem>(type.list(makeContext(esClient)));
      const queryItems = items.filter((item) => item.id.startsWith(`${KI_ORIGIN_KIND_QUERY}:`));
      expect(queryItems[0].updatedAt).toBe(queryItems[1].updatedAt);
    });

    it('returns different query updatedAt hashes when content fields differ', async () => {
      const esClient = stubEsClient();
      esClient.search.mockResolvedValueOnce({ hits: { hits: [] } }).mockResolvedValueOnce({
        hits: {
          hits: [
            {
              _id: QUERY_UUID_A,
              _source: {
                [ASSET_UUID]: QUERY_UUID_A,
                [QUERY_TITLE]: 'Spike A',
                [QUERY_ESQL_QUERY]: 'FROM logs | WHERE status >= 500',
              },
              sort: [QUERY_UUID_A],
            },
            {
              _id: QUERY_UUID_B,
              _source: {
                [ASSET_UUID]: QUERY_UUID_B,
                [QUERY_TITLE]: 'Spike B',
                [QUERY_ESQL_QUERY]: 'FROM logs | WHERE status >= 500',
              },
              sort: [QUERY_UUID_B],
            },
          ],
        },
      });

      const type = createKnowledgeIndicatorSmlType({
        coreSetup: makeCoreSetup(),
        logger: makeLogger(),
        getScopedClients: jest.fn() as unknown as GetScopedClients,
      });

      const items = await consumePages<SmlListItem>(type.list(makeContext(esClient)));
      const queryItems = items.filter((item) => item.id.startsWith(`${KI_ORIGIN_KIND_QUERY}:`));
      expect(queryItems[0].updatedAt).not.toBe(queryItems[1].updatedAt);
    });

    it('opens and closes a PIT for each index', async () => {
      const esClient = stubEsClient();
      esClient.search
        .mockResolvedValueOnce({ hits: { hits: [] } })
        .mockResolvedValueOnce({ hits: { hits: [] } });

      const type = createKnowledgeIndicatorSmlType({
        coreSetup: makeCoreSetup(),
        logger: makeLogger(),
        getScopedClients: jest.fn() as unknown as GetScopedClients,
      });

      await consumePages(type.list(makeContext(esClient)));

      expect(esClient.openPointInTime).toHaveBeenNthCalledWith(1, {
        index: featureStorageSettings.name,
        keep_alive: '1m',
      });
      expect(esClient.openPointInTime).toHaveBeenNthCalledWith(2, {
        index: queryStorageSettings.name,
        keep_alive: '1m',
      });
      expect(esClient.closePointInTime).toHaveBeenCalledTimes(2);
    });

    it('uses buildFeatureBaseFilters semantics so expired (past) and excluded features are dropped', async () => {
      const esClient = stubEsClient();
      esClient.search
        .mockResolvedValueOnce({ hits: { hits: [] } })
        .mockResolvedValueOnce({ hits: { hits: [] } });

      const type = createKnowledgeIndicatorSmlType({
        coreSetup: makeCoreSetup(),
        logger: makeLogger(),
        getScopedClients: jest.fn() as unknown as GetScopedClients,
      });

      await consumePages(type.list(makeContext(esClient)));

      const featureCall = esClient.search.mock.calls[0][0];
      const filters = featureCall.query?.bool?.filter as Array<Record<string, unknown>>;
      expect(filters).toBeDefined();
      // Expired filter: absent OR `expires_at` >= now.
      const expiredClause = filters.find((clause) =>
        (clause.bool as { should?: Array<Record<string, unknown>> })?.should?.some(
          (should: Record<string, unknown>) =>
            (should.bool as { must_not?: { exists?: { field?: string } } })?.must_not?.exists
              ?.field === FEATURE_EXPIRES_AT
        )
      );
      expect(expiredClause).toBeDefined();
      // Excluded filter: must_not exists.
      const excludedClause = filters.find(
        (clause) =>
          (clause.bool as { must_not?: { exists?: { field?: string } } })?.must_not?.exists
            ?.field === FEATURE_EXCLUDED_AT
      );
      expect(excludedClause).toBeDefined();
      expect(featureCall.sort).toEqual([{ [FEATURE_UUID]: 'asc' }]);

      const queryCall = esClient.search.mock.calls[1][0];
      expect(queryCall.query?.bool?.filter).toEqual([
        { term: { [ASSET_TYPE]: 'query' } },
        { term: { [RULE_BACKED]: true } },
      ]);
      expect(queryCall.query?.bool?.must_not).toEqual([{ term: { [QUERY_TYPE]: 'stats' } }]);
      expect(queryCall.sort).toEqual([{ [ASSET_UUID]: 'asc' }]);
    });

    it('paginates feature results via search_after when the first page is full', async () => {
      const esClient = stubEsClient();
      const fullPage = Array.from({ length: 1000 }, (_, i) =>
        featureHit({
          uuid: `feature-${i.toString().padStart(4, '0')}`,
          lastSeen: '2024-06-01T00:00:00.000Z',
          sort: [`feature-${i.toString().padStart(4, '0')}`],
        })
      );
      const tail = [
        featureHit({
          uuid: 'feature-tail',
          lastSeen: '2024-06-03T00:00:00.000Z',
          sort: ['feature-tail'],
        }),
      ];
      esClient.search
        .mockResolvedValueOnce({ hits: { hits: fullPage } })
        .mockResolvedValueOnce({ hits: { hits: tail } })
        .mockResolvedValueOnce({ hits: { hits: [] } });

      const type = createKnowledgeIndicatorSmlType({
        coreSetup: makeCoreSetup(),
        logger: makeLogger(),
        getScopedClients: jest.fn() as unknown as GetScopedClients,
      });

      const items = await consumePages<SmlListItem>(type.list(makeContext(esClient)));

      const secondCall = esClient.search.mock.calls[1][0];
      expect(secondCall.search_after).toEqual(['feature-0999']);
      expect(items).toHaveLength(fullPage.length + tail.length);
    });

    it('paginates query results via search_after when the first page is full', async () => {
      const esClient = stubEsClient();
      const fullQueryPage = Array.from({ length: 1000 }, (_, i) =>
        queryHit({
          uuid: `query-${i.toString().padStart(4, '0')}`,
          sort: [`query-${i.toString().padStart(4, '0')}`],
        })
      );
      const queryTail = [queryHit({ uuid: 'query-tail', sort: ['query-tail'] })];
      esClient.search
        .mockResolvedValueOnce({ hits: { hits: [] } })
        .mockResolvedValueOnce({ hits: { hits: fullQueryPage } })
        .mockResolvedValueOnce({ hits: { hits: queryTail } })
        .mockResolvedValueOnce({ hits: { hits: [] } });

      const type = createKnowledgeIndicatorSmlType({
        coreSetup: makeCoreSetup(),
        logger: makeLogger(),
        getScopedClients: jest.fn() as unknown as GetScopedClients,
      });

      const items = await consumePages<SmlListItem>(type.list(makeContext(esClient)));

      // First call is the feature page (empty), so the query "next page" call
      // is index 2: features-pit + features-search + queries-pit + queries-search-1.
      const queryFollowUp = esClient.search.mock.calls[2][0];
      expect(queryFollowUp.search_after).toEqual(['query-0999']);
      const queryItems = items.filter((item) => item.id.startsWith(`${KI_ORIGIN_KIND_QUERY}:`));
      expect(queryItems).toHaveLength(fullQueryPage.length + queryTail.length);
    });

    it('reads dotted-key _source fields without nesting', async () => {
      const esClient = stubEsClient();
      esClient.search
        .mockResolvedValueOnce({
          hits: {
            hits: [
              {
                _id: FEATURE_UUID_A,
                _source: {
                  // Dotted keys are returned as flat strings by ES; the listing
                  // path must read them as such, not as nested `feature: {...}`.
                  [FEATURE_UUID]: FEATURE_UUID_A,
                  [FEATURE_LAST_SEEN]: '2024-06-04T00:00:00.000Z',
                },
                sort: [FEATURE_UUID_A],
              },
            ],
          },
        })
        .mockResolvedValueOnce({ hits: { hits: [] } });

      const type = createKnowledgeIndicatorSmlType({
        coreSetup: makeCoreSetup(),
        logger: makeLogger(),
        getScopedClients: jest.fn() as unknown as GetScopedClients,
      });

      const items = await consumePages<SmlListItem>(type.list(makeContext(esClient)));

      expect(items).toEqual([
        {
          id: `${KI_ORIGIN_KIND_FEATURE}:${FEATURE_UUID_A}`,
          updatedAt: '2024-06-04T00:00:00.000Z',
          spaces: ['*'],
        },
      ]);
    });

    it('silently returns nothing when the feature index is missing', async () => {
      const esClient = stubEsClient();
      const missingIndexError = new errors.ResponseError({
        body: { error: { type: 'index_not_found_exception' } },
        statusCode: 404,
        headers: {},
        warnings: [],
        meta: {} as TransportResult['meta'],
      });
      esClient.openPointInTime
        .mockRejectedValueOnce(missingIndexError)
        .mockResolvedValueOnce({ id: 'pit-1' });
      esClient.search.mockResolvedValueOnce({ hits: { hits: [] } });

      const type = createKnowledgeIndicatorSmlType({
        coreSetup: makeCoreSetup(),
        logger: makeLogger(),
        getScopedClients: jest.fn() as unknown as GetScopedClients,
      });

      const items = await consumePages(type.list(makeContext(esClient)));
      expect(items).toEqual([]);
    });
  });

  describe('getSmlData()', () => {
    it('returns undefined for an unrecognized origin', async () => {
      const type = createKnowledgeIndicatorSmlType({
        coreSetup: makeCoreSetup(),
        logger: makeLogger(),
        getScopedClients: jest.fn() as unknown as GetScopedClients,
      });

      await expect(
        type.getSmlData('not-a-prefix', makeContext(stubEsClient()))
      ).resolves.toBeUndefined();
    });

    it('builds a feature chunk with content fields joined and api:read_stream permissions', async () => {
      const featureClient = {
        findFeaturesByUuids: jest.fn(async () => [
          { uuid: FEATURE_UUID_A, stream_name: 'logs.app' },
        ]),
        getFeature: jest.fn(async () => ({
          uuid: FEATURE_UUID_A,
          id: 'feature-id',
          stream_name: 'logs.app',
          type: 'service',
          subtype: 'http',
          title: 'HTTP service',
          description: 'Detected HTTP traffic',
          properties: {},
          confidence: 80,
          status: 'active',
          last_seen: '2024-06-01T00:00:00.000Z',
          tags: ['env:prod', 'team:web'],
        })),
      };
      mockedGetInternalFeatureClient.mockResolvedValue(
        featureClient as unknown as Awaited<ReturnType<typeof getInternalFeatureClient>>
      );

      const type = createKnowledgeIndicatorSmlType({
        coreSetup: makeCoreSetup(),
        logger: makeLogger(),
        getScopedClients: jest.fn() as unknown as GetScopedClients,
      });

      const data = await type.getSmlData(
        `${KI_ORIGIN_KIND_FEATURE}:${FEATURE_UUID_A}`,
        makeContext(stubEsClient())
      );

      expect(featureClient.findFeaturesByUuids).toHaveBeenCalledWith([FEATURE_UUID_A]);
      expect(data?.chunks).toEqual([
        {
          type: KI_SML_TYPE,
          title: 'HTTP service',
          content: [
            'stream: logs.app',
            'title: HTTP service',
            'type: service',
            'subtype: http',
            'description: Detected HTTP traffic',
            'tags: env:prod, team:web',
            'status: active',
            'confidence: 80',
            'last_seen: 2024-06-01T00:00:00.000Z',
          ].join('\n'),
          description: 'Detected HTTP traffic',
          permissions: ['api:read_stream'],
        },
      ]);
    });

    it('returns undefined when the feature has already been deleted', async () => {
      const featureClient = {
        findFeaturesByUuids: jest.fn(async () => []),
        getFeature: jest.fn(),
      };
      mockedGetInternalFeatureClient.mockResolvedValue(
        featureClient as unknown as Awaited<ReturnType<typeof getInternalFeatureClient>>
      );

      const type = createKnowledgeIndicatorSmlType({
        coreSetup: makeCoreSetup(),
        logger: makeLogger(),
        getScopedClients: jest.fn() as unknown as GetScopedClients,
      });

      const data = await type.getSmlData(
        `${KI_ORIGIN_KIND_FEATURE}:${FEATURE_UUID_C}`,
        makeContext(stubEsClient())
      );
      expect(data).toBeUndefined();
      expect(featureClient.getFeature).not.toHaveBeenCalled();
    });

    it('builds a query chunk including esql.query in the searchable content', async () => {
      const queryClient = {
        findQueryLinksByUuids: jest.fn(async () => [
          {
            stream_name: 'logs.app',
            query: {
              id: 'query-id',
              title: 'High error rate',
              description: 'Detects 5xx spike',
              type: 'match' as const,
              esql: { query: 'FROM logs.app | WHERE status >= 500' },
            },
            rule_backed: true,
            rule_id: 'rule-123',
          },
        ]),
      };
      mockedGetInternalQueryClient.mockResolvedValue(
        queryClient as unknown as Awaited<ReturnType<typeof getInternalQueryClient>>
      );

      const type = createKnowledgeIndicatorSmlType({
        coreSetup: makeCoreSetup(),
        logger: makeLogger(),
        getScopedClients: jest.fn() as unknown as GetScopedClients,
      });

      const data = await type.getSmlData(
        `${KI_ORIGIN_KIND_QUERY}:${QUERY_UUID_A}`,
        makeContext(stubEsClient())
      );

      expect(queryClient.findQueryLinksByUuids).toHaveBeenCalledWith([QUERY_UUID_A]);
      expect(data?.chunks).toEqual([
        {
          type: KI_SML_TYPE,
          title: 'High error rate',
          content: [
            'stream: logs.app',
            'title: High error rate',
            'description: Detects 5xx spike',
            'type: match',
            'rule_backed: true',
            'rule_id: rule-123',
            'esql: FROM logs.app | WHERE status >= 500',
          ].join('\n'),
          description: 'Detects 5xx spike',
          permissions: ['api:read_stream'],
        },
      ]);
    });

    it('returns undefined when the query has been unlinked since listing', async () => {
      const queryClient = {
        findQueryLinksByUuids: jest.fn(async () => []),
      };
      mockedGetInternalQueryClient.mockResolvedValue(
        queryClient as unknown as Awaited<ReturnType<typeof getInternalQueryClient>>
      );

      const type = createKnowledgeIndicatorSmlType({
        coreSetup: makeCoreSetup(),
        logger: makeLogger(),
        getScopedClients: jest.fn() as unknown as GetScopedClients,
      });

      await expect(
        type.getSmlData(`${KI_ORIGIN_KIND_QUERY}:${QUERY_UUID_B}`, makeContext(stubEsClient()))
      ).resolves.toBeUndefined();
    });
  });

  describe('toAttachment()', () => {
    const smlDoc = (overrides: Partial<SmlDocument> = {}): SmlDocument => ({
      id: 'sml-chunk-id',
      type: KI_SML_TYPE,
      origin_id: `${KI_ORIGIN_KIND_FEATURE}:${FEATURE_UUID_A}`,
      title: 'HTTP service',
      content: 'logs.app\nservice\nhttp\nHTTP service',
      created_at: '2024-06-01T00:00:00.000Z',
      updated_at: '2024-06-01T00:00:00.000Z',
      spaces: ['*'],
      permissions: ['api:read_stream'],
      ...overrides,
    });

    const attachContext = (getScopedClients: GetScopedClients): SmlToAttachmentContext =>
      ({
        request: {} as KibanaRequest,
        savedObjectsClient: {} as SavedObjectsClientContract,
        spaceId: 'default',
        // toAttachment passes the request through to getScopedClients via the
        // closure captured in createKnowledgeIndicatorSmlType — we stash the
        // mock as well so the test reads naturally.
        getScopedClients,
      } as unknown as SmlToAttachmentContext);

    it('returns a feature attachment when the caller can read the stream', async () => {
      const feature = {
        uuid: FEATURE_UUID_A,
        id: 'feature-id',
        stream_name: 'logs.app',
        type: 'service',
        subtype: 'http',
        title: 'HTTP service',
        description: 'Detected HTTP traffic',
        properties: {},
        confidence: 80,
        status: 'active' as const,
        last_seen: '2024-06-01T00:00:00.000Z',
      };

      const featureClient = {
        findFeaturesByUuids: jest.fn(async () => [
          { uuid: FEATURE_UUID_A, stream_name: 'logs.app' },
        ]),
        getFeature: jest.fn(async () => feature),
      };
      const streamsClient = { getStream: jest.fn(async () => ({ name: 'logs.app' })) };

      const getScopedClients = makeGetScopedClients({
        streamsClient: streamsClient as unknown as RouteHandlerScopedClients['streamsClient'],
        getFeatureClient: (async () =>
          featureClient) as unknown as RouteHandlerScopedClients['getFeatureClient'],
        getQueryClient:
          (async () => ({})) as unknown as RouteHandlerScopedClients['getQueryClient'],
      });

      const type = createKnowledgeIndicatorSmlType({
        coreSetup: makeCoreSetup(),
        logger: makeLogger(),
        getScopedClients,
      });

      const attachment = await type.toAttachment(smlDoc(), attachContext(getScopedClients));

      expect(streamsClient.getStream).toHaveBeenCalledWith('logs.app');
      expect(attachment).toEqual({
        type: KI_ATTACHMENT_TYPE,
        data: {
          kind: KI_ORIGIN_KIND_FEATURE,
          feature,
          stream_name: 'logs.app',
        },
        origin: `${KI_ORIGIN_KIND_FEATURE}:${FEATURE_UUID_A}`,
      });
    });

    it('returns undefined when stream access is denied', async () => {
      const featureClient = {
        findFeaturesByUuids: jest.fn(async () => [
          { uuid: FEATURE_UUID_A, stream_name: 'logs.app' },
        ]),
        getFeature: jest.fn(),
      };
      const streamsClient = {
        getStream: jest.fn(async () => {
          throw Object.assign(new Error('forbidden'), { statusCode: 403 });
        }),
      };

      const getScopedClients = makeGetScopedClients({
        streamsClient: streamsClient as unknown as RouteHandlerScopedClients['streamsClient'],
        getFeatureClient: (async () =>
          featureClient) as unknown as RouteHandlerScopedClients['getFeatureClient'],
        getQueryClient:
          (async () => ({})) as unknown as RouteHandlerScopedClients['getQueryClient'],
      });

      const type = createKnowledgeIndicatorSmlType({
        coreSetup: makeCoreSetup(),
        logger: makeLogger(),
        getScopedClients,
      });

      const attachment = await type.toAttachment(smlDoc(), attachContext(getScopedClients));
      expect(attachment).toBeUndefined();
      expect(featureClient.getFeature).not.toHaveBeenCalled();
    });

    it('returns a query attachment with the rule status preserved', async () => {
      const queryClient = {
        findQueryLinksByUuids: jest.fn(async () => [
          {
            stream_name: 'logs.app',
            query: {
              id: 'query-id',
              title: 'High error rate',
              description: 'Detects 5xx spike',
              type: 'match' as const,
              esql: { query: 'FROM logs.app | WHERE status >= 500' },
            },
            rule_backed: true,
            rule_id: 'rule-123',
          },
        ]),
      };
      const streamsClient = { getStream: jest.fn(async () => ({ name: 'logs.app' })) };

      const getScopedClients = makeGetScopedClients({
        streamsClient: streamsClient as unknown as RouteHandlerScopedClients['streamsClient'],
        getFeatureClient:
          (async () => ({})) as unknown as RouteHandlerScopedClients['getFeatureClient'],
        getQueryClient: (async () =>
          queryClient) as unknown as RouteHandlerScopedClients['getQueryClient'],
      });

      const type = createKnowledgeIndicatorSmlType({
        coreSetup: makeCoreSetup(),
        logger: makeLogger(),
        getScopedClients,
      });

      const attachment = await type.toAttachment(
        smlDoc({ origin_id: `${KI_ORIGIN_KIND_QUERY}:${QUERY_UUID_A}` }),
        attachContext(getScopedClients)
      );

      expect(attachment).toEqual({
        type: KI_ATTACHMENT_TYPE,
        data: {
          kind: KI_ORIGIN_KIND_QUERY,
          query: {
            id: 'query-id',
            title: 'High error rate',
            description: 'Detects 5xx spike',
            type: 'match',
            esql: { query: 'FROM logs.app | WHERE status >= 500' },
          },
          stream_name: 'logs.app',
          rule: { backed: true, id: 'rule-123' },
        },
        origin: `${KI_ORIGIN_KIND_QUERY}:${QUERY_UUID_A}`,
      });
    });

    it('returns undefined when the origin id cannot be decoded', async () => {
      const getScopedClients = makeGetScopedClients({});
      const type = createKnowledgeIndicatorSmlType({
        coreSetup: makeCoreSetup(),
        logger: makeLogger(),
        getScopedClients,
      });

      const attachment = await type.toAttachment(
        smlDoc({ origin_id: 'malformed' }),
        attachContext(getScopedClients)
      );

      expect(attachment).toBeUndefined();
    });
  });
});
