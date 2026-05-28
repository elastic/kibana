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
  } as unknown as jest.Mocked<ElasticsearchClient>);

const createMockScopedClient = (
  internalUser: jest.Mocked<ElasticsearchClient>
): IScopedClusterClient => {
  return {
    asInternalUser: internalUser,
    asCurrentUser: createMockEsClient(),
  } as unknown as IScopedClusterClient;
};

const createMockLogger = () => {
  const log = loggerMock.create();
  log.get = jest.fn().mockReturnValue(log);
  return log;
};

/**
 * Build a `checkPrivileges` mock that handles both `kibana` and
 * `elasticsearch.index` inputs (mirroring Kibana's real wrapper which
 * bundles both into a single `_has_privileges` POST).
 */
const buildCheckPrivilegesMock = (authorizedKibana: Set<string>, authorizedIndices: Set<string>) =>
  jest
    .fn()
    .mockImplementation(
      async (req: { kibana?: string[]; elasticsearch?: { index?: Record<string, string[]> } }) => ({
        privileges: {
          kibana: (req.kibana ?? []).map((privilege) => ({
            privilege,
            authorized: authorizedKibana.has(privilege),
          })),
          elasticsearch: {
            cluster: [],
            index: Object.fromEntries(
              Object.entries(req.elasticsearch?.index ?? {}).map(([name, perms]) => [
                name,
                perms.map((privilege) => ({
                  privilege,
                  authorized: privilege === 'read' && authorizedIndices.has(name),
                })),
              ])
            ),
          },
        },
      })
    );

const createMockSecurityAuthz = (
  authorizedPrivileges: string[],
  authorizedIndices: string[] = []
): AuthorizationServiceSetup => {
  const checkPrivileges = buildCheckPrivilegesMock(
    new Set(authorizedPrivileges),
    new Set(authorizedIndices)
  );
  return {
    checkPrivilegesDynamicallyWithRequest: jest.fn().mockReturnValue(checkPrivileges),
  } as unknown as AuthorizationServiceSetup;
};

