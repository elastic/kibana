/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { loggerMock } from '@kbn/logging-mocks';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { AuthorizationServiceSetup } from '@kbn/security-plugin-types-server';
import { createSmlService, isNotFoundError } from './sml_service';
import { smlIndexName } from './sml_storage';
import * as smlStorageModule from './sml_storage';
import type { SmlTypeDefinition } from './types';

const createMockEsClient = (): jest.Mocked<ElasticsearchClient> =>
  ({
    search: jest.fn(),
    count: jest.fn(),
  } as unknown as jest.Mocked<ElasticsearchClient>);

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
  let logger: ReturnType<typeof createMockLogger>;
  let request: KibanaRequest;

  beforeEach(() => {
    esClient = createMockEsClient();
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
        esClient,
        request,
      });

      expect(esClient.search).toHaveBeenCalledTimes(1);
      const call = esClient.search.mock.calls[0]![0]!;
      expect(call.index).toBe(smlIndexName);
      expect(call.size).toBe(10);
      expect(call.allow_no_indices).toBe(true);
      expect(call.ignore_unavailable).toBe(true);
      expect(call.query).toEqual({
        bool: {
          must: [
            {
              multi_match: {
                query: 'foo bar',
                type: 'bool_prefix',
                fields: saytBoolPrefixFields,
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
        esClient,
        request,
        skipContent: true,
      });

      const call = esClient.search.mock.calls[0]![0]!;
      expect(call._source).toEqual({ excludes: ['content'] });
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
        esClient,
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
        esClient,
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
        esClient,
        request,
      });

      expect(result.results).toHaveLength(1);
      expect(result.results[0]).toEqual({
        id: 'chunk-1',
        type: 'lens',
        title: 'My Viz',
        origin_id: 'ref-1',
        content: 'content text',
        created_at: '2024-01-01',
        updated_at: '2024-01-02',
        spaces: ['default'],
        permissions: ['saved_object:lens/get'],
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
                created_at: '',
                updated_at: '',
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
                created_at: '',
                updated_at: '',
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
        esClient,
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
        esClient,
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
          esClient,
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
                created_at: '',
                updated_at: '',
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
                created_at: '',
                updated_at: '',
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
        esClient,
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
                created_at: '',
                updated_at: '',
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
                created_at: '',
                updated_at: '',
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
        esClient,
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
        esClient,
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
        esClient,
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
        esClient,
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
        esClient,
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
        esClient,
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
        esClient,
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
        esClient,
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
        esClient,
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
        esClient,
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
      });
      expect(result.get('doc-2')).toEqual({
        id: 'doc-2',
        type: 'dashboard',
        title: 'Doc 2',
        origin_id: 'ref-2',
        content: 'content 2',
        created_at: '2024-01-01',
        updated_at: '2024-01-02',
        spaces: ['default'],
        permissions: [],
      });
    });

    it('returns empty map for empty ids', async () => {
      const service = createSmlService();
      service.setup({ logger });
      const smlService = service.start({ logger });

      const result = await smlService.getDocuments({
        ids: [],
        spaceId: 'default',
        esClient,
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
        esClient,
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
        esClient,
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
        esClient,
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
    });
  });

  describe('getRecord', () => {
    it('returns the record when found', async () => {
      const service = createSmlService();
      service.setup({ logger });
      const smlService = service.start({ logger });

      esClient.search.mockResolvedValue({
        hits: {
          hits: [
            {
              _source: {
                id: 'rec-1',
                type: 'index',
                title: 'My Index',
                origin_id: 'projects',
                content: 'Index summary',
                created_at: '2026-01-01T00:00:00.000Z',
                updated_at: '2026-01-01T00:00:00.000Z',
                spaces: ['*'],
                permissions: [],
                tags: ['saas'],
                user_defined: true,
              },
            },
          ],
        },
      } as any);

      const result = await smlService.getRecord({ id: 'rec-1', esClient });

      expect(result.id).toBe('rec-1');
      expect(result.type).toBe('index');
      expect(result.tags).toEqual(['saas']);
      expect(result.user_defined).toBe(true);
    });

    it('throws 404 when record is not found', async () => {
      const service = createSmlService();
      service.setup({ logger });
      const smlService = service.start({ logger });

      esClient.search.mockResolvedValue({
        hits: { hits: [] },
      } as any);

      await expect(smlService.getRecord({ id: 'nonexistent', esClient })).rejects.toThrow(
        'SML record nonexistent not found'
      );
    });

    it('throws 404 when index does not exist', async () => {
      const service = createSmlService();
      service.setup({ logger });
      const smlService = service.start({ logger });

      esClient.search.mockRejectedValue(createNotFoundError());

      await expect(smlService.getRecord({ id: 'rec-1', esClient })).rejects.toThrow(
        'SML record rec-1 not found'
      );
    });
  });

  describe('deleteRecord', () => {
    const mockStorageDelete = jest.fn();
    const mockStorageGet = jest.fn();

    beforeEach(() => {
      jest.clearAllMocks();
      jest.spyOn(smlStorageModule, 'createSmlStorage').mockReturnValue({
        getClient: () =>
          ({
            delete: mockStorageDelete,
            get: mockStorageGet,
          } as any),
      } as any);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('returns true when record is deleted', async () => {
      const service = createSmlService();
      service.setup({ logger });
      const smlService = service.start({ logger });

      mockStorageDelete.mockResolvedValue({ result: 'deleted' });

      const result = await smlService.deleteRecord({ id: 'rec-1', esClient });

      expect(result).toBe(true);
      expect(mockStorageDelete).toHaveBeenCalledWith({ id: 'rec-1' });
    });

    it('throws 404 when record does not exist', async () => {
      const service = createSmlService();
      service.setup({ logger });
      const smlService = service.start({ logger });

      mockStorageDelete.mockRejectedValue(createNotFoundError());

      await expect(smlService.deleteRecord({ id: 'nonexistent', esClient })).rejects.toThrow(
        'SML record nonexistent not found'
      );
    });
  });

  describe('createOrUpdateRecord', () => {
    const mockStorageIndex = jest.fn();
    const mockStorageGet = jest.fn();

    beforeEach(() => {
      jest.clearAllMocks();
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-04-01T00:00:00.000Z'));
      jest.spyOn(smlStorageModule, 'createSmlStorage').mockReturnValue({
        getClient: () =>
          ({
            index: mockStorageIndex,
            get: mockStorageGet,
          } as any),
      } as any);
    });

    afterEach(() => {
      jest.useRealTimers();
      jest.restoreAllMocks();
    });

    it('creates a new record with user_defined=true', async () => {
      const service = createSmlService();
      service.setup({ logger });
      const smlService = service.start({ logger });

      mockStorageGet.mockRejectedValue(createNotFoundError());
      mockStorageIndex.mockResolvedValue({ result: 'created' });

      const result = await smlService.createOrUpdateRecord({
        id: 'rec-1',
        document: {
          type: 'index',
          title: 'My Index',
          origin_id: 'projects',
          content: 'Index summary',
          spaces: ['*'],
          tags: ['saas'],
        },
        esClient,
      });

      expect(result.id).toBe('rec-1');
      expect(result.user_defined).toBe(true);
      expect(result.semantic_title).toBe('My Index');
      expect(result.semantic_content).toBe('Index summary');
      expect(result.tags).toEqual(['saas']);
      expect(result.created_at).toBe('2026-04-01T00:00:00.000Z');
      expect(result.updated_at).toBe('2026-04-01T00:00:00.000Z');
      expect(result.permissions).toEqual([]);
    });

    it('preserves created_at when updating existing record', async () => {
      const service = createSmlService();
      service.setup({ logger });
      const smlService = service.start({ logger });

      mockStorageGet.mockResolvedValue({
        _source: { created_at: '2026-01-01T00:00:00.000Z' },
      });
      mockStorageIndex.mockResolvedValue({ result: 'updated' });

      const result = await smlService.createOrUpdateRecord({
        id: 'rec-1',
        document: {
          type: 'index',
          title: 'Updated Title',
          origin_id: 'projects',
          content: 'Updated content',
          spaces: ['*'],
        },
        esClient,
      });

      expect(result.created_at).toBe('2026-01-01T00:00:00.000Z');
      expect(result.updated_at).toBe('2026-04-01T00:00:00.000Z');
      expect(result.title).toBe('Updated Title');
    });
  });
});
