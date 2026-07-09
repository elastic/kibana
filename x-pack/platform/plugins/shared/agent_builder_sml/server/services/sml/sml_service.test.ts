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
import { SmlSearchFilterType } from '../../../common/http_api/sml';
import { createSmlService, isNotFoundError } from './sml_service';
import { SmlAuthzEnumerationIncompleteError, SmlCorpusTooLargeError } from './sml_errors';
import { smlIndexName } from './sml_storage';
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
    termsEnum: jest.fn(),
    esql: {
      query: jest.fn(),
    },
  } as unknown as jest.Mocked<ElasticsearchClient>);

/**
 * Build a `termsEnum` mock that serves a corpus permission universe keyed by
 * field. Returns a single complete page of its values.
 * Fields not present in the map return an empty, complete page (dimension
 * unused by the corpus).
 */
const buildTermsEnumMock = (universe: { kibana?: string[] }) =>
  jest.fn().mockImplementation(async (req: { field: string }) => {
    if (req.field === 'permissions.kibana.privileges.name') {
      return { complete: true, terms: universe.kibana ?? [] };
    }
    return { complete: true, terms: [] };
  });

// Column order produced by buildSmlEsqlQuery. The permission name field
// (perm_kibana) is always present; spaces and other optional
// fields appear only when explicitly requested.
const makeEsqlColumns = (includeContent = true, includeSpaces = false) => [
  { name: 'id', type: 'keyword' },
  { name: 'type', type: 'keyword' },
  { name: 'title', type: 'text' },
  { name: 'origin_uri', type: 'keyword' },
  { name: 'description', type: 'text' },
  { name: 'tags', type: 'keyword' },
  { name: 'ref_uris', type: 'keyword' },
  ...(includeSpaces ? [{ name: 'spaces', type: 'keyword' }] : []),
  { name: 'perm_kibana', type: 'keyword' },
  ...(includeContent ? [{ name: 'content', type: 'text' }] : []),
];

// Build a single ES|QL row value array matching makeEsqlColumns order. The
// `permissions` positional arg supplies the Kibana privilege names.
const makeEsqlRow = (
  id: string,
  type: string,
  title: string,
  originId: string,
  permissions: string | string[],
  {
    spaces,
    description,
    tags,
    refUris,
    content,
    includeContent = true,
    includeSpaces = false,
  }: {
    spaces?: string | string[];
    description?: string;
    tags?: string[] | null;
    refUris?: string[] | null;
    content?: string;
    includeContent?: boolean;
    includeSpaces?: boolean;
  } = {}
): unknown[] => [
  id,
  type,
  title,
  originId,
  description ?? null,
  tags ?? null,
  refUris ?? null,
  ...(includeSpaces ? [spaces ?? null] : []),
  permissions,
  ...(includeContent ? [content ?? null] : []),
];

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
 * Build a `checkPrivileges` mock that handles `kibana` privilege inputs.
 */
const buildCheckPrivilegesMock = (authorizedKibana: Set<string>) =>
  jest.fn().mockImplementation(async (req: { kibana?: string[] }) => ({
    privileges: {
      kibana: (req.kibana ?? []).map((privilege) => ({
        privilege,
        authorized: authorizedKibana.has(privilege),
      })),
    },
  }));

const createMockSecurityAuthz = (authorizedPrivileges: string[]): AuthorizationServiceSetup => {
  const checkPrivileges = buildCheckPrivilegesMock(new Set(authorizedPrivileges));
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
  const checkPrivileges = buildCheckPrivilegesMock(new Set(authorized));
  return {
    checkPrivilegesDynamicallyWithRequest: jest.fn().mockReturnValue(checkPrivileges),
  } as unknown as AuthorizationServiceSetup;
};