const createMockSecurityAuthzPartial = (
  authorized: string[],
  unauthorized: string[]
): AuthorizationServiceSetup => {
  // `unauthorized` is retained as a documentation aid for the test author —
  // the mock simply treats any privilege not in `authorized` as denied.
  void unauthorized;
  const checkPrivileges = buildCheckPrivilegesMock(new Set(authorized), new Set());
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

/**
 * Build a fully-shaped `permissions` object for fixtures and assertions.
 * Both inner arrays are always present; pass `[]` (the default) for
 * "no privileges of this kind".
 */
const makePermissions = (kibanaPrivs: string[] = [], esIndices: string[] = []) => ({
  kibana: { privileges: kibanaPrivs.map((name) => ({ name })) },
  elasticsearch: { indices: esIndices.map((name) => ({ name })) },
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
                permissions: makePermissions(['saved_object:lens/get']),
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
        permissions: makePermissions(['saved_object:lens/get']),
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
                permissions: makePermissions(),
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
                permissions: makePermissions(),
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
                created_at: '',
                updated_at: '',
                spaces: ['default'],
                permissions: makePermissions(['saved_object:lens/get']),
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
                permissions: makePermissions(['saved_object:dashboard/get']),
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
                created_at: '',
                updated_at: '',
                spaces: ['default'],
                permissions: makePermissions(['saved_object:lens/get']),
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
                permissions: makePermissions(['saved_object:dashboard/get']),
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

    describe('elasticsearch.indices post-filter (combined checkPrivileges all-of)', () => {
      const makeHit = (overrides: { id?: string; indices?: string[] } = {}) => ({
        _source: {
          id: overrides.id ?? 'chunk-x',
          type: 'lens',
          title: 'Viz',
          origin_id: 'r1',
          content: '',
          created_at: '',
          updated_at: '',
          spaces: ['default'],
          permissions: makePermissions(['saved_object:lens/get'], overrides.indices ?? []),
        },
        _score: 1,
      });

      it('keeps chunks whose elasticsearch.indices are all read-authorized', async () => {
        const securityAuthz = createMockSecurityAuthz(['saved_object:lens/get'], ['logs-2024']);
        const service = createSmlService();
        service.setup({ logger });
        const smlService = service.start({ logger, securityAuthz });

        esClient.search.mockResolvedValueOnce({
          hits: {
            total: 1,
            hits: [makeHit({ id: 'ok-chunk', indices: ['logs-2024'] })],
          },
        } as any);

        const result = await smlService.search({
          query: '*',
          size: 10,
          spaceId: 'default',
          esClient: scopedClient,
          request,
        });

        expect(result.results.map((r) => r.id)).toEqual(['ok-chunk']);
        const checkPrivileges = (securityAuthz.checkPrivilegesDynamicallyWithRequest as jest.Mock)
          .mock.results[0].value as jest.Mock;
        expect(checkPrivileges).toHaveBeenCalledWith(
          expect.objectContaining({
            elasticsearch: { cluster: [], index: { 'logs-2024': ['read'] } },
          })
        );
      });

      it('drops a chunk when the user lacks read on ANY of its elasticsearch.indices (all-of rule)', async () => {
        const securityAuthz = createMockSecurityAuthz(['saved_object:lens/get'], ['logs-2024']);
        const service = createSmlService();
        service.setup({ logger });
        const smlService = service.start({ logger, securityAuthz });

        esClient.search.mockResolvedValueOnce({
          hits: {
            total: 2,
            hits: [
              makeHit({ id: 'single-ok', indices: ['logs-2024'] }),
              makeHit({
                id: 'multi-partial',
                indices: ['logs-2024', 'super-secret'],
              }),
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

        expect(result.results.map((r) => r.id)).toEqual(['single-ok']);
        expect(result.total).toBe(1);
      });

      it('chunks with empty elasticsearch.indices pass regardless of index privileges', async () => {
        const securityAuthz = createMockSecurityAuthz(['saved_object:lens/get']);
        const service = createSmlService();
        service.setup({ logger });
        const smlService = service.start({ logger, securityAuthz });

        esClient.search.mockResolvedValueOnce({
          hits: {
            total: 1,
            hits: [makeHit({ id: 'no-deps' })],
          },
        } as any);

        const result = await smlService.search({
          query: '*',
          size: 10,
          spaceId: 'default',
          esClient: scopedClient,
          request,
        });

        expect(result.results.map((r) => r.id)).toEqual(['no-deps']);
        // When no chunk in the page lists indices, the combined check is invoked
        // only for the kibana privileges — no `elasticsearch.index` payload.
        const checkPrivileges = (securityAuthz.checkPrivilegesDynamicallyWithRequest as jest.Mock)
          .mock.results[0].value as jest.Mock;
        const lastCall = checkPrivileges.mock.calls[0]?.[0] as
          | {
              elasticsearch?: unknown;
            }
          | undefined;
        expect(lastCall?.elasticsearch).toBeUndefined();
      });

      it('fails closed when checkPrivileges throws — drops every chunk with elasticsearch.indices', async () => {
        const securityAuthz = createMockSecurityAuthz(['saved_object:lens/get'], ['logs-2024']);
        const service = createSmlService();
        service.setup({ logger });
        const smlService = service.start({ logger, securityAuthz });

        esClient.search.mockResolvedValueOnce({
          hits: {
            total: 2,
            hits: [
              makeHit({ id: 'no-deps' }),
              makeHit({ id: 'with-deps', indices: ['logs-2024'] }),
            ],
          },
        } as any);
        // Grab the inner mock returned by the curried setup, regardless of
        // whether it has been invoked yet (mockReturnValue always returns
        // the same instance).
        const checkPrivileges = (
          securityAuthz.checkPrivilegesDynamicallyWithRequest as jest.Mock
        )() as jest.Mock;
        checkPrivileges.mockRejectedValueOnce(new Error('cluster unreachable'));

        const result = await smlService.search({
          query: '*',
          size: 10,
          spaceId: 'default',
          esClient: scopedClient,
          request,
        });

        // Failing closed drops every chunk (including no-deps) because the
        // combined check covered both kibana + index gates in a single call,
        // and neither permission set is granted on error.
        expect(result.results.map((r) => r.id)).toEqual([]);
      });

      it('batches the checkPrivileges call across all distinct elasticsearch.indices in the page', async () => {
        const securityAuthz = createMockSecurityAuthz(
          ['saved_object:lens/get'],
          ['logs-2024', 'metrics']
        );
        const service = createSmlService();
        service.setup({ logger });
        const smlService = service.start({ logger, securityAuthz });

        esClient.search.mockResolvedValueOnce({
          hits: {
            total: 3,
            hits: [
              makeHit({ id: 'a', indices: ['logs-2024'] }),
              makeHit({ id: 'b', indices: ['logs-2024', 'metrics'] }),
              makeHit({ id: 'c', indices: ['metrics'] }),
            ],
          },
        } as any);

        await smlService.search({
          query: '*',
          size: 10,
          spaceId: 'default',
          esClient: scopedClient,
          request,
        });

        const checkPrivileges = (securityAuthz.checkPrivilegesDynamicallyWithRequest as jest.Mock)
          .mock.results[0].value as jest.Mock;
        expect(checkPrivileges).toHaveBeenCalledTimes(1);
        const call = checkPrivileges.mock.calls[0][0] as {
          kibana?: string[];
          elasticsearch?: { index: Record<string, string[]> };
        };
        expect(call.kibana).toEqual(['saved_object:lens/get']);
        expect(call.elasticsearch).toBeDefined();
        const indexEntries = Object.entries(call.elasticsearch!.index);
        expect(indexEntries).toHaveLength(2);
        for (const [, perms] of indexEntries) {
          expect(perms).toEqual(['read']);
        }
        expect(new Set(Object.keys(call.elasticsearch!.index))).toEqual(
          new Set(['logs-2024', 'metrics'])
        );
      });
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
                permissions: makePermissions(['saved_object:lens/get']),
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
                permissions: makePermissions(['saved_object:dashboard/get']),
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
                permissions: makePermissions(),
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

    describe('elasticsearch.indices post-filter (combined checkPrivileges all-of)', () => {
      const makeHit = (
        overrides: {
          id?: string;
          indices?: string[];
          kbnPrivs?: string[];
        } = {}
      ) => ({
        _source: {
          id: overrides.id ?? 'id-x',
          permissions: makePermissions(
            overrides.kbnPrivs ?? ['saved_object:lens/get'],
            overrides.indices ?? []
          ),
        },
      });

      it('grants access when all elasticsearch.indices are read-authorized', async () => {
        const securityAuthz = createMockSecurityAuthz(['saved_object:lens/get'], ['logs-2024']);
        const service = createSmlService();
        service.setup({ logger });
        const smlService = service.start({ logger, securityAuthz });

        esClient.search.mockResolvedValueOnce({
          hits: {
            total: 1,
            hits: [makeHit({ id: 'id-1', indices: ['logs-2024'] })],
          },
        } as any);

        const result = await smlService.checkItemsAccess({
          ids: ['id-1'],
          spaceId: 'default',
          esClient: scopedClient,
          request,
        });

        expect(result.get('id-1')).toBe(true);
        const checkPrivileges = (securityAuthz.checkPrivilegesDynamicallyWithRequest as jest.Mock)
          .mock.results[0].value as jest.Mock;
        expect(checkPrivileges).toHaveBeenCalledWith(
          expect.objectContaining({
            elasticsearch: { cluster: [], index: { 'logs-2024': ['read'] } },
          })
        );
      });

      it('denies access when the user lacks read on ANY elasticsearch.indices value', async () => {
        const securityAuthz = createMockSecurityAuthz(['saved_object:lens/get'], ['logs-2024']);
        const service = createSmlService();
        service.setup({ logger });
        const smlService = service.start({ logger, securityAuthz });

        esClient.search.mockResolvedValueOnce({
          hits: {
            total: 1,
            hits: [
              makeHit({
                id: 'id-1',
                indices: ['logs-2024', 'super-secret'],
              }),
            ],
          },
        } as any);

        const result = await smlService.checkItemsAccess({
          ids: ['id-1'],
          spaceId: 'default',
          esClient: scopedClient,
          request,
        });

        expect(result.get('id-1')).toBe(false);
      });

      it('grants access for items with kibana privileges OK and no elasticsearch.indices', async () => {
        const securityAuthz = createMockSecurityAuthz(['saved_object:lens/get']);
        const service = createSmlService();
        service.setup({ logger });
        const smlService = service.start({ logger, securityAuthz });

        esClient.search.mockResolvedValueOnce({
          hits: {
            total: 1,
            hits: [makeHit({ id: 'id-1' })],
          },
        } as any);

        const result = await smlService.checkItemsAccess({
          ids: ['id-1'],
          spaceId: 'default',
          esClient: scopedClient,
          request,
        });

        expect(result.get('id-1')).toBe(true);
        const checkPrivileges = (securityAuthz.checkPrivilegesDynamicallyWithRequest as jest.Mock)
          .mock.results[0].value as jest.Mock;
        const lastCall = checkPrivileges.mock.calls[0]?.[0] as
          | {
              elasticsearch?: unknown;
            }
          | undefined;
        expect(lastCall?.elasticsearch).toBeUndefined();
      });

      it('fails closed when checkPrivileges throws — denies items with deps, keeps trivial items', async () => {
        const securityAuthz = createMockSecurityAuthz(['saved_object:lens/get'], ['logs-2024']);
        const service = createSmlService();
        service.setup({ logger });
        const smlService = service.start({ logger, securityAuthz });

        esClient.search.mockResolvedValueOnce({
          hits: {
            total: 2,
            hits: [
              // Truly trivial item — no kibana privs and no indices —
              // passes both per-item checks regardless of authz state.
              makeHit({ id: 'trivial', kbnPrivs: [], indices: [] }),
              makeHit({ id: 'with-deps', indices: ['logs-2024'] }),
            ],
          },
        } as any);
        const checkPrivileges = (
          securityAuthz.checkPrivilegesDynamicallyWithRequest as jest.Mock
        )() as jest.Mock;
        checkPrivileges.mockRejectedValueOnce(new Error('cluster unreachable'));

        const result = await smlService.checkItemsAccess({
          ids: ['trivial', 'with-deps'],
          spaceId: 'default',
          esClient: scopedClient,
          request,
        });

        expect(result.get('trivial')).toBe(true);
        expect(result.get('with-deps')).toBe(false);
      });
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
                permissions: makePermissions(),
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
                permissions: makePermissions(),
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
        permissions: makePermissions(),
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
        permissions: makePermissions(),
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
        permissions: makePermissions(),
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
      expect(result!.document.permissions).toEqual(makePermissions());
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
          permissions: makePermissions(),
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
          permissions: makePermissions(['saved_object:lens/get']),
        },
        esClient: scopedClient,
      });

      expect(result).not.toBeNull();
      expect(result!.created).toBe(false);
      expect(result!.document.created_at).toBe('2023-01-01T00:00:00.000Z');
      expect(result!.document.updated_at).not.toBe('2023-06-01T00:00:00.000Z');
      expect(result!.document.title).toBe('New');
      expect(result!.document.permissions).toEqual(makePermissions(['saved_object:lens/get']));
      // existing spaces are preserved — caller cannot widen or narrow membership
      expect(result!.document.spaces).toEqual(['default', 'engineering']);
    });

    it('persists permissions.elasticsearch.indices when caller supplies concrete names', async () => {
      smlClient.get.mockRejectedValue(createNotFoundError());

      const service = createSmlService();
      service.setup({ logger });
      const smlService = service.start({ logger });

      const result = await smlService.upsertDocument({
        id: 'doc-1',
        spaceId: 'default',
        document: {
          type: 'visualization',
          title: 'Viz',
          origin_id: 'ref-1',
          content: 'c',
          permissions: makePermissions([], ['logs-app-*', 'metrics-prod']),
        },
        esClient: scopedClient,
      });

      expect(result).not.toBeNull();
      expect(result!.document.permissions).toEqual(
        makePermissions([], ['logs-app-*', 'metrics-prod'])
      );
      expect(smlClient.index).toHaveBeenCalledWith({
        id: 'doc-1',
        document: expect.objectContaining({
          permissions: makePermissions([], ['logs-app-*', 'metrics-prod']),
        }),
      });
    });

    it('normalizes permissions to empty inner arrays when input omits them', async () => {
      smlClient.get.mockRejectedValue(createNotFoundError());

      const service = createSmlService();
      service.setup({ logger });
      const smlService = service.start({ logger });

      // Permissions absent on input → stored as `{ kibana: { privileges: [] }, elasticsearch: { indices: [] } }`.
      const undefinedResult = await smlService.upsertDocument({
        id: 'doc-1',
        spaceId: 'default',
        document: {
          type: 'visualization',
          title: 'Viz',
          origin_id: 'ref-1',
          content: 'c',
        },
        esClient: scopedClient,
      });
      expect(undefinedResult!.document.permissions).toEqual(makePermissions());
      expect(smlClient.index).toHaveBeenLastCalledWith({
        id: 'doc-1',
        document: expect.objectContaining({ permissions: makePermissions() }),
      });

      // Explicit `permissions: undefined` and partial inputs both collapse to the
      // empty-but-fully-shaped default.
      const emptyResult = await smlService.upsertDocument({
        id: 'doc-2',
        spaceId: 'default',
        document: {
          type: 'visualization',
          title: 'Viz',
          origin_id: 'ref-2',
          content: 'c',
          permissions: makePermissions(),
        },
        esClient: scopedClient,
      });
      expect(emptyResult!.document.permissions).toEqual(makePermissions());
      expect(smlClient.index).toHaveBeenLastCalledWith({
        id: 'doc-2',
        document: expect.objectContaining({ permissions: makePermissions() }),
      });
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
          permissions: makePermissions(),
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
          permissions: makePermissions(),
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
                created_at: '',
                updated_at: '',
                spaces: ['default'],
                permissions: makePermissions(),
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
                created_at: '',
                updated_at: '',
                spaces: ['default'],
                permissions: makePermissions(),
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
                created_at: '',
                updated_at: '',
                spaces: ['default'],
                permissions: makePermissions(),
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
                created_at: '',
                updated_at: '',
                spaces: ['default'],
                permissions: makePermissions(),
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
