/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import type { ObjectType } from '@kbn/config-schema';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { AgentAccessControlMode } from '@kbn/agent-builder-common';
import { CONTEXT_ENGINE_ENABLED_SETTING_ID } from '@kbn/management-settings-ids';
import { registerAgentRoutes } from './agents';
import type { RouteDependencies } from './types';
import { publicApiPath } from '../../common/constants';

describe('Agent Routes - experimental access-control gate', () => {
  const createPath = `${publicApiPath}/agents`;
  const updatePath = `${publicApiPath}/agents/{id}`;
  let routeHandlers: Record<
    string,
    { handler: (ctx: unknown, req: unknown, res: unknown) => Promise<unknown> }
  >;
  let mockCreate: jest.Mock;
  let mockUpdate: jest.Mock;
  let mockAuditLogCreated: jest.Mock;
  let mockAuditLogUpdated: jest.Mock;
  let mockUiSettingsGet: jest.Mock;

  // Keyed rather than a blanket `mockResolvedValue` so these tests only drive the experimental
  // features flag, and don't incidentally enable the Context Engine as well.
  const createMockContext = (experimentalFeaturesEnabled: boolean) => ({
    core: Promise.resolve({
      uiSettings: {
        client: {
          get: mockUiSettingsGet.mockImplementation(async (key: string) =>
            key === CONTEXT_ENGINE_ENABLED_SETTING_ID ? false : experimentalFeaturesEnabled
          ),
        },
      },
    }),
    licensing: Promise.resolve({
      license: { status: 'active', hasAtLeast: jest.fn().mockReturnValue(true) },
    }),
    agentBuilder: Promise.resolve({
      spaces: { getSpaceId: jest.fn().mockReturnValue('default') },
    }),
  });

  const createBody = {
    id: 'agent-1',
    name: 'Test Agent',
    description: 'Test',
    configuration: { tools: [] },
  };

  const updateBodyWithAccessControl = {
    name: 'Updated',
    access_control: { access_mode: AgentAccessControlMode.Private },
  };

  const mockProfile = {
    id: 'agent-1',
    name: 'Test Agent',
    description: 'Test',
    configuration: { tools: [] },
    access_control: { access_mode: AgentAccessControlMode.Public, entries: [] },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    routeHandlers = {};
    mockCreate = jest.fn().mockResolvedValue(mockProfile);
    mockUpdate = jest.fn().mockResolvedValue(mockProfile);
    mockAuditLogCreated = jest.fn();
    mockAuditLogUpdated = jest.fn();
    mockUiSettingsGet = jest.fn();

    const mockRegistry = {
      create: mockCreate,
      update: mockUpdate,
    };

    const getInternalServices = jest.fn().mockReturnValue({
      agents: {
        getRegistry: jest.fn().mockResolvedValue(mockRegistry),
      },
      auditLogService: {
        logAgentCreated: mockAuditLogCreated,
        logAgentUpdated: mockAuditLogUpdated,
      },
    });

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

    const mockRouter = {
      get: jest.fn(),
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
    } as unknown as jest.Mocked<IRouter>;

    registerAgentRoutes({
      router: mockRouter,
      getInternalServices,
      logger: loggingSystemMock.createLogger(),
      analyticsService: undefined,
    } as unknown as RouteDependencies);
  });

  const getCreateHandler = () => routeHandlers[`POST:${createPath}`]?.handler;
  const getUpdateHandler = () => routeHandlers[`PUT:${updatePath}`]?.handler;

  const mockResponse = {
    ok: jest.fn((params: { body?: unknown }) => ({ type: 'ok', ...params })),
    badRequest: jest.fn((params: { body?: { message?: string } }) => ({
      type: 'badRequest',
      ...params,
    })),
  };

  describe('POST /agents (create)', () => {
    it('allows create and calls service.create when access-control mode is provided', async () => {
      const handler = getCreateHandler();
      expect(handler).toBeDefined();

      const ctx = createMockContext(true);
      const request = {
        body: {
          ...createBody,
          access_control: { access_mode: AgentAccessControlMode.Shared },
        },
      };

      const result = await handler!(ctx, request, mockResponse);

      expect(mockCreate).toHaveBeenCalledWith({
        ...createBody,
        access_control: { access_mode: AgentAccessControlMode.Shared },
      });
      expect(result).toMatchObject({ type: 'ok', body: mockProfile });
    });

    it('allows create without access control when experimental setting is false', async () => {
      const handler = getCreateHandler();
      expect(handler).toBeDefined();

      const ctx = createMockContext(false);
      const request = { body: createBody };

      const result = await handler!(ctx, request, mockResponse);

      expect(mockCreate).toHaveBeenCalledWith(createBody);
      expect(result).toMatchObject({ type: 'ok', body: mockProfile });
    });
  });

  describe('PUT /agents/{id} (update)', () => {
    it('allows update and calls service.update when access-control mode is provided', async () => {
      const handler = getUpdateHandler();
      expect(handler).toBeDefined();

      const ctx = createMockContext(true);
      const request = {
        params: { id: 'agent-1' },
        body: updateBodyWithAccessControl,
      };

      const result = await handler!(ctx, request, mockResponse);

      expect(mockUpdate).toHaveBeenCalledWith('agent-1', {
        name: 'Updated',
        access_control: { access_mode: AgentAccessControlMode.Private },
      });
      expect(result).toMatchObject({ type: 'ok', body: mockProfile });
    });

    it('allows non-access-control updates when experimental setting is false', async () => {
      const handler = getUpdateHandler();
      expect(handler).toBeDefined();

      const ctx = createMockContext(false);
      const request = {
        params: { id: 'agent-1' },
        body: { name: 'Updated Name' },
      };

      const result = await handler!(ctx, request, mockResponse);

      expect(mockUpdate).toHaveBeenCalledWith('agent-1', { name: 'Updated Name' });
      expect(result).toMatchObject({ type: 'ok', body: mockProfile });
    });
  });
});

