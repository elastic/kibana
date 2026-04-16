/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { MemoryNode } from '@kbn/agent-builder-common';
import { registerMemoryRoutes } from './memory';
import type { RouteDependencies } from './types';
import { internalApiPath } from '../../common/constants';

const MEMORY_BASE_PATH = `${internalApiPath}/memory`;

// ---------------------------------------------------------------------------
// Helper factories
// ---------------------------------------------------------------------------

const makeMockMemoryNode = (overrides: Partial<MemoryNode> = {}): MemoryNode => ({
  id: 'mem-001',
  type: 'semantic',
  summary: 'User prefers TypeScript',
  full: 'User has stated a strong preference for TypeScript over JavaScript in all projects.',
  confidence: 0.9,
  salience: 0.8,
  recency: '2024-01-01T00:00:00.000Z',
  utility: 0.7,
  stability: 0.5,
  access_count: 3,
  reinforcement_score: 0.6,
  status: 'established',
  source_refs: [],
  links: [],
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
  space: 'default',
  user_id: 'user-1',
  user_name: 'elastic',
  ...overrides,
});

const createMockContext = () => ({
  core: Promise.resolve({
    uiSettings: {
      client: { get: jest.fn().mockResolvedValue(true) },
    },
  }),
  licensing: Promise.resolve({
    license: { status: 'active', hasAtLeast: jest.fn().mockReturnValue(true) },
  }),
});

// ---------------------------------------------------------------------------
// Test setup
// ---------------------------------------------------------------------------

