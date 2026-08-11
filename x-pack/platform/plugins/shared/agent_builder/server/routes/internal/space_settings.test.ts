/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import { kibanaResponseFactory } from '@kbn/core/server';
import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { AgentAccessControlMode, createAgentNotFoundError } from '@kbn/agent-builder-common';
import { registerSpaceSettingsRoutes } from './space_settings';
import type { RouteDependencies } from '../types';
import { internalApiPath } from '../../../common/constants';

const GET_PATH = `${internalApiPath}/space_settings`;
const PUT_PATH = `${internalApiPath}/space_settings`;

const createContext = () => ({
  core: Promise.resolve({}),
  licensing: Promise.resolve({
    license: { status: 'active', hasAtLeast: jest.fn().mockReturnValue(true) },
  }),
  agentBuilder: Promise.resolve({
    spaces: { getSpaceId: jest.fn().mockReturnValue('default') },
  }),
});

describe('registerSpaceSettingsRoutes', () => {
  let getHandler: (ctx: any, req: any, res: any) => Promise<any>;
  let putHandler: (ctx: any, req: any, res: any) => Promise<any>;
  let mockSpaceSettingsGet: jest.Mock;
  let mockSpaceSettingsSet: jest.Mock;
  let mockRegistryGet: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSpaceSettingsGet = jest.fn();
    mockSpaceSettingsSet = jest.fn();
    // PUT resolves the agent via registry.get: it throws not-found for missing
    // ids and returns the profile whose access mode the Private guard checks.
    // Default to a permissive Public agent.
    mockRegistryGet = jest.fn().mockResolvedValue({
      id: 'agent-a',
      access_control: { access_mode: AgentAccessControlMode.Public, entries: [] },
    });

    const getInternalServices = jest.fn().mockReturnValue({
      spaceSettings: {
        get: mockSpaceSettingsGet,
        set: mockSpaceSettingsSet,
      },
      agents: {
        getRegistry: jest.fn().mockResolvedValue({
          get: mockRegistryGet,
        }),
      },
    });

    const routeHandlers: Record<string, (ctx: any, req: any, res: any) => Promise<any>> = {};

    const router = {
      get: jest
        .fn()
        .mockImplementation(
          (config: { path: string }, handler: (ctx: any, req: any, res: any) => Promise<any>) => {
            routeHandlers[`GET:${config.path}`] = handler;
          }
        ),
      put: jest
        .fn()
        .mockImplementation(
          (config: { path: string }, handler: (ctx: any, req: any, res: any) => Promise<any>) => {
            routeHandlers[`PUT:${config.path}`] = handler;
          }
        ),
    } as unknown as IRouter;

    registerSpaceSettingsRoutes({
      router,
      getInternalServices,
      logger: loggingSystemMock.createLogger(),
    } as unknown as RouteDependencies);

    getHandler = routeHandlers[`GET:${GET_PATH}`];
    putHandler = routeHandlers[`PUT:${PUT_PATH}`];
  });

  describe('GET /internal/agent_builder/space_settings', () => {
    it('returns the current assignment as `default_agent_id`', async () => {
      mockSpaceSettingsGet.mockResolvedValue({ defaultAgentId: 'agent-a' });

      const response = await getHandler(
        createContext() as any,
        httpServerMock.createKibanaRequest({ method: 'get', path: GET_PATH }),
        kibanaResponseFactory
      );

      expect(response.status).toBe(200);
      expect(response.payload).toEqual({ default_agent_id: 'agent-a' });
    });

    it('returns null when no agent is assigned', async () => {
      mockSpaceSettingsGet.mockResolvedValue({ defaultAgentId: null });

      const response = await getHandler(
        createContext() as any,
        httpServerMock.createKibanaRequest({ method: 'get', path: GET_PATH }),
        kibanaResponseFactory
      );

      expect(response.status).toBe(200);
      expect(response.payload).toEqual({ default_agent_id: null });
    });

    it('returns the raw stored assignment without resolving reachability', async () => {
      // The GET route is a plain read: whether the assigned agent is still
      // reachable (deleted / made private) is resolved client-side against the
      // agents list, so the route returns the stored id verbatim.
      mockSpaceSettingsGet.mockResolvedValue({ defaultAgentId: 'maybe-gone-agent' });

      const response = await getHandler(
        createContext() as any,
        httpServerMock.createKibanaRequest({ method: 'get', path: GET_PATH }),
        kibanaResponseFactory
      );

      expect(response.status).toBe(200);
      expect(response.payload).toEqual({ default_agent_id: 'maybe-gone-agent' });
    });
  });

  describe('PUT /internal/agent_builder/space_settings', () => {
    it('persists the assignment when the agent exists in the space', async () => {
      mockSpaceSettingsSet.mockResolvedValue({ defaultAgentId: 'agent-a' });

      const response = await putHandler(
        createContext() as any,
        httpServerMock.createKibanaRequest({
          method: 'put',
          path: PUT_PATH,
          body: { default_agent_id: 'agent-a' },
        }),
        kibanaResponseFactory
      );

      expect(mockRegistryGet).toHaveBeenCalledWith('agent-a');
      expect(mockSpaceSettingsSet).toHaveBeenCalledWith(expect.anything(), 'agent-a');
      expect(response.status).toBe(200);
      expect(response.payload).toEqual({ default_agent_id: 'agent-a' });
    });

    it('returns a 404 when the assigned agent id does not resolve in the space', async () => {
      // registry.get throws a not-found error; the route wrapper maps Agent
      // Builder errors to customError responses using their status code (404).
      mockRegistryGet.mockRejectedValue(createAgentNotFoundError({ agentId: 'missing-agent' }));

      const response = await putHandler(
        createContext() as any,
        httpServerMock.createKibanaRequest({
          method: 'put',
          path: PUT_PATH,
          body: { default_agent_id: 'missing-agent' },
        }),
        kibanaResponseFactory
      );

      expect(response.status).toBe(404);
      expect(mockSpaceSettingsSet).not.toHaveBeenCalled();
    });

    it('clears the assignment when body carries null and skips the agent lookup', async () => {
      mockSpaceSettingsSet.mockResolvedValue({ defaultAgentId: null });

      const response = await putHandler(
        createContext() as any,
        httpServerMock.createKibanaRequest({
          method: 'put',
          path: PUT_PATH,
          body: { default_agent_id: null },
        }),
        kibanaResponseFactory
      );

      expect(mockRegistryGet).not.toHaveBeenCalled();
      expect(mockSpaceSettingsSet).toHaveBeenCalledWith(expect.anything(), null);
      expect(response.status).toBe(200);
      expect(response.payload).toEqual({ default_agent_id: null });
    });

    it('rejects with 400 when the target agent is Private', async () => {
      // Private grants access to owner + explicit ACL entries + wildcard
      // admins only, so it can't be a valid space default that every
      // restricted user is pinned to.
      mockRegistryGet.mockResolvedValue({
        id: 'private-agent',
        access_control: { access_mode: AgentAccessControlMode.Private, entries: [] },
      });

      const response = await putHandler(
        createContext() as any,
        httpServerMock.createKibanaRequest({
          method: 'put',
          path: PUT_PATH,
          body: { default_agent_id: 'private-agent' },
        }),
        kibanaResponseFactory
      );

      expect(response.status).toBe(400);
      expect(mockSpaceSettingsSet).not.toHaveBeenCalled();
    });

    it('accepts Shared agents as space default', async () => {
      // Shared grants read/use to every user with the base Agent Builder
      // privilege, so it is safe to pin — only writes are restricted to the
      // owner.
      mockRegistryGet.mockResolvedValue({
        id: 'shared-agent',
        access_control: { access_mode: AgentAccessControlMode.Shared, entries: [] },
      });
      mockSpaceSettingsSet.mockResolvedValue({ defaultAgentId: 'shared-agent' });

      const response = await putHandler(
        createContext() as any,
        httpServerMock.createKibanaRequest({
          method: 'put',
          path: PUT_PATH,
          body: { default_agent_id: 'shared-agent' },
        }),
        kibanaResponseFactory
      );

      expect(response.status).toBe(200);
      expect(mockSpaceSettingsSet).toHaveBeenCalledWith(expect.anything(), 'shared-agent');
    });
  });
});