describe('Agent Routes - ai_indices Context Engine gate', () => {
  const listPath = `${publicApiPath}/agents`;
  const getPath = `${publicApiPath}/agents/{id}`;
  type Handler = (ctx: unknown, req: unknown, res: unknown) => Promise<unknown>;

  let routeHandlers: Record<string, { handler: Handler }>;
  let mockGet: jest.Mock;
  let mockList: jest.Mock;
  let mockCreate: jest.Mock;
  let mockUpdate: jest.Mock;

  const agentWithoutAiIndices = {
    id: 'agent-1',
    name: 'Test Agent',
    description: 'Test',
    configuration: { tools: [], instructions: 'do things' },
    access_control: { access_mode: AgentAccessControlMode.Public, entries: [] },
  };
  const agentWithAiIndices = {
    ...agentWithoutAiIndices,
    id: 'agent-2',
    configuration: { ...agentWithoutAiIndices.configuration, ai_indices: ['stored-index'] },
  };

  const createMockContext = (contextEngineEnabled: boolean) => ({
    core: Promise.resolve({
      uiSettings: {
        client: {
          get: jest.fn(async (key: string) =>
            key === CONTEXT_ENGINE_ENABLED_SETTING_ID ? contextEngineEnabled : true
          ),
        },
      },
    }),
    licensing: Promise.resolve({
      license: { status: 'active', hasAtLeast: jest.fn().mockReturnValue(true) },
    }),
    agentBuilder: Promise.resolve({
      spaces: { getSpaceId: jest.fn().mockReturnValue('default') },
    }),
  });

  const mockResponse = {
    ok: jest.fn((params: { body?: unknown }) => ({ type: 'ok', ...params })),
    badRequest: jest.fn((params: { body?: { message?: string } }) => ({
      type: 'badRequest',
      ...params,
    })),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    routeHandlers = {};
    mockGet = jest.fn().mockResolvedValue(agentWithoutAiIndices);
    mockList = jest.fn().mockResolvedValue([agentWithoutAiIndices, agentWithAiIndices]);
    mockCreate = jest.fn(async (createRequest) => ({
      ...agentWithoutAiIndices,
      ...createRequest,
    }));
    mockUpdate = jest.fn(async (agentId, update) => ({
      ...agentWithoutAiIndices,
      id: agentId,
      configuration: { ...agentWithoutAiIndices.configuration, ...update.configuration },
    }));

    const getInternalServices = jest.fn().mockReturnValue({
      agents: {
        getRegistry: jest.fn().mockResolvedValue({
          get: mockGet,
          list: mockList,
          create: mockCreate,
          update: mockUpdate,
        }),
      },
      auditLogService: { logAgentCreated: jest.fn(), logAgentUpdated: jest.fn() },
    });

    const createVersionedRoute = (method: string, path: string) => ({
      addVersion: jest.fn().mockImplementation((_config: unknown, handler: Handler) => {
        routeHandlers[`${method}:${path}`] = { handler };
        return { addVersion: jest.fn() };
      }),
    });

    const mockRouter = {
      get: jest.fn(),
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
    } as unknown as jest.Mocked<IRouter>;

    registerAgentRoutes({
      router: mockRouter,
      getInternalServices,
      logger: loggingSystemMock.createLogger(),
      analyticsService: undefined,
    } as unknown as RouteDependencies);
  });

  const callGet = (contextEngineEnabled: boolean) =>
    routeHandlers[`GET:${getPath}`].handler(
      createMockContext(contextEngineEnabled),
      { params: { id: 'agent-1' } },
      mockResponse
    ) as Promise<{ type: string; body: { configuration: Record<string, unknown> } }>;

  const callList = (contextEngineEnabled: boolean) =>
    routeHandlers[`GET:${listPath}`].handler(
      createMockContext(contextEngineEnabled),
      {},
      mockResponse
    ) as Promise<{
      type: string;
      body: { results: Array<{ configuration: Record<string, unknown> }> };
    }>;

  const callCreate = (contextEngineEnabled: boolean, configuration: Record<string, unknown>) =>
    routeHandlers[`POST:${listPath}`].handler(
      createMockContext(contextEngineEnabled),
      { body: { id: 'agent-1', name: 'Test Agent', description: 'Test', configuration } },
      mockResponse
    ) as Promise<{
      type: string;
      body: { message?: string; configuration?: Record<string, unknown> };
    }>;

  const callUpdate = (contextEngineEnabled: boolean, body: Record<string, unknown>) =>
    routeHandlers[`PUT:${getPath}`].handler(
      createMockContext(contextEngineEnabled),
      { params: { id: 'agent-1' }, body },
      mockResponse
    ) as Promise<{
      type: string;
      body: { message?: string; configuration?: Record<string, unknown> };
    }>;

  describe('when the Context Engine is disabled', () => {
    it('omits ai_indices from the get response', async () => {
      const result = await callGet(false);

      expect(result.type).toBe('ok');
      expect(result.body.configuration).not.toHaveProperty('ai_indices');
    });

    it('omits ai_indices from every entry in the list response', async () => {
      const result = await callList(false);

      expect(result.body.results).toHaveLength(2);
      for (const agent of result.body.results) {
        expect(agent.configuration).not.toHaveProperty('ai_indices');
      }
    });

    it('rejects create with ai_indices and never reaches the service', async () => {
      const result = await callCreate(false, { tools: [], ai_indices: ['my-index'] });

      expect(result.type).toBe('badRequest');
      expect(result.body.message).toContain('ai_indices');
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('rejects update with ai_indices and never reaches the service', async () => {
      const result = await callUpdate(false, { configuration: { ai_indices: ['my-index'] } });

      expect(result.type).toBe('badRequest');
      expect(result.body.message).toContain('ai_indices');
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('allows create and update that leave ai_indices alone', async () => {
      expect((await callCreate(false, { tools: [] })).type).toBe('ok');
      expect((await callUpdate(false, { name: 'Updated' })).type).toBe('ok');
      expect((await callUpdate(false, { configuration: { instructions: 'hi' } })).type).toBe('ok');
    });
  });

  describe('when the Context Engine is enabled', () => {
    it('defaults ai_indices to [] when the agent has none stored', async () => {
      const result = await callGet(true);

      expect(result.body.configuration.ai_indices).toEqual([]);
    });

    it('returns the stored ai_indices when the agent has them', async () => {
      mockGet.mockResolvedValue(agentWithAiIndices);

      const result = await callGet(true);

      expect(result.body.configuration.ai_indices).toEqual(['stored-index']);
    });

    it('shapes every entry in the list response', async () => {
      const result = await callList(true);

      expect(result.body.results.map(({ configuration }) => configuration.ai_indices)).toEqual([
        [],
        ['stored-index'],
      ]);
    });

    it('accepts ai_indices on create and echoes it back', async () => {
      const result = await callCreate(true, { tools: [], ai_indices: ['my-index'] });

      expect(result.type).toBe('ok');
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          configuration: { tools: [], ai_indices: ['my-index'] },
        })
      );
      expect(result.body.configuration?.ai_indices).toEqual(['my-index']);
    });

    it('accepts ai_indices on update and echoes it back', async () => {
      const result = await callUpdate(true, { configuration: { ai_indices: ['my-index'] } });

      expect(result.type).toBe('ok');
      expect(mockUpdate).toHaveBeenCalledWith('agent-1', {
        configuration: { ai_indices: ['my-index'] },
      });
      expect(result.body.configuration?.ai_indices).toEqual(['my-index']);
    });
  });
});