const createMockSmlTypeDefinition = (
  overrides: Partial<SmlTypeDefinition> = {}
): SmlTypeDefinition => ({
  id: 'test-type',
  list: jest.fn(),
  getSmlEntry: jest.fn(),
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
 */
const makePermissions = (kibanaPrivs: string[] = []) => ({
  kibana: { privileges: kibanaPrivs.map((name) => ({ name })) },
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
      expect(smlService.autocomplete).toBeDefined();
      expect(smlService.checkItemsAccess).toBeDefined();
      expect(smlService.getDocuments).toBeDefined();
      expect(smlService.indexAttachment).toBeDefined();
      expect(smlService.deleteAttachment).toBeDefined();
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
  let esqlQueryMock: jest.Mock;
  let termsEnumMock: jest.Mock;
  let scopedClient: IScopedClusterClient;
  let logger: ReturnType<typeof createMockLogger>;
  let request: KibanaRequest;

  beforeEach(() => {
    esClient = createMockEsClient();
    // `jest.Mocked` does not unwrap overloaded functions, so extract as jest.Mock directly.
    esqlQueryMock = (esClient as unknown as { esql: { query: jest.Mock } }).esql.query;
    termsEnumMock = (esClient as unknown as { termsEnum: jest.Mock }).termsEnum;
    // Default to an empty permission universe; per-case tests override this.
    termsEnumMock.mockImplementation(async () => ({ complete: true, terms: [] }));
    scopedClient = createMockScopedClient(esClient);
    logger = createMockLogger();
    request = {} as unknown as KibanaRequest;
  });

  describe('search', () => {
    it('issues an ES|QL FORK+FUSE hybrid query with MV_CONTAINS space filter', async () => {
      const service = createSmlService();
      service.setup({ logger });
      const smlService = service.start({ logger });

      esqlQueryMock.mockResolvedValue({
        columns: makeEsqlColumns(),
        values: [],
      } as any);

      await smlService.search({
        query: 'foo bar',
        size: 10,
        spaceId: 'default',
        esClient: scopedClient,
        request,
      });

      expect(esqlQueryMock).toHaveBeenCalledTimes(1);
      expect(esClient.search).not.toHaveBeenCalled();
      expect(
        (scopedClient.asCurrentUser as jest.Mocked<ElasticsearchClient>).search
      ).not.toHaveBeenCalled();

      const { query: esql, params } = esqlQueryMock.mock.calls[0]![0]! as {
        query: string;
        params?: unknown[];
      };
      // Hybrid search path: FORK + FUSE present
      expect(esql).toContain('| FORK');
      expect(esql).toContain('| FUSE');
      // METADATA required for FUSE (_id, _index, _score columns)
      expect(esql).toContain('METADATA _id, _index, _score');
      // Space filter uses MV_CONTAINS (not `==`) for multi-value safety
      expect(esql).toContain('| WHERE MV_CONTAINS(spaces, ?)');
      // Two FORK branches: BM25 (OR across text fields) + semantic (OR across semantic multi-fields).
      // Per-branch candidate depth is size(10) × MAX_SCAN_MULTIPLIER(10) for RRF recall.
      // SORT _score DESC inside each branch is required so LIMIT selects the top-scoring
      // candidates; without it LIMIT takes scan-order docs and FUSE assigns wrong RRF ranks.
      expect(esql).toContain(
        '(WHERE MATCH(title, ?) OR MATCH(description, ?) OR MATCH(content, ?) | SORT _score DESC | LIMIT 100)'
      );
      expect(esql).toContain(
        '(WHERE MATCH(title.semantic, ?) OR MATCH(description.semantic, ?) OR MATCH(content.semantic, ?) | SORT _score DESC | LIMIT 100)'
      );
      // Outer limit after FUSE is exactly `size` — authorization is enforced
      // in-query, so there is no overfetch to absorb a post-filter.
      expect(esql).toContain('| LIMIT 10');
      // Sorted by relevance score after FUSE
      expect(esql).toContain('| SORT _score DESC');
      // spaceId is first positional param
      expect(params![0]).toBe('default');
    });

    it('uses plain sorted scan for query "*" (no FORK/FUSE)', async () => {
      const service = createSmlService();
      service.setup({ logger });
      const smlService = service.start({ logger });

      esqlQueryMock.mockResolvedValue({
        columns: makeEsqlColumns(),
        values: [],
      } as any);

      await smlService.search({
        query: '*',
        size: 5,
        spaceId: 'default',
        esClient: scopedClient,
        request,
      });

      const { query: esql } = esqlQueryMock.mock.calls[0]![0]! as { query: string };
      expect(esql).not.toContain('FORK');
      expect(esql).not.toContain('FUSE');
      expect(esql).toContain('| SORT id ASC');
    });

    it('uses plain sorted scan for empty query after trim (no FORK/FUSE)', async () => {
      const service = createSmlService();
      service.setup({ logger });
      const smlService = service.start({ logger });

      esqlQueryMock.mockResolvedValue({
        columns: makeEsqlColumns(),
        values: [],
      } as any);

      await smlService.search({
        query: '',
        size: 5,
        spaceId: 'default',
        esClient: scopedClient,
        request,
      });

      const { query: esql } = esqlQueryMock.mock.calls[0]![0]! as { query: string };
      expect(esql).not.toContain('FORK');
      expect(esql).toContain('| SORT id ASC');
    });

    it('threads constraints and agent filters as WHERE clauses with positional params', async () => {
      const service = createSmlService();
      service.setup({ logger });
      const smlService = service.start({ logger });

      esqlQueryMock.mockResolvedValue({
        columns: makeEsqlColumns(),
        values: [],
      } as any);

      await smlService.search({
        query: 'github',
        size: 10,
        spaceId: 'default',
        esClient: scopedClient,
        request,
        constraints: { [SmlSearchFilterType.connector]: { ids: ['gh-1'] } },
        filters: { types: ['connector', 'dashboard'], tags: ['production'] },
      });

      const { query: esql, params } = esqlQueryMock.mock.calls[0]![0]! as {
        query: string;
        params?: unknown[];
      };

      // Constraints WHERE clause: exclude type OR allow specific origin URIs
      expect(esql).toContain('| WHERE type != ? OR origin.uri IN (?)');
      // Agent type filter
      expect(esql).toContain('| WHERE type IN (?, ?)');
      // Agent tag filter with MV_CONTAINS
      expect(esql).toContain('| WHERE MV_CONTAINS(tags, ?)');

      // Positional params: [spaceId, scopeTypeId, scopeUri, filterType1, filterType2, filterTag, ...queryX6]
      expect(params![0]).toBe('default'); // spaceId
      expect(params![1]).toBe('connector'); // constraints typeId
      expect(params![2]).toBe('connector://gh-1'); // constraints origin URI
      expect(params![3]).toBe('connector'); // filter type 1
      expect(params![4]).toBe('dashboard'); // filter type 2
      expect(params![5]).toBe('production'); // filter tag
      // query string repeated for each of the 6 MATCH branches
      expect(params!.slice(6)).toEqual(Array(6).fill('github'));
    });

    it('passes query to MATCH branches for all BM25 and semantic fields', async () => {
      const service = createSmlService();
      service.setup({ logger });
      const smlService = service.start({ logger });

      esqlQueryMock.mockResolvedValue({
        columns: makeEsqlColumns(),
        values: [],
      } as any);

      await smlService.search({
        query: 'how is the fleet performing this quarter',
        size: 10,
        spaceId: 'default',
        esClient: scopedClient,
        request,
      });

      const { query: esql, params } = esqlQueryMock.mock.calls[0]![0]! as {
        query: string;
        params?: unknown[];
      };
      // Both FORK branches present with all six fields
      expect(esql).toContain('MATCH(title, ?)');
      expect(esql).toContain('MATCH(description, ?)');
      expect(esql).toContain('MATCH(content, ?)');
      expect(esql).toContain('MATCH(title.semantic, ?)');
      expect(esql).toContain('MATCH(description.semantic, ?)');
      expect(esql).toContain('MATCH(content.semantic, ?)');
      // Query repeated six times (once per MATCH branch), after the spaceId param
      const queryString = 'how is the fleet performing this quarter';
      expect(params!.slice(1)).toEqual(Array(6).fill(queryString));
    });

    it('returns baseline fields only when no fields param is provided', async () => {
      const service = createSmlService();
      service.setup({ logger });
      const smlService = service.start({ logger });

      esqlQueryMock.mockResolvedValue({
        columns: makeEsqlColumns(false),
        values: [
          makeEsqlRow('entry-1', 'lens', 'My Viz', 'ref-1', ['saved_object:lens/get'], {
            description: 'A lens viz',
            includeContent: false,
          }),
        ],
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
        id: 'entry-1',
        type: 'lens',
        title: 'My Viz',
        origin: { uri: 'ref-1' },
        description: 'A lens viz',
      });
      expect(result.results[0]).not.toHaveProperty('content');
      expect(result.results[0]).not.toHaveProperty('tags');
      expect(result.results[0]).not.toHaveProperty('spaces');
      expect(result.results[0]).not.toHaveProperty('permissions');

      // content not in KEEP when fields is omitted
      const { query: esql } = esqlQueryMock.mock.calls[0]![0]! as { query: string };
      expect(esql).not.toMatch(/\bKEEP\b.*\bcontent\b/);
    });

    it('returns requested optional fields when fields param is provided', async () => {
      const service = createSmlService();
      service.setup({ logger });
      const smlService = service.start({ logger });

      esqlQueryMock.mockResolvedValue({
        columns: makeEsqlColumns(true),
        values: [
          makeEsqlRow('entry-1', 'lens', 'My Viz', 'ref-1', ['saved_object:lens/get'], {
            description: 'A lens viz',
            refUris: ['lens:other:uuid'],
            content: 'content text',
          }),
        ],
      } as any);

      const result = await smlService.search({
        query: 'viz',
        size: 10,
        spaceId: 'default',
        esClient: scopedClient,
        request,
        fields: ['content', 'description', 'references'],
      });

      expect(result.results[0]).toEqual({
        id: 'entry-1',
        type: 'lens',
        title: 'My Viz',
        origin: { uri: 'ref-1' },
        content: 'content text',
        description: 'A lens viz',
        references: [{ uri: 'lens:other:uuid' }],
      });
      expect(result.results[0]).not.toHaveProperty('spaces');
      expect(result.results[0]).not.toHaveProperty('permissions');
    });

    it('returns only the requested fields when fields param is provided', async () => {
      const service = createSmlService();
      service.setup({ logger });
      const smlService = service.start({ logger });

      esqlQueryMock.mockResolvedValue({
        columns: makeEsqlColumns(false),
        values: [
          makeEsqlRow('entry-bare', 'connector', 'Bare', 'b1', [], {
            includeContent: false,
          }),
        ],
      } as any);

      const result = await smlService.search({
        query: '*',
        size: 10,
        spaceId: 'default',
        esClient: scopedClient,
        request,
        fields: ['description'],
      });
      expect(result.results[0]).not.toHaveProperty('content');

      // Only requested optional fields appear in KEEP; content is absent
      const { query: esql } = esqlQueryMock.mock.calls[0]![0]! as { query: string };
      expect(esql).not.toMatch(/\bKEEP\b.*\bcontent\b/);
      expect(esql).toContain('description');
    });

    it('surfaces description, tags, and references on hits (compact LLM shape)', async () => {
      const service = createSmlService();
      service.setup({ logger });
      const smlService = service.start({ logger });

      esqlQueryMock.mockResolvedValue({
        columns: makeEsqlColumns(true),
        values: [
          makeEsqlRow(
            'entry-2',
            'dashboard',
            'Sales Q3',
            'dash-100',
            ['saved_object:dashboard/get'],
            {
              description: 'sales summary',
              tags: ['sales', 'executive'],
              refUris: ['category://sales'],
              content: 'sales content',
            }
          ),
        ],
      } as any);

      const result = await smlService.search({
        query: 'sales',
        size: 10,
        spaceId: 'default',
        esClient: scopedClient,
        request,
        fields: ['content', 'tags', 'references'],
      });

      expect(result.results).toHaveLength(1);
      expect(result.results[0]).toEqual({
        id: 'entry-2',
        type: 'dashboard',
        title: 'Sales Q3',
        origin: { uri: 'dash-100' },
        content: 'sales content',
        description: 'sales summary',
        tags: ['sales', 'executive'],
        references: [{ uri: 'category://sales' }],
      });
      expect(result.results[0]).not.toHaveProperty('spaces');
      expect(result.results[0]).not.toHaveProperty('permissions');
    });

    it('returns multiple results from ES|QL tabular response', async () => {
      const service = createSmlService();
      service.setup({ logger });
      const smlService = service.start({ logger });

      esqlQueryMock.mockResolvedValue({
        columns: makeEsqlColumns(true),
        values: [
          makeEsqlRow('entry-1', 'lens', 'A', 'r1', [], { content: '' }),
          makeEsqlRow('entry-2', 'lens', 'B', 'r2', [], { content: '' }),
        ],
      } as any);

      const result = await smlService.search({
        query: '*',
        size: 10,
        spaceId: 'default',
        esClient: scopedClient,
        request,
      });

      expect(result.results).toHaveLength(2);
    });

    it('returns empty results when index does not exist (404)', async () => {
      const service = createSmlService();
      service.setup({ logger });
      const smlService = service.start({ logger });

      esqlQueryMock.mockRejectedValue(createNotFoundError());

      const result = await smlService.search({
        query: 'foo',
        size: 10,
        spaceId: 'default',
        esClient: scopedClient,
        request,
      });

      expect(result.results).toEqual([]);
      expect(logger.debug).toHaveBeenCalledWith(
        'SML index does not exist yet — returning empty results'
      );
    });

    it('throws on non-404 errors', async () => {
      const service = createSmlService();
      service.setup({ logger });
      const smlService = service.start({ logger });

      esqlQueryMock.mockRejectedValue(new Error('Connection refused'));

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

    it('pushes an MV_CONTAINS authz filter into the query when securityAuthz is present', async () => {
      // Corpus uses two Kibana privileges; caller is authorized for one. The
      // pre-aggregation pass resolves the authorized subset and pushes it into
      // the ES|QL query so ES does the filtering.
      const securityAuthz = createMockSecurityAuthz(['saved_object:lens/get']);
      termsEnumMock.mockImplementation(
        buildTermsEnumMock({
          kibana: ['saved_object:lens/get', 'saved_object:dashboard/get'],
        })
      );
      const service = createSmlService();
      service.setup({ logger });
      const smlService = service.start({ logger, securityAuthz });

      esqlQueryMock.mockResolvedValue({
        columns: makeEsqlColumns(true),
        values: [],
      } as any);

      await smlService.search({
        query: '*',
        size: 10,
        spaceId: 'default',
        esClient: scopedClient,
        request,
      });

      // The Kibana permission field is enumerated up front.
      expect(termsEnumMock).toHaveBeenCalledWith(
        expect.objectContaining({ field: 'permissions.kibana.privileges.name' })
      );

      const { query: esql, params } = esqlQueryMock.mock.calls[0]![0]! as {
        query: string;
        params?: unknown[];
      };
      // Authorized Kibana subset pushed as an MV_CONTAINS subset filter. The
      // authorized set is bound as a single multivalue param (array), not an
      // inline `[?, ?]` list (which ES|QL rejects).
      expect(esql).toContain('| WHERE MV_CONTAINS(?, permissions.kibana.privileges.name)');
      // The authorized set is a single array-valued positional param.
      expect(params).toContainEqual(['saved_object:lens/get']);
    });

    it('restricts to public KIs when the caller holds nothing in a used dimension', async () => {
      // Corpus uses a Kibana privilege the caller does NOT hold → the authorized
      // array is empty, so MV_CONTAINS(?, field) admits only KIs whose required
      // set is a subset of {} (i.e. public KIs with no required privilege).
      const securityAuthz = createMockSecurityAuthz([]);
      termsEnumMock.mockImplementation(
        buildTermsEnumMock({ kibana: ['saved_object:dashboard/get'] })
      );
      const service = createSmlService();
      service.setup({ logger });
      const smlService = service.start({ logger, securityAuthz });

      esqlQueryMock.mockResolvedValue({
        columns: makeEsqlColumns(true),
        values: [],
      } as any);

      await smlService.search({
        query: '*',
        size: 10,
        spaceId: 'default',
        esClient: scopedClient,
        request,
      });

      const { query: esql, params } = esqlQueryMock.mock.calls[0]![0]! as {
        query: string;
        params?: unknown[];
      };
      // Clause is still emitted (dimension is used); the empty authorized array
      // is what restricts to public KIs.
      expect(esql).toContain('| WHERE MV_CONTAINS(?, permissions.kibana.privileges.name)');
      expect(params).toContainEqual([]);
    });

    it('emits no authz clause and skips enumeration when securityAuthz is absent', async () => {
      const service = createSmlService();
      service.setup({ logger });
      const smlService = service.start({ logger });

      esqlQueryMock.mockResolvedValue({
        columns: makeEsqlColumns(true),
        values: [
          makeEsqlRow('entry-1', 'lens', 'Lens', 'r1', ['saved_object:lens/get'], { content: '' }),
          makeEsqlRow('entry-2', 'dashboard', 'Dashboard', 'r2', ['saved_object:dashboard/get'], {
            content: '',
          }),
        ],
      } as any);

      const result = await smlService.search({
        query: '*',
        size: 10,
        spaceId: 'default',
        esClient: scopedClient,
        request,
      });

      // No security plugin → no enumeration, no authz filter, all rows returned.
      expect(termsEnumMock).not.toHaveBeenCalled();
      const { query: esql } = esqlQueryMock.mock.calls[0]![0]! as { query: string };
      expect(esql).not.toContain('| WHERE MV_CONTAINS(?, permissions.kibana.privileges.name)');
      expect(result.results).toHaveLength(2);
    });

    it('emits no authz clause when the corpus uses no permission dimensions', async () => {
      // securityAuthz present but the corpus is permission-free → the universe
      // is empty, so no privilege check and no authz WHERE clause.
      const securityAuthz = createMockSecurityAuthz([]);
      // termsEnumMock default already returns empty pages.
      const service = createSmlService();
      service.setup({ logger });
      const smlService = service.start({ logger, securityAuthz });

      esqlQueryMock.mockResolvedValue({
        columns: makeEsqlColumns(true),
        values: [makeEsqlRow('entry-1', 'lens', 'Lens', 'r1', [], { content: '' })],
      } as any);

      const result = await smlService.search({
        query: '*',
        size: 10,
        spaceId: 'default',
        esClient: scopedClient,
        request,
      });

      const { query: esql } = esqlQueryMock.mock.calls[0]![0]! as { query: string };
      expect(esql).not.toContain('| WHERE MV_CONTAINS(?, permissions.kibana.privileges.name)');
      // The privilege check is skipped entirely when the universe is empty.
      expect(securityAuthz.checkPrivilegesDynamicallyWithRequest).not.toHaveBeenCalled();
      expect(result.results).toHaveLength(1);
    });

    it('uses default size of 10 when not specified (outer LIMIT = size)', async () => {
      const service = createSmlService();
      service.setup({ logger });
      const smlService = service.start({ logger });

      esqlQueryMock.mockResolvedValue({
        columns: makeEsqlColumns(),
        values: [],
      } as any);

      await smlService.search({
        query: '*',
        spaceId: 'default',
        esClient: scopedClient,
        request,
      });

      const { query: esql } = esqlQueryMock.mock.calls[0]![0]! as { query: string };
      // Default size 10 → outer LIMIT 10 (no overfetch; authz is in-query).
      expect(esql).toContain('| LIMIT 10');
    });
  });

  describe('autocomplete', () => {
    it('builds a single nested discovery_labels query (with inner_hits) and a space filter', async () => {
      const service = createSmlService();
      service.setup({ logger });
      const smlService = service.start({ logger });

      esClient.search.mockResolvedValue({
        hits: { total: 0, hits: [] },
      } as any);

      await smlService.autocomplete({
        query: 'git',
        size: 10,
        spaceId: 'default',
        esClient: scopedClient,
        request,
      });

      expect(esClient.search).toHaveBeenCalledTimes(1);
      const call = esClient.search.mock.calls[0]![0]!;
      expect(call.query).toEqual({
        bool: {
          must: [
            {
              nested: {
                path: 'discovery_labels',
                query: {
                  multi_match: {
                    query: 'git',
                    type: 'bool_prefix',
                    operator: 'and',
                    fields: [
                      'discovery_labels.value',
                      'discovery_labels.value._2gram',
                      'discovery_labels.value._3gram',
                    ],
                  },
                },
                inner_hits: {
                  _source: ['discovery_labels.value', 'discovery_labels.kind'],
                  size: 10,
                  highlight: {
                    type: 'unified',
                    number_of_fragments: 0,
                    pre_tags: ['<em>'],
                    post_tags: ['</em>'],
                    encoder: 'html',
                    fields: {
                      'discovery_labels.value': {},
                    },
                  },
                },
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
      expect(call._source).toEqual(['id', 'type', 'title', 'origin', 'permissions']);
    });

    it('uses match_all for query "*"', async () => {
      const service = createSmlService();
      service.setup({ logger });
      const smlService = service.start({ logger });

      esClient.search.mockResolvedValue({ hits: { total: 0, hits: [] } } as any);

      await smlService.autocomplete({
        query: '*',
        size: 10,
        spaceId: 'default',
        esClient: scopedClient,
        request,
      });

      const call = esClient.search.mock.calls[0]![0]!;
      expect(call.query!.bool!.must).toEqual([{ match_all: {} }]);
    });

    it('threads per-type constraints through buildConstraintsFilter into the ES filter clauses', async () => {
      const service = createSmlService();
      service.setup({ logger });
      const smlService = service.start({ logger });

      esClient.search.mockResolvedValue({ hits: { total: 0, hits: [] } } as any);

      await smlService.autocomplete({
        query: 'git',
        size: 10,
        spaceId: 'default',
        esClient: scopedClient,
        request,
        constraints: { [SmlSearchFilterType.connector]: { ids: ['gh-1', 'jira-1'] } },
      });

      const call = esClient.search.mock.calls[0]![0]!;
      const filterClauses = call.query!.bool!.filter as Array<Record<string, unknown>>;
      // First clause is the space filter; second is the constraints filter.
      expect(filterClauses).toHaveLength(2);
      expect(filterClauses[1]).toEqual({
        bool: {
          should: [
            {
              terms: { 'origin.uri': ['connector://gh-1', 'connector://jira-1'] },
            },
            { bool: { must_not: [{ term: { type: 'connector' } }] } },
          ],
          minimum_should_match: 1,
        },
      });
    });

    it('maps inner_hits onto matched_discovery_labels', async () => {
      const service = createSmlService();
      service.setup({ logger });
      const smlService = service.start({ logger });

      esClient.search.mockResolvedValue({
        hits: {
          total: 1,
          hits: [
            {
              _source: {
                id: 'entry-1',
                type: 'connector',
                title: 'GitHub Connector',
                origin: { uri: 'gh-1' },
                spaces: ['default'],
                permissions: makePermissions(),
              },
              _score: 5.4,
              inner_hits: {
                discovery_labels: {
                  hits: {
                    total: { value: 2, relation: 'eq' },
                    hits: [
                      {
                        _nested: { field: 'discovery_labels', offset: 0 },
                        _score: 5.4,
                        _source: { value: 'GitHub Connector', kind: 'title' },
                        highlight: {
                          'discovery_labels.value': ['<em>GitHub</em> Connector'],
                        },
                      },
                      {
                        _nested: { field: 'discovery_labels', offset: 2 },
                        _score: 4.1,
                        _source: { value: 'github', kind: 'tagline' },
                        highlight: {
                          'discovery_labels.value': ['<em>github</em>'],
                        },
                      },
                    ],
                  },
                },
              },
            },
          ],
        },
      } as any);

      const result = await smlService.autocomplete({
        query: 'git',
        size: 10,
        spaceId: 'default',
        esClient: scopedClient,
        request,
      });

      expect(result.results).toHaveLength(1);
      expect(result.results[0]).toEqual({
        id: 'entry-1',
        type: 'connector',
        title: 'GitHub Connector',
        origin: { uri: 'gh-1' },
        spaces: ['default'],
        permissions: makePermissions(),
        matched_discovery_labels: [
          {
            value: 'GitHub Connector',
            kind: 'title',
            highlighted: '<em>GitHub</em> Connector',
          },
          { value: 'github', kind: 'tagline', highlighted: '<em>github</em>' },
        ],
      });
    });

    it('omits matched_discovery_labels when absent', async () => {
      const service = createSmlService();
      service.setup({ logger });
      const smlService = service.start({ logger });

      esClient.search.mockResolvedValue({
        hits: {
          total: 1,
          hits: [
            {
              _source: {
                id: 'entry-2',
                type: 'dashboard',
                title: 'Sales Q3',
                origin: { uri: 'dash-1' },
                spaces: ['default'],
                permissions: makePermissions(),
              },
              _score: 2.0,
            },
          ],
        },
      } as any);

      const result = await smlService.autocomplete({
        query: 'sal',
        size: 10,
        spaceId: 'default',
        esClient: scopedClient,
        request,
      });

      expect(result.results[0]).toEqual({
        id: 'entry-2',
        type: 'dashboard',
        title: 'Sales Q3',
        origin: { uri: 'dash-1' },
        spaces: ['default'],
        permissions: makePermissions(),
      });
    });

    it('returns empty results when the index does not exist (404)', async () => {
      const service = createSmlService();
      service.setup({ logger });
      const smlService = service.start({ logger });

      esClient.search.mockRejectedValue(createNotFoundError());

      const result = await smlService.autocomplete({
        query: 'git',
        size: 10,
        spaceId: 'default',
        esClient: scopedClient,
        request,
      });

      expect(result).toEqual({ results: [] });
    });

    it('applies permission filtering when securityAuthz is present', async () => {
      const securityAuthz = createMockSecurityAuthzPartial(
        ['saved_object:dashboard/get'],
        ['saved_object:connector/get']
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
                id: 'entry-allowed',
                type: 'dashboard',
                title: 'Allowed',
                origin: { uri: 'd1' },
                spaces: ['default'],
                permissions: makePermissions(['saved_object:dashboard/get']),
              },
              _score: 3,
            },
            {
              _source: {
                id: 'entry-denied',
                type: 'connector',
                title: 'Denied',
                origin: { uri: 'c1' },
                spaces: ['default'],
                permissions: makePermissions(['saved_object:connector/get']),
              },
              _score: 2,
            },
          ],
        },
      } as any);

      const result = await smlService.autocomplete({
        query: 'a',
        size: 10,
        spaceId: 'default',
        esClient: scopedClient,
        request,
      });

      expect(result.results).toHaveLength(1);
      expect(result.results[0].id).toBe('entry-allowed');
    });

    describe('pre-aggregation authz filter (MV_CONTAINS subset)', () => {
      const getEsql = () =>
        esqlQueryMock.mock.calls[0]![0]! as { query: string; params?: unknown[] };

      it('fails closed when _terms_enum returns complete=false', async () => {
        const securityAuthz = createMockSecurityAuthz(['saved_object:lens/get']);
        termsEnumMock.mockImplementation(async () => {
          return { complete: false, terms: ['saved_object:lens/get'] };
        });
        const service = createSmlService();
        service.setup({ logger });
        const smlService = service.start({ logger, securityAuthz });

        await expect(
          smlService.search({
            query: '*',
            size: 10,
            spaceId: 'default',
            esClient: scopedClient,
            request,
          })
        ).rejects.toBeInstanceOf(SmlAuthzEnumerationIncompleteError);
        // The search query is never issued when authz enumeration is incomplete.
        expect(esqlQueryMock).not.toHaveBeenCalled();
      });

      it('fails closed (SmlCorpusTooLargeError) when distinct values exceed the ceiling', async () => {
        const securityAuthz = createMockSecurityAuthz(['saved_object:lens/get']);
        // Always return a full page → pagination never exhausts → ceiling hit.
        const fullPage = Array.from({ length: 1000 }, (_, i) => `priv-${i}`);
        termsEnumMock.mockImplementation(async () => {
          return { complete: true, terms: fullPage };
        });
        const service = createSmlService();
        service.setup({ logger });
        const smlService = service.start({ logger, securityAuthz });

        await expect(
          smlService.search({
            query: '*',
            size: 10,
            spaceId: 'default',
            esClient: scopedClient,
            request,
          })
        ).rejects.toBeInstanceOf(SmlCorpusTooLargeError);
      });

      it('treats a missing index as an empty universe (no authz clause)', async () => {
        const securityAuthz = createMockSecurityAuthz(['saved_object:lens/get']);
        termsEnumMock.mockRejectedValue(createNotFoundError());
        const service = createSmlService();
        service.setup({ logger });
        const smlService = service.start({ logger, securityAuthz });
        esqlQueryMock.mockResolvedValue({ columns: makeEsqlColumns(true), values: [] } as any);

        await smlService.search({
          query: '*',
          size: 10,
          spaceId: 'default',
          esClient: scopedClient,
          request,
        });

        const { query: esql } = getEsql();
        // No authz WHERE clause is emitted.
        expect(esql).not.toContain('| WHERE MV_CONTAINS(?, permissions.kibana.privileges.name)');
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

    it('fails closed when checkPrivileges throws — denies items with deps, keeps trivial items', async () => {
      const securityAuthz = createMockSecurityAuthz(['saved_object:lens/get']);
      const service = createSmlService();
      service.setup({ logger });
      const smlService = service.start({ logger, securityAuthz });

      esClient.search.mockResolvedValueOnce({
        hits: {
          total: 2,
          hits: [
            // Truly trivial item — no kibana privs — passes regardless of authz state.
            {
              _source: {
                id: 'trivial',
                permissions: makePermissions([]),
              },
            },
            {
              _source: {
                id: 'with-deps',
                permissions: makePermissions(['saved_object:lens/get']),
              },
            },
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
                origin: { uri: 'lens://ref-1' },
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
                origin: { uri: 'dashboard://ref-2' },
                content: 'content 2',
                description: 'dash desc',
                user_id: 'u2',
                references: [{ uri: 'lens:x:y' }],
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
        origin: { uri: 'lens://ref-1' },
        content: 'content 1',
        created_at: '2024-01-01',
        updated_at: '2024-01-02',
        spaces: ['default'],
        permissions: makePermissions(),
        ingestion_method: 'crawled',
      });
      expect(result.get('doc-2')).toEqual({
        id: 'doc-2',
        type: 'dashboard',
        title: 'Doc 2',
        origin_id: 'ref-2',
        origin: { uri: 'dashboard://ref-2' },
        content: 'content 2',
        description: 'dash desc',
        user_id: 'u2',
        references: [{ uri: 'lens:x:y' }],
        created_at: '2024-01-01',
        updated_at: '2024-01-02',
        spaces: ['default'],
        permissions: makePermissions(),
        ingestion_method: 'crawled',
      });
    });

    it('round-trips all new schema fields (origin, tags, discovery_labels, extended_attrs)', async () => {
      const service = createSmlService();
      service.setup({ logger });
      const smlService = service.start({ logger });

      esClient.search.mockResolvedValue({
        hits: {
          total: 1,
          hits: [
            {
              _source: {
                id: 'doc-3',
                type: 'dashboard',
                title: 'Sales Q3',
                origin: { uri: 'dashboard://dash-100' },
                content: 'sales content',
                description: 'sales summary',
                tags: ['sales', 'executive'],
                discovery_labels: [{ value: 'q3 sales', kind: 'tagline' }],
                extended_attrs: { owner_team: 'sales-ops' },
                user_id: 'user-7',
                references: [{ uri: 'category://sales' }],
                created_at: '2026-04-01T00:00:00.000Z',
                updated_at: '2026-04-02T00:00:00.000Z',
                spaces: ['default'],
                permissions: makePermissions(['saved_object:dashboard/get']),
              },
            },
          ],
        },
      } as any);

      const result = await smlService.getDocuments({
        ids: ['doc-3'],
        spaceId: 'default',
        esClient: scopedClient,
      });

      expect(result.get('doc-3')).toEqual({
        id: 'doc-3',
        type: 'dashboard',
        title: 'Sales Q3',
        origin_id: 'dash-100',
        origin: { uri: 'dashboard://dash-100' },
        content: 'sales content',
        description: 'sales summary',
        tags: ['sales', 'executive'],
        discovery_labels: [{ value: 'q3 sales', kind: 'tagline' }],
        extended_attrs: { owner_team: 'sales-ops' },
        user_id: 'user-7',
        references: [{ uri: 'category://sales' }],
        created_at: '2026-04-01T00:00:00.000Z',
        updated_at: '2026-04-02T00:00:00.000Z',
        spaces: ['default'],
        permissions: makePermissions(['saved_object:dashboard/get']),
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
});
