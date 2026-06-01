/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { loggerMock } from '@kbn/logging-mocks';
import type { ElasticsearchClient, IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { AuthorizationServiceSetup } from '@kbn/security-plugin-types-server';
import { createSmlService, isNotFoundError } from './sml_service';
import { SmlResultWindowExceededError } from './sml_errors';
import { smlIndexName, createSmlStorage } from './sml_storage';
import type { SmlTypeDefinition } from './types';

jest.mock('./sml_storage', () => {
  const actual = jest.requireActual('./sml_storage');
  return {
    ...actual,
    createSmlStorage: jest.fn(),
  };
});

const createMockEsClient = (): jest.Mocked<ElasticsearchClient> =>
  ({
    search: jest.fn(),
    count: jest.fn(),
    deleteByQuery: jest.fn().mockResolvedValue({ deleted: 0 }),
  } as unknown as jest.Mocked<ElasticsearchClient>);

const createMockScopedClient = (
  internalUser: jest.Mocked<ElasticsearchClient>
): IScopedClusterClient =>
  ({
    asInternalUser: internalUser,
    asCurrentUser: createMockEsClient(),
  } as unknown as IScopedClusterClient);

const createMockLogger = () => {
  const log = loggerMock.create();
  log.get = jest.fn().mockReturnValue(log);
  return log;
};

const createMockSecurityAuthz = (authorizedPrivileges: string[]): AuthorizationServiceSetup => {
  const checkPrivileges = jest.fn().mockImplementation(async (req: { kibana: string[] }) => ({
    privileges: {
      kibana: req.kibana.map((privilege) => ({
        privilege,
        authorized: authorizedPrivileges.includes(privilege),
      })),
    },
  }));
  return {
    checkPrivilegesDynamicallyWithRequest: jest.fn().mockReturnValue(checkPrivileges),
  } as unknown as AuthorizationServiceSetup;
};

const createMockSecurityAuthzPartial = (
  authorized: string[],
  unauthorized: string[]
): AuthorizationServiceSetup => {
  const authorizedSet = new Set(authorized);
  const checkPrivileges = jest.fn().mockImplementation(async (req: { kibana: string[] }) => ({
    privileges: {
      kibana: req.kibana.map((privilege) => ({
        privilege,
        authorized: authorizedSet.has(privilege),
      })),
    },
  }));
  return {
    checkPrivilegesDynamicallyWithRequest: jest.fn().mockReturnValue(checkPrivileges),
  } as unknown as AuthorizationServiceSetup;
};

const createMockSmlTypeDefinition = (
  overrides: Partial<SmlTypeDefinition> = {}
): SmlTypeDefinition => ({
  id: 'test-type',
  list: jest.fn(),
  getSmlData: jest.fn(),
  toAttachment: jest.fn(),
  ...overrides,
});

const createNotFoundError = () =>
  new errors.ResponseError({
    statusCode: 404,
    body: { error: { type: 'index_not_found_exception' } },
    warnings: [],
    headers: {},
    meta: {} as any,
  });

describe('createSmlService', () => {
  describe('lifecycle', () => {
    it('setup() returns registerType', () => {
      const service = createSmlService();
      const logger = createMockLogger();
      const setup = service.setup({ logger });

      expect(setup.registerType).toBeDefined();
      expect(typeof setup.registerType).toBe('function');

      const def = createMockSmlTypeDefinition({ id: 'dashboard' });
      setup.registerType(def);
      expect(logger.info).toHaveBeenCalledWith('Registered SML type: dashboard');
    });

    it('start() returns the SmlService with registered types accessible', () => {
      const service = createSmlService();
      const logger = createMockLogger();
      const setup = service.setup({ logger });

      const def = createMockSmlTypeDefinition({ id: 'dashboard' });
      setup.registerType(def);

      const smlService = service.start({ logger });

      expect(smlService.search).toBeDefined();
      expect(smlService.checkItemsAccess).toBeDefined();
      expect(smlService.getDocuments).toBeDefined();
      expect(smlService.indexAttachment).toBeDefined();
      expect(smlService.getTypeDefinition).toBeDefined();
      expect(smlService.listTypeDefinitions).toBeDefined();
      expect(smlService.getCrawler).toBeDefined();
      expect(smlService.getCrawler()).toBeDefined();
      expect(smlService.getTypeDefinition('dashboard')).toBe(def);
      expect(smlService.listTypeDefinitions()).toContain(def);
    });
  });
});

describe('isNotFoundError', () => {
  it('returns true for ES ResponseError with statusCode 404', () => {
    const notFoundError = createNotFoundError();
    expect(isNotFoundError(notFoundError)).toBe(true);
  });

  it('returns false for ES ResponseError with other status code', () => {
    const serverError = new errors.ResponseError({
      statusCode: 500,
      body: { error: { type: 'internal_server_error' } },
      warnings: [],
      headers: {},
      meta: {} as any,
    });
    expect(isNotFoundError(serverError)).toBe(false);
  });

  it('returns false for generic Error', () => {
    expect(isNotFoundError(new Error('generic'))).toBe(false);
  });

  it('returns false for non-error values', () => {
    expect(isNotFoundError(null)).toBe(false);
    expect(isNotFoundError(undefined)).toBe(false);
    expect(isNotFoundError('string')).toBe(false);
  });
});

describe('SmlService', () => {
  let esClient: jest.Mocked<ElasticsearchClient>;
  let scopedClient: IScopedClusterClient;
  let logger: ReturnType<typeof createMockLogger>;
  let request: KibanaRequest;

  beforeEach(() => {
    esClient = createMockEsClient();
    scopedClient = createMockScopedClient(esClient);
    logger = createMockLogger();
    request = {} as unknown as KibanaRequest;
  });

  describe('search', () => {
    const saytBoolPrefixFields = [
      'title',
      'title._2gram',
      'title._3gram',
      'title._index_prefix',
      'type.autocomplete',
      'type.autocomplete._index_prefix',
    ];

    it('calls ES search with correct query, space filter, and _source fields', async () => {
      const service = createSmlService();
      service.setup({ logger });
      const smlService = service.start({ logger });

      esClient.search.mockResolvedValue({
        hits: {
          total: 0,
          hits: [],
        },
      } as any);

      await smlService.search({
        query: 'foo bar',
        size: 10,
        spaceId: 'default',
        esClient: scopedClient,
        request,
      });

      expect(esClient.search).toHaveBeenCalledTimes(1);
      expect(
        (scopedClient.asCurrentUser as jest.Mocked<ElasticsearchClient>).search
      ).not.toHaveBeenCalled();
      const call = esClient.search.mock.calls[0]![0]!;
      expect(call.index).toBe(smlIndexName);
      expect(call.size).toBe(10);
      expect(call.allow_no_indices).toBe(true);
      expect(call.ignore_unavailable).toBe(true);
      expect(call.query).toEqual({
        bool: {
          must: [
            {
              bool: {
                should: [
                  {
                    multi_match: {
                      query: 'foo bar',
                      type: 'bool_prefix',
                      fields: saytBoolPrefixFields,
                    },
                  },
                  { match: { content: 'foo bar' } },
                  { match: { description: 'foo bar' } },
                ],
                minimum_should_match: 1,
              },
            },
          ],
          filter: [
            {
              bool: {
                should: [{ term: { spaces: 'default' } }, { term: { spaces: '*' } }],
                minimum_should_match: 1,
              },
            },
          ],
        },
      });
      expect(call._source).toEqual(true);
    });

    it('uses _source excludes when skipContent is true', async () => {
      const service = createSmlService();
      service.setup({ logger });
      const smlService = service.start({ logger });

      esClient.search.mockResolvedValue({
        hits: { total: 0, hits: [] },
      } as any);

      await smlService.search({
        query: 'viz',
        size: 10,
        spaceId: 'default',
        esClient: scopedClient,
        request,
        skipContent: true,
      });

      const call = esClient.search.mock.calls[0]![0]!;
      expect(call._source).toEqual({ excludes: ['content', 'description'] });
    });

    it('uses match_all for query "*"', async () => {
      const service = createSmlService();
      service.setup({ logger });
      const smlService = service.start({ logger });

      esClient.search.mockResolvedValue({
        hits: { total: 0, hits: [] },
      } as any);

      await smlService.search({
        query: '*',
        size: 5,
        spaceId: 'default',
        esClient: scopedClient,
        request,
      });

      const call = esClient.search.mock.calls[0]![0]! as {
        query?: { bool?: { must?: unknown[] } };
      };
      expect(call.query!.bool!.must).toEqual([{ match_all: {} }]);
    });

    it('uses match_all for empty query after trim', async () => {
      const service = createSmlService();
      service.setup({ logger });
      const smlService = service.start({ logger });

      esClient.search.mockResolvedValue({
        hits: { total: 0, hits: [] },
      } as any);

      await smlService.search({
        query: '',
        size: 5,
        spaceId: 'default',
        esClient: scopedClient,
        request,
      });

      const call = esClient.search.mock.calls[0]![0]! as {
        query?: { bool?: { must?: unknown[] } };
      };
      expect(call.query!.bool!.must).toEqual([{ match_all: {} }]);
    });

    it('maps response to SmlSearchResult', async () => {
      const service = createSmlService();
      service.setup({ logger });
      const smlService = service.start({ logger });

      esClient.search.mockResolvedValue({
        hits: {
          total: 1,
          hits: [
            {
              _source: {
                id: 'chunk-1',
                type: 'lens',
                title: 'My Viz',
                origin_id: 'ref-1',
                content: 'content text',
                description: 'A lens viz',
                user_id: 'user-1',
                references: ['lens:other:uuid'],
                created_at: '2024-01-01',
                updated_at: '2024-01-02',
                spaces: ['default'],
                permissions: ['saved_object:lens/get'],
              },
              _score: 1.5,
            },
          ],
        },
      } as any);

      const result = await smlService.search({
        query: 'viz',
        size: 10,
        spaceId: 'default',
        esClient: scopedClient,
        request,
      });

      expect(result.results).toHaveLength(1);
      expect(result.results[0]).toEqual({
        id: 'chunk-1',
        type: 'lens',
        title: 'My Viz',
        origin_id: 'ref-1',
        content: 'content text',
        description: 'A lens viz',
        user_id: 'user-1',
        references: ['lens:other:uuid'],
        created_at: '2024-01-01',
        updated_at: '2024-01-02',
        spaces: ['default'],
        permissions: ['saved_object:lens/get'],
        ingestion_method: 'crawled',
        score: 1.5,
      });
      expect(result.total).toBe(1);
    });

    it('handles total as object with value', async () => {
      const service = createSmlService();
      service.setup({ logger });
      const smlService = service.start({ logger });

      esClient.search.mockResolvedValue({
        hits: {
          total: { value: 2, relation: 'eq' },
          hits: [
            {
              _source: {
                id: 'chunk-1',
                type: 'lens',
                title: 'A',
                origin_id: 'r1',
                content: '',
                created_at: '2024-01-01',
                updated_at: '2024-01-02',
                spaces: [],
                permissions: [],
              },
              _score: 1,
            },
            {
              _source: {
                id: 'chunk-2',
                type: 'lens',
                title: 'B',
                origin_id: 'r2',
                content: '',
                created_at: '2024-01-01',
                updated_at: '2024-01-02',
                spaces: [],
                permissions: [],
              },
              _score: 1,
            },
          ],
        },
      } as any);

      const result = await smlService.search({
        query: '*',
        size: 10,
        spaceId: 'default',
        esClient: scopedClient,
        request,
      });

      expect(result.total).toBe(2);
      expect(result.results).toHaveLength(2);
    });

    it('returns empty results when index does not exist (404)', async () => {
      const service = createSmlService();
      service.setup({ logger });
      const smlService = service.start({ logger });

      esClient.search.mockRejectedValue(createNotFoundError());

      const result = await smlService.search({
        query: 'foo',
        size: 10,
        spaceId: 'default',
        esClient: scopedClient,
        request,
      });

      expect(result.results).toEqual([]);
      expect(result.total).toBe(0);
      expect(logger.debug).toHaveBeenCalledWith(
        'SML index does not exist yet — returning empty results'
      );
    });

    it('throws on non-404 errors', async () => {
      const service = createSmlService();
      service.setup({ logger });
      const smlService = service.start({ logger });

      esClient.search.mockRejectedValue(new Error('Connection refused'));

      await expect(
        smlService.search({
          query: 'foo',
          size: 10,
          spaceId: 'default',
          esClient: scopedClient,
          request,
        })
      ).rejects.toThrow('Connection refused');

      expect(logger.warn).toHaveBeenCalledWith('SML search failed: Connection refused');
    });

    it('filters results by permissions when securityAuthz is present', async () => {
      const securityAuthz = createMockSecurityAuthzPartial(
        ['saved_object:lens/get'],
        ['saved_object:dashboard/get']
      );
      const service = createSmlService();
      service.setup({ logger });
      const smlService = service.start({ logger, securityAuthz });

      esClient.search.mockResolvedValue({
        hits: {
          total: 2,
          hits: [
            {
              _source: {
                id: 'chunk-1',
                type: 'lens',
                title: 'Lens',
                origin_id: 'r1',
                content: '',
                created_at: '2024-01-01',
                updated_at: '2024-01-02',
                spaces: ['default'],
                permissions: ['saved_object:lens/get'],
              },
              _score: 1,
            },
            {
              _source: {
                id: 'chunk-2',
                type: 'dashboard',
                title: 'Dashboard',
                origin_id: 'r2',
                content: '',
                created_at: '2024-01-01',
                updated_at: '2024-01-02',
                spaces: ['default'],
                permissions: ['saved_object:dashboard/get'],
              },
              _score: 1,
            },
          ],
        },
      } as any);

      const result = await smlService.search({
        query: '*',
        size: 10,
        spaceId: 'default',
        esClient: scopedClient,
        request,
      });

      expect(result.results).toHaveLength(1);
      expect(result.results[0].id).toBe('chunk-1');
      expect(result.results[0].type).toBe('lens');
      expect(result.total).toBe(1);
    });

    it('returns all results when securityAuthz is absent', async () => {
      const service = createSmlService();
      service.setup({ logger });
      const smlService = service.start({ logger });

      esClient.search.mockResolvedValue({
        hits: {
          total: 2,
          hits: [
            {
              _source: {
                id: 'chunk-1',
                type: 'lens',
                title: 'Lens',
                origin_id: 'r1',
                content: '',
                created_at: '2024-01-01',
                updated_at: '2024-01-02',
                spaces: ['default'],
                permissions: ['saved_object:lens/get'],
              },
              _score: 1,
            },
            {
              _source: {
                id: 'chunk-2',
                type: 'dashboard',
                title: 'Dashboard',
                origin_id: 'r2',
                content: '',
                created_at: '2024-01-01',
                updated_at: '2024-01-02',
                spaces: ['default'],
                permissions: ['saved_object:dashboard/get'],
              },
              _score: 1,
            },
          ],
        },
      } as any);

      const result = await smlService.search({
        query: '*',
        size: 10,
        spaceId: 'default',
        esClient: scopedClient,
        request,
      });

      expect(result.results).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('uses default size of 10 when not specified', async () => {
      const service = createSmlService();
      service.setup({ logger });
      const smlService = service.start({ logger });

      esClient.search.mockResolvedValue({
        hits: { total: 0, hits: [] },
      } as any);

      await smlService.search({
        query: '*',
        spaceId: 'default',
        esClient: scopedClient,
        request,
      });

      expect(esClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          size: 10,
        })
      );
    });
  });

  describe('checkItemsAccess', () => {
    it('grants all access when securityAuthz is absent', async () => {
      const service = createSmlService();
      service.setup({ logger });
      const smlService = service.start({ logger });

      const result = await smlService.checkItemsAccess({
        ids: ['item-1', 'item-2'],
        spaceId: 'default',
        esClient: scopedClient,
        request,
      });

      expect(result.get('item-1')).toBe(true);
      expect(result.get('item-2')).toBe(true);
      expect(esClient.search).not.toHaveBeenCalled();
    });

    it('denies access when items not found in index', async () => {
      const securityAuthz = createMockSecurityAuthz(['saved_object:lens/get']);
      const service = createSmlService();
      service.setup({ logger });
      const smlService = service.start({ logger, securityAuthz });

      esClient.search.mockResolvedValue({
        hits: {
          total: 0,
          hits: [],
        },
      } as any);

      const result = await smlService.checkItemsAccess({
        ids: ['missing-item'],
        spaceId: 'default',
        esClient: scopedClient,
        request,
      });

      expect(result.get('missing-item')).toBe(false);
    });

    it('checks permissions correctly for authorized items', async () => {
      const securityAuthz = createMockSecurityAuthz(['saved_object:lens/get']);
      const service = createSmlService();
      service.setup({ logger });
      const smlService = service.start({ logger, securityAuthz });

      esClient.search.mockResolvedValue({
        hits: {
          total: 1,
          hits: [
            {
              _source: {
                id: 'item-1',
                permissions: ['saved_object:lens/get'],
              },
            },
          ],
        },
      } as any);

      const result = await smlService.checkItemsAccess({
        ids: ['item-1'],
        spaceId: 'default',
        esClient: scopedClient,
        request,
      });

      expect(result.get('item-1')).toBe(true);
    });

    it('checks permissions correctly for unauthorized items', async () => {
      const securityAuthz = createMockSecurityAuthzPartial([], ['saved_object:dashboard/get']);
      const service = createSmlService();
      service.setup({ logger });
      const smlService = service.start({ logger, securityAuthz });

      esClient.search.mockResolvedValue({
        hits: {
          total: 1,
          hits: [
            {
              _source: {
                id: 'item-1',
                permissions: ['saved_object:dashboard/get'],
              },
            },
          ],
        },
      } as any);

      const result = await smlService.checkItemsAccess({
        ids: ['item-1'],
        spaceId: 'default',
        esClient: scopedClient,
        request,
      });

      expect(result.get('item-1')).toBe(false);
    });

    it('grants access for items with empty permissions', async () => {
      const securityAuthz = createMockSecurityAuthz([]);
      const service = createSmlService();
      service.setup({ logger });
      const smlService = service.start({ logger, securityAuthz });

      esClient.search.mockResolvedValue({
        hits: {
          total: 1,
          hits: [
            {
              _source: {
                id: 'item-1',
                permissions: [],
              },
            },
          ],
        },
      } as any);

      const result = await smlService.checkItemsAccess({
        ids: ['item-1'],
        spaceId: 'default',
        esClient: scopedClient,
        request,
      });

      expect(result.get('item-1')).toBe(true);
    });

    it('handles 404 error by returning false for all items', async () => {
      const securityAuthz = createMockSecurityAuthz(['saved_object:lens/get']);
      const service = createSmlService();
      service.setup({ logger });
      const smlService = service.start({ logger, securityAuthz });

      esClient.search.mockRejectedValue(createNotFoundError());

      const result = await smlService.checkItemsAccess({
        ids: ['item-1', 'item-2'],
        spaceId: 'default',
        esClient: scopedClient,
        request,
      });

      expect(result.get('item-1')).toBe(false);
      expect(result.get('item-2')).toBe(false);
    });

    it('calls ES search with correct query for checkItemsAccess', async () => {
      const securityAuthz = createMockSecurityAuthz([]);
      const service = createSmlService();
      service.setup({ logger });
      const smlService = service.start({ logger, securityAuthz });

      esClient.search.mockResolvedValue({
        hits: { total: 0, hits: [] },
      } as any);

      await smlService.checkItemsAccess({
        ids: ['id-1'],
        spaceId: 'my-space',
        esClient: scopedClient,
        request,
      });

      expect(esClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          index: smlIndexName,
          size: 1,
          allow_no_indices: true,
          ignore_unavailable: true,
          query: {
            bool: {
              filter: [
                { terms: { id: ['id-1'] } },
                {
                  bool: {
                    should: [{ term: { spaces: 'my-space' } }, { term: { spaces: '*' } }],
                    minimum_should_match: 1,
                  },
                },
              ],
            },
          },
          _source: ['id', 'permissions'],
        })
      );
      expect(
        (scopedClient.asCurrentUser as jest.Mocked<ElasticsearchClient>).search
      ).not.toHaveBeenCalled();
    });
  });

  describe('getDocuments', () => {
    it('fetches documents from ES and returns Map', async () => {
      const service = createSmlService();
      service.setup({ logger });
      const smlService = service.start({ logger });

      esClient.search.mockResolvedValue({
        hits: {
          total: 2,
          hits: [
            {
              _source: {
                id: 'doc-1',
                type: 'lens',
                title: 'Doc 1',
                origin_id: 'ref-1',
                content: 'content 1',
                created_at: '2024-01-01',
                updated_at: '2024-01-02',
                spaces: ['default'],
                permissions: [],
              },
            },
            {
              _source: {
                id: 'doc-2',
                type: 'dashboard',
                title: 'Doc 2',
                origin_id: 'ref-2',
                content: 'content 2',
                description: 'dash desc',
                user_id: 'u2',
                references: ['lens:x:y'],
                created_at: '2024-01-01',
                updated_at: '2024-01-02',
                spaces: ['default'],
                permissions: [],
              },
            },
          ],
        },
      } as any);

      const result = await smlService.getDocuments({
        ids: ['doc-1', 'doc-2'],
        spaceId: 'default',
        esClient: scopedClient,
      });

      expect(result.size).toBe(2);
      expect(result.get('doc-1')).toEqual({
        id: 'doc-1',
        type: 'lens',
        title: 'Doc 1',
        origin_id: 'ref-1',
        content: 'content 1',
        created_at: '2024-01-01',
        updated_at: '2024-01-02',
        spaces: ['default'],
        permissions: [],
        ingestion_method: 'crawled',
      });
      expect(result.get('doc-2')).toEqual({
        id: 'doc-2',
        type: 'dashboard',
        title: 'Doc 2',
        origin_id: 'ref-2',
        content: 'content 2',
        description: 'dash desc',
        user_id: 'u2',
        references: ['lens:x:y'],
        created_at: '2024-01-01',
        updated_at: '2024-01-02',
        spaces: ['default'],
        permissions: [],
        ingestion_method: 'crawled',
      });
    });

    it('returns empty map for empty ids', async () => {
      const service = createSmlService();
      service.setup({ logger });
      const smlService = service.start({ logger });

      const result = await smlService.getDocuments({
        ids: [],
        spaceId: 'default',
        esClient: scopedClient,
      });

      expect(result.size).toBe(0);
      expect(esClient.search).not.toHaveBeenCalled();
    });

    it('handles 404 error gracefully', async () => {
      const service = createSmlService();
      service.setup({ logger });
      const smlService = service.start({ logger });

      esClient.search.mockRejectedValue(createNotFoundError());

      const result = await smlService.getDocuments({
        ids: ['doc-1'],
        spaceId: 'default',
        esClient: scopedClient,
      });

      expect(result.size).toBe(0);
    });

    it('handles other errors gracefully', async () => {
      const service = createSmlService();
      service.setup({ logger });
      const smlService = service.start({ logger });

      esClient.search.mockRejectedValue(new Error('Connection timeout'));

      const result = await smlService.getDocuments({
        ids: ['doc-1'],
        spaceId: 'default',
        esClient: scopedClient,
      });

      expect(result.size).toBe(0);
      expect(logger.warn).toHaveBeenCalledWith('SML getDocuments failed: Connection timeout');
    });

    it('calls ES search with correct query', async () => {
      const service = createSmlService();
      service.setup({ logger });
      const smlService = service.start({ logger });

      esClient.search.mockResolvedValue({
        hits: { total: 0, hits: [] },
      } as any);

      await smlService.getDocuments({
        ids: ['id-1', 'id-2'],
        spaceId: 'my-space',
        esClient: scopedClient,
      });

      expect(esClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          index: smlIndexName,
          size: 2,
          allow_no_indices: true,
          ignore_unavailable: true,
          query: {
            bool: {
              filter: [
                { terms: { id: ['id-1', 'id-2'] } },
                {
                  bool: {
                    should: [{ term: { spaces: 'my-space' } }, { term: { spaces: '*' } }],
                    minimum_should_match: 1,
                  },
                },
              ],
            },
          },
        })
      );
      expect(
        (scopedClient.asCurrentUser as jest.Mocked<ElasticsearchClient>).search
      ).not.toHaveBeenCalled();
    });
  });

  describe('listDocuments', () => {
    const sampleHit = {
      _source: {
        id: 'doc-1',
        type: 'lens',
        title: 'Doc 1',
        origin_id: 'ref-1',
        content: 'c',
        created_at: '2024-01-01',
        updated_at: '2024-01-02',
        spaces: ['default'],
        permissions: [],
        ingestion_method: 'crawled' as const,
      },
    };

    it('passes pagination params to ES with sorted by updated_at desc', async () => {
      const service = createSmlService();
      service.setup({ logger });
      const smlService = service.start({ logger });

      esClient.search.mockResolvedValue({
        hits: { total: 1, hits: [sampleHit] },
      } as any);

      await smlService.listDocuments({
        spaceId: 'default',
        esClient: scopedClient,
        page: 3,
        perPage: 25,
      });

      const call = esClient.search.mock.calls[0]![0]!;
      expect(call.from).toBe(50);
      expect(call.size).toBe(25);
      expect(call.sort).toEqual([{ updated_at: { order: 'desc' } }]);
    });

    it('uses default page=1 perPage=20 when not specified', async () => {
      const service = createSmlService();
      service.setup({ logger });
      const smlService = service.start({ logger });

      esClient.search.mockResolvedValue({
        hits: { total: 0, hits: [] },
      } as any);

      await smlService.listDocuments({
        spaceId: 'default',
        esClient: scopedClient,
      });

      const call = esClient.search.mock.calls[0]![0]!;
      expect(call.from).toBe(0);
      expect(call.size).toBe(20);
    });

    it('adds optional type and origin_id filters when provided', async () => {
      const service = createSmlService();
      service.setup({ logger });
      const smlService = service.start({ logger });

      esClient.search.mockResolvedValue({
        hits: { total: 0, hits: [] },
      } as any);

      await smlService.listDocuments({
        spaceId: 'default',
        esClient: scopedClient,
        type: 'dashboard',
        originId: 'dash-1',
      });

      const call = esClient.search.mock.calls[0]![0]! as {
        query?: { bool?: { filter?: unknown[] } };
      };
      const filters = call.query!.bool!.filter!;
      expect(filters).toContainEqual({ term: { type: 'dashboard' } });
      expect(filters).toContainEqual({ term: { origin_id: 'dash-1' } });
    });

    it('does not add type/origin_id filters when omitted', async () => {
      const service = createSmlService();
      service.setup({ logger });
      const smlService = service.start({ logger });

      esClient.search.mockResolvedValue({
        hits: { total: 0, hits: [] },
      } as any);

      await smlService.listDocuments({
        spaceId: 'default',
        esClient: scopedClient,
      });

      const call = esClient.search.mock.calls[0]![0]! as {
        query?: { bool?: { filter?: unknown[] } };
      };
      const filters = call.query!.bool!.filter!;
      expect(filters).toHaveLength(1); // only the space filter
    });

    it('returns empty results when index does not exist', async () => {
      const service = createSmlService();
      service.setup({ logger });
      const smlService = service.start({ logger });

      esClient.search.mockRejectedValue(createNotFoundError());

      const result = await smlService.listDocuments({
        spaceId: 'default',
        esClient: scopedClient,
      });

      expect(result).toEqual({ total: 0, results: [] });
    });

    it('maps response total and results correctly', async () => {
      const service = createSmlService();
      service.setup({ logger });
      const smlService = service.start({ logger });

      esClient.search.mockResolvedValue({
        hits: { total: { value: 1, relation: 'eq' }, hits: [sampleHit] },
      } as any);

      const result = await smlService.listDocuments({
        spaceId: 'default',
        esClient: scopedClient,
      });

      expect(result.total).toBe(1);
      expect(result.results).toEqual([sampleHit._source]);
    });

    it('throws on non-404 errors', async () => {
      const service = createSmlService();
      service.setup({ logger });
      const smlService = service.start({ logger });

      esClient.search.mockRejectedValue(new Error('Connection refused'));

      await expect(
        smlService.listDocuments({
          spaceId: 'default',
          esClient: scopedClient,
        })
      ).rejects.toThrow('Connection refused');
      expect(logger.warn).toHaveBeenCalledWith('SML listDocuments failed: Connection refused');
    });

    it('throws SmlResultWindowExceededError when ES rejects with result-window error', async () => {
      const service = createSmlService();
      service.setup({ logger });
      const smlService = service.start({ logger });

      const reason =
        'Result window is too large, from + size must be less than or equal to: [10000] but was [11000]';
      esClient.search.mockRejectedValue(
        new errors.ResponseError({
          statusCode: 400,
          body: {
            error: {
              type: 'search_phase_execution_exception',
              reason: 'all shards failed',
              root_cause: [{ type: 'illegal_argument_exception', reason }],
              caused_by: { type: 'illegal_argument_exception', reason },
            },
          },
          warnings: [],
          headers: {},
          meta: {} as any,
        })
      );

      await expect(
        smlService.listDocuments({
          spaceId: 'default',
          esClient: scopedClient,
          page: 11,
          perPage: 1000,
        })
      ).rejects.toBeInstanceOf(SmlResultWindowExceededError);
      // logger.warn is the bucket for unexpected ES failures; the typed error
      // is an expected outcome and should not log there.
      expect(logger.warn).not.toHaveBeenCalledWith(
        expect.stringContaining('SML listDocuments failed')
      );
    });

    it('does not translate unrelated 400 ES errors', async () => {
      const service = createSmlService();
      service.setup({ logger });
      const smlService = service.start({ logger });

      esClient.search.mockRejectedValue(
        new errors.ResponseError({
          statusCode: 400,
          body: {
            error: { type: 'parse_exception', reason: 'unparseable query' },
          },
          warnings: [],
          headers: {},
          meta: {} as any,
        })
      );

      await expect(
        smlService.listDocuments({
          spaceId: 'default',
          esClient: scopedClient,
        })
      ).rejects.not.toBeInstanceOf(SmlResultWindowExceededError);
    });
  });

  describe('upsertDocument', () => {
    let smlClient: { get: jest.Mock; index: jest.Mock; delete: jest.Mock };

    beforeEach(() => {
      smlClient = {
        get: jest.fn(),
        index: jest.fn().mockResolvedValue({}),
        delete: jest.fn(),
      };
      (createSmlStorage as jest.Mock).mockReturnValue({
        getClient: () => smlClient,
      });
    });

    it('creates a new document with spaces=[spaceId] and equal timestamps when none exists (404)', async () => {
      smlClient.get.mockRejectedValue(createNotFoundError());

      const service = createSmlService();
      service.setup({ logger });
      const smlService = service.start({ logger });

      const result = await smlService.upsertDocument({
        id: 'doc-1',
        spaceId: 'default',
        document: {
          type: 'lens',
          title: 'New Doc',
          origin_id: 'ref-1',
          content: 'c',
        },
        esClient: scopedClient,
      });

      expect(result).not.toBeNull();
      expect(result!.created).toBe(true);
      expect(result!.document.id).toBe('doc-1');
      expect(result!.document.spaces).toEqual(['default']);
      expect(result!.document.created_at).toBeDefined();
      expect(result!.document.created_at).toBe(result!.document.updated_at);
      expect(result!.document.permissions).toEqual([]);
      expect(smlClient.index).toHaveBeenCalledWith({
        id: 'doc-1',
        document: result!.document,
      });
    });

    it('updates an existing document, preserving created_at and spaces', async () => {
      smlClient.get.mockResolvedValue({
        found: true,
        _source: {
          id: 'doc-1',
          type: 'lens',
          title: 'Old',
          origin_id: 'ref-1',
          content: 'old',
          created_at: '2023-01-01T00:00:00.000Z',
          updated_at: '2023-06-01T00:00:00.000Z',
          spaces: ['default', 'engineering'],
          permissions: [],
        },
      });

      const service = createSmlService();
      service.setup({ logger });
      const smlService = service.start({ logger });

      const result = await smlService.upsertDocument({
        id: 'doc-1',
        spaceId: 'default',
        document: {
          type: 'lens',
          title: 'New',
          origin_id: 'ref-1',
          content: 'new',
          permissions: ['saved_object:lens/get'],
        },
        esClient: scopedClient,
      });

      expect(result).not.toBeNull();
      expect(result!.created).toBe(false);
      expect(result!.document.created_at).toBe('2023-01-01T00:00:00.000Z');
      expect(result!.document.updated_at).not.toBe('2023-06-01T00:00:00.000Z');
      expect(result!.document.title).toBe('New');
      expect(result!.document.permissions).toEqual(['saved_object:lens/get']);
      // existing spaces are preserved — caller cannot widen or narrow membership
      expect(result!.document.spaces).toEqual(['default', 'engineering']);
    });

    it('returns null when an existing document is not visible in the caller space', async () => {
      smlClient.get.mockResolvedValue({
        found: true,
        _source: {
          id: 'doc-1',
          type: 'lens',
          title: 'Old',
          origin_id: 'ref-1',
          content: 'old',
          created_at: '2023-01-01T00:00:00.000Z',
          updated_at: '2023-06-01T00:00:00.000Z',
          spaces: ['other-space'],
          permissions: [],
        },
      });

      const service = createSmlService();
      service.setup({ logger });
      const smlService = service.start({ logger });

      const result = await smlService.upsertDocument({
        id: 'doc-1',
        spaceId: 'default',
        document: {
          type: 'lens',
          title: 'New',
          origin_id: 'ref-1',
          content: 'new',
        },
        esClient: scopedClient,
      });

      expect(result).toBeNull();
      expect(smlClient.index).not.toHaveBeenCalled();
    });

    it('treats spaces=["*"] as visible in any caller space', async () => {
      smlClient.get.mockResolvedValue({
        found: true,
        _source: {
          id: 'doc-1',
          type: 'lens',
          title: 'Old',
          origin_id: 'ref-1',
          content: 'old',
          created_at: '2023-01-01T00:00:00.000Z',
          updated_at: '2023-06-01T00:00:00.000Z',
          spaces: ['*'],
          permissions: [],
        },
      });

      const service = createSmlService();
      service.setup({ logger });
      const smlService = service.start({ logger });

      const result = await smlService.upsertDocument({
        id: 'doc-1',
        spaceId: 'default',
        document: {
          type: 'lens',
          title: 'New',
          origin_id: 'ref-1',
          content: 'new',
        },
        esClient: scopedClient,
      });

      expect(result).not.toBeNull();
      expect(result!.created).toBe(false);
      expect(result!.document.spaces).toEqual(['*']);
    });

    it('throws when storage lookup fails with non-404', async () => {
      smlClient.get.mockRejectedValue(new Error('boom'));

      const service = createSmlService();
      service.setup({ logger });
      const smlService = service.start({ logger });

      await expect(
        smlService.upsertDocument({
          id: 'doc-1',
          spaceId: 'default',
          document: {
            type: 'lens',
            title: 'x',
            origin_id: 'ref-1',
            content: 'c',
          },
          esClient: scopedClient,
        })
      ).rejects.toThrow('boom');
      expect(smlClient.index).not.toHaveBeenCalled();
    });

    it("tags the written document with ingestion_method='manual'", async () => {
      smlClient.get.mockRejectedValue(createNotFoundError());

      const service = createSmlService();
      service.setup({ logger });
      const smlService = service.start({ logger });

      const result = await smlService.upsertDocument({
        id: 'doc-manual',
        spaceId: 'default',
        document: {
          type: 'lens',
          title: 'Manual Doc',
          origin_id: 'ref-manual',
          content: 'c',
        },
        esClient: scopedClient,
      });

      expect(result).not.toBeNull();
      expect(result!.document.ingestion_method).toBe('manual');
      expect(smlClient.index).toHaveBeenCalledWith({
        id: 'doc-manual',
        document: expect.objectContaining({ ingestion_method: 'manual' }),
      });
    });

    it('deletes stale crawled chunks for the same origin after a manual upsert', async () => {
      smlClient.get.mockRejectedValue(createNotFoundError());

      const service = createSmlService();
      service.setup({ logger });
      const smlService = service.start({ logger });

      await smlService.upsertDocument({
        id: 'doc-manual',
        spaceId: 'default',
        document: {
          type: 'lens',
          title: 'Manual Doc',
          origin_id: 'ref-manual',
          content: 'c',
        },
        esClient: scopedClient,
      });

      // After writing the manual chunk, the upsert should wipe any chunks for the same
      // origin that carry ingestion_method=crawled, so search/list reflect the curator's
      // intent immediately and stale crawled output doesn't linger forever (the crawler
      // would otherwise skip this origin because of the manual entry).
      expect(esClient.deleteByQuery).toHaveBeenCalledWith({
        index: smlIndexName,
        ignore_unavailable: true,
        allow_no_indices: true,
        query: {
          bool: {
            filter: [
              { term: { origin_id: 'ref-manual' } },
              { term: { ingestion_method: 'crawled' } },
            ],
          },
        },
        refresh: false,
      });
    });
  });

  describe('deleteDocument', () => {
    let smlClient: { get: jest.Mock; index: jest.Mock; delete: jest.Mock };

    beforeEach(() => {
      smlClient = {
        get: jest.fn(),
        index: jest.fn(),
        delete: jest.fn(),
      };
      (createSmlStorage as jest.Mock).mockReturnValue({
        getClient: () => smlClient,
      });
    });

    it('returns false when no document exists in the requested space', async () => {
      esClient.search.mockResolvedValue({ hits: { total: 0, hits: [] } } as any);

      const service = createSmlService();
      service.setup({ logger });
      const smlService = service.start({ logger });

      const result = await smlService.deleteDocument({
        id: 'missing',
        spaceId: 'default',
        esClient: scopedClient,
      });

      expect(result).toBe(false);
      expect(smlClient.delete).not.toHaveBeenCalled();
    });

    it('returns true when the document is deleted', async () => {
      esClient.search.mockResolvedValue({
        hits: {
          total: 1,
          hits: [
            {
              _source: {
                id: 'doc-1',
                type: 'lens',
                title: 'A',
                origin_id: 'ref-1',
                content: '',
                created_at: '2024-01-01',
                updated_at: '2024-01-02',
                spaces: ['default'],
                permissions: [],
              },
            },
          ],
        },
      } as any);
      smlClient.delete.mockResolvedValue({ acknowledged: true, result: 'deleted' });

      const service = createSmlService();
      service.setup({ logger });
      const smlService = service.start({ logger });

      const result = await smlService.deleteDocument({
        id: 'doc-1',
        spaceId: 'default',
        esClient: scopedClient,
      });

      expect(result).toBe(true);
      expect(smlClient.delete).toHaveBeenCalledWith({ id: 'doc-1' });
    });

    it('returns false when the storage delete reports not_found', async () => {
      esClient.search.mockResolvedValue({
        hits: {
          total: 1,
          hits: [
            {
              _source: {
                id: 'doc-1',
                type: 'lens',
                title: 'A',
                origin_id: 'ref-1',
                content: '',
                created_at: '2024-01-01',
                updated_at: '2024-01-02',
                spaces: ['default'],
                permissions: [],
              },
            },
          ],
        },
      } as any);
      smlClient.delete.mockResolvedValue({ acknowledged: true, result: 'not_found' });

      const service = createSmlService();
      service.setup({ logger });
      const smlService = service.start({ logger });

      const result = await smlService.deleteDocument({
        id: 'doc-1',
        spaceId: 'default',
        esClient: scopedClient,
      });

      expect(result).toBe(false);
    });

    it('returns false on a 404 from storage delete', async () => {
      esClient.search.mockResolvedValue({
        hits: {
          total: 1,
          hits: [
            {
              _source: {
                id: 'doc-1',
                type: 'lens',
                title: 'A',
                origin_id: 'ref-1',
                content: '',
                created_at: '2024-01-01',
                updated_at: '2024-01-02',
                spaces: ['default'],
                permissions: [],
              },
            },
          ],
        },
      } as any);
      smlClient.delete.mockRejectedValue(createNotFoundError());

      const service = createSmlService();
      service.setup({ logger });
      const smlService = service.start({ logger });

      const result = await smlService.deleteDocument({
        id: 'doc-1',
        spaceId: 'default',
        esClient: scopedClient,
      });

      expect(result).toBe(false);
    });

    it('throws on non-404 errors from storage delete', async () => {
      esClient.search.mockResolvedValue({
        hits: {
          total: 1,
          hits: [
            {
              _source: {
                id: 'doc-1',
                type: 'lens',
                title: 'A',
                origin_id: 'ref-1',
                content: '',
                created_at: '2024-01-01',
                updated_at: '2024-01-02',
                spaces: ['default'],
                permissions: [],
              },
            },
          ],
        },
      } as any);
      smlClient.delete.mockRejectedValue(new Error('boom'));

      const service = createSmlService();
      service.setup({ logger });
      const smlService = service.start({ logger });

      await expect(
        smlService.deleteDocument({
          id: 'doc-1',
          spaceId: 'default',
          esClient: scopedClient,
        })
      ).rejects.toThrow('boom');
      expect(logger.warn).toHaveBeenCalledWith('SML deleteDocument failed: boom');
    });
  });
});
