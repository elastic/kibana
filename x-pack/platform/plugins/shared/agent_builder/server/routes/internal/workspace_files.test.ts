/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import { kibanaResponseFactory } from '@kbn/core/server';
import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { createBadRequestError, createConversationNotFoundError } from '@kbn/agent-builder-common';
import type { RouteDependencies } from '../types';
import type { InternalStartServices } from '../../services';
import { internalApiPath } from '../../../common/constants';
import { registerWorkspaceFileRoutes } from './workspace_files';

const ROUTE_PATH = `${internalApiPath}/conversations/{conversation_id}/files`;

describe('Workspace files route', () => {
  let routeHandler: (ctx: any, req: any, res: any) => Promise<any>;
  let mockReadFile: jest.Mock;

  const createContext = () =>
    ({
      licensing: Promise.resolve({
        license: { status: 'active', hasAtLeast: jest.fn().mockReturnValue(true) },
      }),
    } as any);

  const createRequest = (path: string, conversationId = 'conv-1') =>
    httpServerMock.createKibanaRequest({
      method: 'get',
      path: ROUTE_PATH,
      params: { conversation_id: conversationId },
      query: { path },
    });

  beforeEach(() => {
    jest.clearAllMocks();

    mockReadFile = jest.fn();
    const workspacesService = {
      getScopedClient: jest.fn().mockResolvedValue({ readFile: mockReadFile }),
    };
    const getInternalServices = () =>
      ({ workspaces: workspacesService } as unknown as InternalStartServices);

    const handlers: Record<string, any> = {};
    const mockRouter = {
      get: jest.fn().mockImplementation((config: { path: string }, handler: any) => {
        handlers[config.path] = handler;
      }),
    } as unknown as jest.Mocked<IRouter>;

    registerWorkspaceFileRoutes({
      router: mockRouter,
      getInternalServices,
      logger: loggingSystemMock.createLogger(),
    } as unknown as RouteDependencies);

    routeHandler = handlers[ROUTE_PATH];
  });

  it('registers the route handler', () => {
    expect(routeHandler).toBeDefined();
  });

  it('returns the file content for a resolved read', async () => {
    mockReadFile.mockResolvedValue({
      path: '/workspace/renders/table/x.json',
      content: '{"hello":"world"}',
    });

    const response = await routeHandler(
      createContext(),
      createRequest('/workspace/renders/table/x.json'),
      kibanaResponseFactory
    );

    expect(response.status).toBe(200);
    expect(response.payload).toEqual({
      path: '/workspace/renders/table/x.json',
      content: '{"hello":"world"}',
    });
    expect(mockReadFile).toHaveBeenCalledWith({
      conversationId: 'conv-1',
      path: '/workspace/renders/table/x.json',
    });
  });

  it('returns 404 when the read resolves to nothing (no workspace / missing file)', async () => {
    mockReadFile.mockResolvedValue(undefined);

    const response = await routeHandler(
      createContext(),
      createRequest('/workspace/renders/table/missing.json'),
      kibanaResponseFactory
    );

    expect(response.status).toBe(404);
  });

  it('maps a bad-path error to 400', async () => {
    mockReadFile.mockRejectedValue(createBadRequestError('Path must be within /workspace'));

    const response = await routeHandler(
      createContext(),
      createRequest('/workspace/../etc/passwd'),
      kibanaResponseFactory
    );

    expect(response.status).toBe(400);
  });

  it('maps conversation not-found (no access) to 404', async () => {
    mockReadFile.mockRejectedValue(createConversationNotFoundError({ conversationId: 'conv-1' }));

    const response = await routeHandler(
      createContext(),
      createRequest('/workspace/renders/table/x.json'),
      kibanaResponseFactory
    );

    expect(response.status).toBe(404);
  });
});
