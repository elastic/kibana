/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { IRouter } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { registerInternalConnectorRoutes } from './connectors';
import type { RouteDependencies } from '../types';
import { internalApiPath } from '../../../common/constants';

jest.mock('@kbn/connector-specs', () => ({
  getConnectorSpec: jest.fn(),
  isToolAction: jest.fn(),
}));

jest.mock('@kbn/agent-builder-server', () => ({
  formatSchemaForLlm: jest.fn((s) => String(s)),
}));

import { getConnectorSpec, isToolAction } from '@kbn/connector-specs';

const mockGetConnectorSpec = getConnectorSpec as jest.Mock;
const mockIsToolAction = isToolAction as jest.Mock;

type Handler = (ctx: unknown, req: unknown, res: unknown) => Promise<unknown>;

const MCP_TYPE = '.mcp';

const makeConnector = (overrides: Partial<{ id: string; name: string; actionTypeId: string }>) => ({
  id: 'conn-1',
  name: 'My Connector',
  actionTypeId: '.github',
  isPreconfigured: false,
  isDeprecated: false,
  isSystemAction: false,
  isConnectorTypeDeprecated: false,
  ...overrides,
});

const makeSpec = (description = 'Does things', actions: Record<string, unknown> = {}) => ({
  metadata: { id: '.github', description },
  actions,
});

const mockContext = {
  licensing: Promise.resolve({
    license: { status: 'active', hasAtLeast: jest.fn().mockReturnValue(true) },
  }),
};

const mockResponse = {
  ok: jest.fn((params: { body?: unknown }) => ({ type: 'ok', ...params })),
  notFound: jest.fn((params: { body?: unknown }) => ({ type: 'notFound', ...params })),
};