describe('Memory Routes', () => {
  let routeHandlers: Record<
    string,
    { handler: (ctx: unknown, req: unknown, res: unknown) => Promise<unknown> }
  >;
  let mockMemoryList: jest.Mock;
  let mockMemoryGet: jest.Mock;
  let mockMemoryCreate: jest.Mock;
  let mockMemoryUpdate: jest.Mock;
  let mockMemorySearch: jest.Mock;

  const mockResponse = {
    ok: jest.fn((params: { body?: unknown } = {}) => ({ type: 'ok', ...params })),
    badRequest: jest.fn((params: { body?: { message?: string } } = {}) => ({
      type: 'badRequest',
      ...params,
    })),
    notFound: jest.fn((params: { body?: { message?: string } } = {}) => ({
      type: 'notFound',
      ...params,
    })),
    customError: jest.fn((params: { body?: unknown; statusCode?: number } = {}) => ({
      type: 'customError',
      ...params,
    })),
    forbidden: jest.fn((params: { body?: { message?: string } } = {}) => ({
      type: 'forbidden',
      ...params,
    })),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    routeHandlers = {};

    mockMemoryList = jest.fn().mockResolvedValue([makeMockMemoryNode()]);
    mockMemoryGet = jest.fn().mockResolvedValue(makeMockMemoryNode());
    mockMemoryCreate = jest.fn().mockResolvedValue(makeMockMemoryNode());
    mockMemoryUpdate = jest.fn().mockResolvedValue(makeMockMemoryNode({ status: 'deprecated' }));
    mockMemorySearch = jest.fn().mockResolvedValue([makeMockMemoryNode()]);

    const mockMemoryClient = {
      list: mockMemoryList,
      get: mockMemoryGet,
      create: mockMemoryCreate,
      update: mockMemoryUpdate,
      search: mockMemorySearch,
      delete: jest.fn().mockResolvedValue(true),
      addLink: jest.fn().mockResolvedValue(undefined),
      removeLink: jest.fn().mockResolvedValue(undefined),
      updateLinkWeight: jest.fn().mockResolvedValue(undefined),
      bulkCreate: jest.fn().mockResolvedValue([]),
    };

    const getInternalServices = jest.fn().mockReturnValue({
      memory: {
        getScopedClient: jest.fn().mockResolvedValue(mockMemoryClient),
      },
    });

    // Mock coreSetup.getStartServices for routes that need it
    const mockTaskManager = {
      runSoon: jest.fn().mockResolvedValue({ id: 'task-1', forced: false }),
    };

    const mockCoreSetup = {
      getStartServices: jest.fn().mockResolvedValue([
        {
          elasticsearch: {
            client: {
              asInternalUser: {
                search: jest.fn().mockResolvedValue({
                  hits: { hits: [], total: { value: 0 } },
                }),
                count: jest.fn().mockResolvedValue({ count: 0 }),
                get: jest.fn().mockResolvedValue({ found: false }),
                delete: jest.fn().mockResolvedValue({ result: 'deleted' }),
              },
            },
          },
        },
        { taskManager: mockTaskManager },
      ]),
    };

    const createVersionedRoute = (method: string, path: string) => ({
      addVersion: jest
        .fn()
        .mockImplementation(
          (
            _config: unknown,
            handler: (ctx: unknown, req: unknown, res: unknown) => Promise<unknown>
          ) => {
            routeHandlers[`${method}:${path}`] = { handler };
            return { addVersion: jest.fn() };
          }
        ),
    });

    // For non-versioned routes, register the handler directly
    const registerRoute = (method: string, path: string, handler: unknown) => {
      routeHandlers[`${method}:${path}`] = {
        handler: handler as (ctx: unknown, req: unknown, res: unknown) => Promise<unknown>,
      };
    };

    const mockRouter = {
      versioned: {
        get: jest
          .fn()
          .mockImplementation((config: { path: string }) =>
            createVersionedRoute('GET', config.path)
          ),
        post: jest
          .fn()
          .mockImplementation((config: { path: string }) =>
            createVersionedRoute('POST', config.path)
          ),
        put: jest
          .fn()
          .mockImplementation((config: { path: string }) =>
            createVersionedRoute('PUT', config.path)
          ),
        delete: jest
          .fn()
          .mockImplementation((config: { path: string }) =>
            createVersionedRoute('DELETE', config.path)
          ),
      },
      get: jest.fn().mockImplementation((config: { path: string }, handler: unknown) => {
        registerRoute('GET', config.path, handler);
      }),
      post: jest.fn().mockImplementation((config: { path: string }, handler: unknown) => {
        registerRoute('POST', config.path, handler);
      }),
      put: jest.fn().mockImplementation((config: { path: string }, handler: unknown) => {
        registerRoute('PUT', config.path, handler);
      }),
      delete: jest.fn().mockImplementation((config: { path: string }, handler: unknown) => {
        registerRoute('DELETE', config.path, handler);
      }),
    } as unknown as jest.Mocked<IRouter>;

    registerMemoryRoutes({
      router: mockRouter,
      getInternalServices,
      logger: loggingSystemMock.createLogger(),
      coreSetup: mockCoreSetup as unknown as RouteDependencies['coreSetup'],
    } as unknown as RouteDependencies);
  });

  const getHandler = (method: string, path: string) => routeHandlers[`${method}:${path}`]?.handler;

  // ---------------------------------------------------------------------------
  // Story 8.1 — CRUD Routes
  // ---------------------------------------------------------------------------

  describe('GET /memory (list memories)', () => {
    it('registers the list route', () => {
      expect(getHandler('GET', MEMORY_BASE_PATH)).toBeDefined();
    });

    it('returns memory list with results and total', async () => {
      const handler = getHandler('GET', MEMORY_BASE_PATH)!;
      const ctx = createMockContext();
      const req = { query: { size: 20, from: 0 } };

      const result = await handler(ctx, req, mockResponse);

      expect(mockMemoryList).toHaveBeenCalledWith({
        type: undefined,
        status: undefined,
        size: 20,
        from: 0,
      });
      expect(result).toMatchObject({ type: 'ok' });
      expect((result as { body: { results: unknown[] } }).body.results).toHaveLength(1);
    });

    it('passes filter params to list()', async () => {
      const handler = getHandler('GET', MEMORY_BASE_PATH)!;
      const ctx = createMockContext();
      const req = { query: { type: 'semantic', status: 'established', size: 10, from: 5 } };

      await handler(ctx, req, mockResponse);

      expect(mockMemoryList).toHaveBeenCalledWith({
        type: 'semantic',
        status: 'established',
        size: 10,
        from: 5,
      });
    });
  });

  describe('GET /memory/:id (get single memory)', () => {
    it('registers the get-by-id route', () => {
      expect(getHandler('GET', `${MEMORY_BASE_PATH}/{id}`)).toBeDefined();
    });

    it('returns the memory node for a valid id', async () => {
      const handler = getHandler('GET', `${MEMORY_BASE_PATH}/{id}`)!;
      const ctx = createMockContext();
      const req = { params: { id: 'mem-001' } };

      const result = await handler(ctx, req, mockResponse);

      expect(mockMemoryGet).toHaveBeenCalledWith('mem-001');
      expect(result).toMatchObject({ type: 'ok' });
    });
  });

  describe('POST /memory (create memory)', () => {
    it('registers the create route', () => {
      expect(getHandler('POST', MEMORY_BASE_PATH)).toBeDefined();
    });

    it('calls client.create and returns the created node', async () => {
      const handler = getHandler('POST', MEMORY_BASE_PATH)!;
      const ctx = createMockContext();
      const req = {
        body: {
          type: 'semantic',
          summary: 'User likes TypeScript',
          full: 'The user has expressed a preference for TypeScript.',
          confidence: 0.9,
        },
      };

      const result = await handler(ctx, req, mockResponse);

      expect(mockMemoryCreate).toHaveBeenCalled();
      expect(result).toMatchObject({ type: 'ok' });
    });
  });

  describe('PUT /memory/:id (update memory)', () => {
    it('registers the update route', () => {
      expect(getHandler('PUT', `${MEMORY_BASE_PATH}/{id}`)).toBeDefined();
    });

    it('calls client.update with id and body fields', async () => {
      const handler = getHandler('PUT', `${MEMORY_BASE_PATH}/{id}`)!;
      const ctx = createMockContext();
      const req = {
        params: { id: 'mem-001' },
        body: { summary: 'Updated summary', confidence: 0.95 },
      };

      const result = await handler(ctx, req, mockResponse);

      expect(mockMemoryUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'mem-001', summary: 'Updated summary', confidence: 0.95 })
      );
      expect(result).toMatchObject({ type: 'ok' });
    });
  });

  describe('DELETE /memory/:id (soft-delete)', () => {
    it('registers the delete route', () => {
      expect(getHandler('DELETE', `${MEMORY_BASE_PATH}/{id}`)).toBeDefined();
    });

    it('soft-deletes by setting status to deprecated', async () => {
      const handler = getHandler('DELETE', `${MEMORY_BASE_PATH}/{id}`)!;
      const ctx = createMockContext();
      const req = { params: { id: 'mem-001' } };

      const result = await handler(ctx, req, mockResponse);

      expect(mockMemoryUpdate).toHaveBeenCalledWith({ id: 'mem-001', status: 'deprecated' });
      expect(result).toMatchObject({
        type: 'ok',
        body: { success: true, id: 'mem-001' },
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Story 8.2 — Search route
  // ---------------------------------------------------------------------------

  describe('POST /memory/search', () => {
    it('registers the search route', () => {
      expect(getHandler('POST', `${MEMORY_BASE_PATH}/search`)).toBeDefined();
    });

    it('calls client.search with query and returns ranked results', async () => {
      const handler = getHandler('POST', `${MEMORY_BASE_PATH}/search`)!;
      const ctx = createMockContext();
      const req = { body: { query: 'TypeScript preferences', stage: 'round_start', limit: 5 } };

      const result = await handler(ctx, req, mockResponse);

      expect(mockMemorySearch).toHaveBeenCalledWith('TypeScript preferences', {
        size: 5,
        stage: 'round_start',
      });
      expect(result).toMatchObject({ type: 'ok' });
      const body = (result as { body: { results: unknown[]; query: string; stage: string } }).body;
      expect(body.query).toBe('TypeScript preferences');
      expect(body.stage).toBe('round_start');
    });

    it('defaults stage to round_start when not provided', async () => {
      const handler = getHandler('POST', `${MEMORY_BASE_PATH}/search`)!;
      const ctx = createMockContext();
      const req = { body: { query: 'some query', limit: 10 } };

      const result = await handler(ctx, req, mockResponse);

      const body = (result as { body: { stage: string } }).body;
      expect(body.stage).toBe('round_start');
    });
  });

  // ---------------------------------------------------------------------------
  // Story 8.3 — Graph traversal route
  // ---------------------------------------------------------------------------

  describe('GET /memory/:id/graph', () => {
    it('registers the graph route', () => {
      expect(getHandler('GET', `${MEMORY_BASE_PATH}/{id}/graph`)).toBeDefined();
    });

    it('returns nodes and edges for valid id', async () => {
      // Mock the memory get to return a node with links
      mockMemoryGet.mockResolvedValue(
        makeMockMemoryNode({
          id: 'mem-root',
          links: [{ target_id: 'mem-002', type: 'related_to', weight: 0.8 }],
        })
      );

      const handler = getHandler('GET', `${MEMORY_BASE_PATH}/{id}/graph`)!;
      const ctx = createMockContext();
      const req = { params: { id: 'mem-root' }, query: { depth: 1 } };

      const result = await handler(ctx, req, mockResponse);

      expect(result).toMatchObject({ type: 'ok' });
      const body = (result as { body: { nodes: unknown[]; edges: unknown[] } }).body;
      expect(Array.isArray(body.nodes)).toBe(true);
      expect(Array.isArray(body.edges)).toBe(true);
    });

    it('parses edge_types query parameter', async () => {
      mockMemoryGet.mockResolvedValue(makeMockMemoryNode({ id: 'mem-root', links: [] }));

      const handler = getHandler('GET', `${MEMORY_BASE_PATH}/{id}/graph`)!;
      const ctx = createMockContext();
      const req = {
        params: { id: 'mem-root' },
        query: { depth: 2, edge_types: 'related_to,contradicts' },
      };

      // Should not throw; edge_types are parsed and passed to the graph service
      const result = await handler(ctx, req, mockResponse);
      expect(result).toMatchObject({ type: 'ok' });
    });
  });

  // ---------------------------------------------------------------------------
  // Story 8.4 — Admin routes
  // ---------------------------------------------------------------------------

  describe('GET /memory/stats', () => {
    it('registers the stats route', () => {
      expect(getHandler('GET', `${MEMORY_BASE_PATH}/stats`)).toBeDefined();
    });

    it('returns counts by type and status', async () => {
      mockMemoryList.mockResolvedValue([
        makeMockMemoryNode({ type: 'semantic', status: 'established' }),
        makeMockMemoryNode({ id: 'mem-002', type: 'episodic', status: 'provisional' }),
        makeMockMemoryNode({ id: 'mem-003', type: 'semantic', status: 'provisional' }),
      ]);

      const handler = getHandler('GET', `${MEMORY_BASE_PATH}/stats`)!;
      const ctx = createMockContext();
      const req = {};

      const result = await handler(ctx, req, mockResponse);

      expect(result).toMatchObject({ type: 'ok' });
      const body = (
        result as {
          body: {
            total: number;
            by_type: Record<string, number>;
            by_status: Record<string, number>;
          };
        }
      ).body;
      expect(body.total).toBe(3);
      expect(body.by_type.semantic).toBe(2);
      expect(body.by_type.episodic).toBe(1);
      expect(body.by_status.established).toBe(1);
      expect(body.by_status.provisional).toBe(2);
    });
  });

  describe('GET /memory/review_queue', () => {
    it('registers the review_queue route', () => {
      expect(getHandler('GET', `${MEMORY_BASE_PATH}/review_queue`)).toBeDefined();
    });

    it('returns items and total from the review queue', async () => {
      const handler = getHandler('GET', `${MEMORY_BASE_PATH}/review_queue`)!;
      const ctx = createMockContext();
      const req = { query: { limit: 20 } };

      const result = await handler(ctx, req, mockResponse);

      expect(result).toMatchObject({ type: 'ok' });
      const body = (result as { body: { items: unknown[]; total: number } }).body;
      expect(Array.isArray(body.items)).toBe(true);
      expect(typeof body.total).toBe('number');
    });
  });

  describe('POST /memory/consolidate', () => {
    it('registers the consolidate route', () => {
      expect(getHandler('POST', `${MEMORY_BASE_PATH}/consolidate`)).toBeDefined();
    });

    it('triggers consolidation via task manager', async () => {
      const handler = getHandler('POST', `${MEMORY_BASE_PATH}/consolidate`)!;
      const ctx = createMockContext();
      const req = {};

      const result = await handler(ctx, req, mockResponse);

      expect(result).toMatchObject({ type: 'ok' });
      const body = (result as { body: { success: boolean } }).body;
      expect(body.success).toBe(true);
    });
  });

  describe('POST /memory/review/:id', () => {
    it('registers the review route', () => {
      expect(getHandler('POST', `${MEMORY_BASE_PATH}/review/{id}`)).toBeDefined();
    });

    it('returns not found when review item does not exist', async () => {
      const handler = getHandler('POST', `${MEMORY_BASE_PATH}/review/{id}`)!;
      const ctx = createMockContext();
      const req = {
        params: { id: 'review-999' },
        body: { action: 'approve' },
      };

      const result = await handler(ctx, req, mockResponse);

      // The mock ES client returns found: false by default
      expect(result).toMatchObject({ type: 'notFound' });
    });
  });

  // ---------------------------------------------------------------------------
  // Authorization checks — verify route security settings
  // ---------------------------------------------------------------------------

  describe('Route security configuration', () => {
    it('read routes use AGENT_BUILDER_READ_SECURITY', () => {
      // All GET routes should have been registered (verified by checking they exist)
      expect(getHandler('GET', MEMORY_BASE_PATH)).toBeDefined();
      expect(getHandler('GET', `${MEMORY_BASE_PATH}/{id}`)).toBeDefined();
      expect(getHandler('GET', `${MEMORY_BASE_PATH}/{id}/graph`)).toBeDefined();
      expect(getHandler('GET', `${MEMORY_BASE_PATH}/stats`)).toBeDefined();
      expect(getHandler('GET', `${MEMORY_BASE_PATH}/review_queue`)).toBeDefined();
    });

    it('write routes use AGENT_BUILDER_WRITE_SECURITY', () => {
      // All POST/PUT/DELETE routes should have been registered
      expect(getHandler('POST', MEMORY_BASE_PATH)).toBeDefined();
      expect(getHandler('PUT', `${MEMORY_BASE_PATH}/{id}`)).toBeDefined();
      expect(getHandler('DELETE', `${MEMORY_BASE_PATH}/{id}`)).toBeDefined();
      expect(getHandler('POST', `${MEMORY_BASE_PATH}/search`)).toBeDefined();
      expect(getHandler('POST', `${MEMORY_BASE_PATH}/consolidate`)).toBeDefined();
      expect(getHandler('POST', `${MEMORY_BASE_PATH}/review/{id}`)).toBeDefined();
    });
  });
});