describe('Agent Routes - request body schemas', () => {
  const createPath = `${publicApiPath}/agents`;
  const updatePath = `${publicApiPath}/agents/{id}`;
  const routeSchemas: Record<string, ObjectType> = {};

  beforeAll(() => {
    const createVersionedRoute = (method: string, path: string) => ({
      addVersion: jest.fn().mockImplementation((config: any) => {
        if (config?.validate?.request?.body) {
          routeSchemas[`${method}:${path}`] = config.validate.request.body;
        }
        return { addVersion: jest.fn() };
      }),
    });

    const mockRouter = {
      get: jest.fn(),
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
    } as unknown as jest.Mocked<IRouter>;

    registerAgentRoutes({
      router: mockRouter,
      getInternalServices: jest.fn(),
      logger: loggingSystemMock.createLogger(),
      analyticsService: undefined,
    } as unknown as RouteDependencies);
  });

  const createBody = {
    id: 'agent-1',
    name: 'Test Agent',
    description: 'Test',
    configuration: { tools: [] },
  };

  it('rejects type on create (typed agents are created in code, not via the API)', () => {
    const schema = routeSchemas[`POST:${createPath}`];

    expect(() => schema.validate(createBody)).not.toThrow();
    expect(() => schema.validate({ ...createBody, type: 'investigation' })).toThrow(
      /'type' was unexpected/
    );
  });

  it('rejects type on update (type is immutable)', () => {
    const schema = routeSchemas[`PUT:${updatePath}`];

    expect(() => schema.validate({ name: 'Updated' })).not.toThrow();
    expect(() => schema.validate({ name: 'Updated', type: 'investigation' })).toThrow(
      /'type' was unexpected/
    );
  });
});