describe('registerInternalConnectorRoutes', () => {
  const handlers = new Map<string, Handler>();
  let mockGetAll: jest.Mock;
  let mockGet: jest.Mock;
  let mockGetActionsClientWithRequest: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    handlers.clear();
    mockGetConnectorSpec.mockReturnValue(undefined);
    mockIsToolAction.mockReturnValue(false);

    mockGetAll = jest.fn().mockResolvedValue([]);
    mockGet = jest.fn();
    mockGetActionsClientWithRequest = jest.fn().mockResolvedValue({
      getAll: mockGetAll,
      get: mockGet,
    });

    const coreSetup = {
      getStartServices: jest
        .fn()
        .mockResolvedValue([
          {},
          { actions: { getActionsClientWithRequest: mockGetActionsClientWithRequest } },
        ]),
    };

    const mockRouter = {
      get: jest.fn().mockImplementation((config: { path: string }, routeHandler: Handler) => {
        handlers.set(config.path, routeHandler);
      }),
      versioned: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
    } as unknown as jest.Mocked<IRouter>;

    registerInternalConnectorRoutes({
      router: mockRouter,
      coreSetup,
      logger: loggingSystemMock.createLogger(),
    } as unknown as RouteDependencies);
  });

  describe(`GET ${internalApiPath}/connectors`, () => {
    const callList = (request: object = {}) =>
      handlers.get(`${internalApiPath}/connectors`)!(mockContext, request, mockResponse);

    it('registers the route', () => {
      expect(handlers.has(`${internalApiPath}/connectors`)).toBe(true);
    });

    it('returns an empty list when there are no callable connectors', async () => {
      mockGetAll.mockResolvedValue([]);

      const result = (await callList()) as { type: string; body: unknown[] };

      expect(result.type).toBe('ok');
      expect(result.body).toEqual([]);
    });

    it('filters out connectors that have no spec and are not MCP', async () => {
      mockGetAll.mockResolvedValue([
        makeConnector({ actionTypeId: '.email' }), // no spec, not MCP
        makeConnector({ id: 'conn-2', actionTypeId: '.github' }), // has spec
      ]);
      mockGetConnectorSpec.mockImplementation((id: string) =>
        id === '.github' ? makeSpec('GitHub connector') : undefined
      );

      const result = (await callList()) as { type: string; body: Array<{ type: string }> };

      expect(result.type).toBe('ok');
      expect(result.body).toHaveLength(1);
      expect(result.body[0].type).toBe('.github');
    });

    it('excludes MCP connectors (they surface as direct tools, not via discovery)', async () => {
      mockGetAll.mockResolvedValue([makeConnector({ actionTypeId: MCP_TYPE })]);
      mockGetConnectorSpec.mockReturnValue(undefined);

      const result = (await callList()) as { type: string; body: unknown[] };

      expect(result.type).toBe('ok');
      expect(result.body).toHaveLength(0);
    });

    it('uses the spec description when available', async () => {
      mockGetAll.mockResolvedValue([
        makeConnector({ id: 'c1', name: 'My GitHub', actionTypeId: '.github' }),
      ]);
      mockGetConnectorSpec.mockImplementation((id: string) =>
        id === '.github' ? makeSpec('Manage GitHub issues') : undefined
      );

      const result = (await callList()) as {
        type: string;
        body: Array<{ id: string; description: string }>;
      };

      expect(result.body.find((c) => c.id === 'c1')?.description).toBe('Manage GitHub issues');
    });
  });

  describe(`GET ${internalApiPath}/connector/{connectorId}/sub_actions`, () => {
    const callSubActions = (connectorId = 'conn-1') =>
      handlers.get(`${internalApiPath}/connector/{connectorId}/sub_actions`)!(
        mockContext,
        { params: { connectorId } },
        mockResponse
      );

    it('registers the route', () => {
      expect(handlers.has(`${internalApiPath}/connector/{connectorId}/sub_actions`)).toBe(true);
    });

    it('returns 404 when the connector type has no spec', async () => {
      mockGet.mockResolvedValue(makeConnector({ actionTypeId: '.email' }));
      mockGetConnectorSpec.mockReturnValue(undefined);

      const result = (await callSubActions()) as { type: string; body: { message: string } };

      expect(result.type).toBe('notFound');
      expect(result.body.message).toMatch('.email');
    });

    it('returns only isTool:true sub-actions', async () => {
      const spec = makeSpec('GitHub connector', {
        createIssue: { isTool: true, description: 'Create an issue', input: z.object({}) },
        internalOp: { isTool: false, description: 'Internal', input: z.object({}) },
      });
      mockGet.mockResolvedValue(makeConnector({ actionTypeId: '.github' }));
      mockGetConnectorSpec.mockReturnValue(spec);
      mockIsToolAction.mockImplementation((_: unknown, name: string) => name === 'createIssue');

      const result = (await callSubActions()) as {
        type: string;
        body: { subActions: Array<{ name: string }> };
      };

      expect(result.type).toBe('ok');
      expect(result.body.subActions).toHaveLength(1);
      expect(result.body.subActions[0].name).toBe('createIssue');
    });

    it('returns full connector detail shape', async () => {
      const spec = makeSpec('GitHub connector', {
        createIssue: { isTool: true, description: 'Create an issue', input: z.object({}) },
      });
      mockGet.mockResolvedValue(
        makeConnector({ id: 'abc', name: 'My GitHub', actionTypeId: '.github' })
      );
      mockGetConnectorSpec.mockReturnValue(spec);
      mockIsToolAction.mockReturnValue(true);

      const result = (await callSubActions('abc')) as {
        type: string;
        body: { id: string; name: string; type: string; description: string };
      };

      expect(result.type).toBe('ok');
      expect(result.body.id).toBe('abc');
      expect(result.body.name).toBe('My GitHub');
      expect(result.body.type).toBe('.github');
      expect(result.body.description).toBe('GitHub connector');
    });

    it('falls back to connector name when spec has no description', async () => {
      const spec = { metadata: { id: '.github' }, actions: {} };
      mockGet.mockResolvedValue(makeConnector({ name: 'My GitHub', actionTypeId: '.github' }));
      mockGetConnectorSpec.mockReturnValue(spec);

      const result = (await callSubActions()) as { type: string; body: { description: string } };

      expect(result.body.description).toBe('My GitHub');
    });
  });
});
