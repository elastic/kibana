/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import { kibanaResponseFactory } from '@kbn/core/server';
import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { registerInternalConversationRoutes } from './conversations';
import type { RouteDependencies } from '../types';
import { internalApiPath } from '../../../common/constants';

const MARK_READ_PATH = `${internalApiPath}/conversations/{conversation_id}/_mark_read`;

describe('registerInternalConversationRoutes - _mark_read', () => {
  let routeHandler: (ctx: any, req: any, res: any) => Promise<any>;
  let update: jest.Mock;

  const createMockContext = () => ({
    core: Promise.resolve({}),
    licensing: Promise.resolve({
      license: { status: 'active', hasAtLeast: jest.fn().mockReturnValue(true) },
    }),
  });

  const createRequest = (overrides: { params?: object; body?: object } = {}) =>
    httpServerMock.createKibanaRequest({
      method: 'post',
      path: MARK_READ_PATH,
      params: { conversation_id: 'conv-1' },
      body: { read: true },
      ...overrides,
    });

  beforeEach(() => {
    jest.clearAllMocks();

    update = jest.fn().mockResolvedValue({ id: 'conv-1', read: true });

    const getInternalServices = jest.fn().mockReturnValue({
      conversations: {
        getScopedClient: jest.fn().mockResolvedValue({ update }),
      },
    });

    const routeHandlers: Record<string, (ctx: any, req: any, res: any) => Promise<any>> = {};

    const router = {
      post: jest
        .fn()
        .mockImplementation(
          (config: { path: string }, handler: (ctx: any, req: any, res: any) => Promise<any>) => {
            routeHandlers[config.path] = handler;
          }
        ),
    } as unknown as IRouter;

    registerInternalConversationRoutes({
      router,
      getInternalServices,
      logger: loggingSystemMock.createLogger(),
    } as unknown as RouteDependencies);

    routeHandler = routeHandlers[MARK_READ_PATH];
  });

  it('updates read state using conversation accessor permissions', async () => {
    const response = await routeHandler(
      createMockContext() as any,
      createRequest(),
      kibanaResponseFactory
    );

    expect(update).toHaveBeenCalledWith({ id: 'conv-1', read: true }, { access: 'converse' });
    expect(response.status).toBe(200);
    expect(response.payload).toMatchObject({ id: 'conv-1', read: true });
  });
});

const APPLY_TEMPLATE_PATH = `${internalApiPath}/conversations/{conversation_id}/_apply_template`;

describe('registerInternalConversationRoutes - _apply_template', () => {
  let routeHandler: (ctx: any, req: any, res: any) => Promise<any>;
  let applyTemplate: jest.Mock;

  const createMockContext = () => ({
    core: Promise.resolve({}),
    licensing: Promise.resolve({
      license: { status: 'active', hasAtLeast: jest.fn().mockReturnValue(true) },
    }),
  });

  const createRequest = (overrides: { params?: object; body?: object } = {}) =>
    httpServerMock.createKibanaRequest({
      method: 'post',
      path: APPLY_TEMPLATE_PATH,
      params: { conversation_id: 'conv-1' },
      body: { template_id: 'security.phishing' },
      ...overrides,
    });

  beforeEach(() => {
    jest.clearAllMocks();

    applyTemplate = jest.fn().mockResolvedValue({ id: 'conv-1', template_id: 'security.phishing' });

    const getInternalServices = jest.fn().mockReturnValue({
      conversations: {
        getScopedClient: jest.fn().mockResolvedValue({ applyTemplate }),
      },
    });

    const routeHandlers: Record<string, (ctx: any, req: any, res: any) => Promise<any>> = {};

    const router = {
      post: jest
        .fn()
        .mockImplementation(
          (config: { path: string }, handler: (ctx: any, req: any, res: any) => Promise<any>) => {
            routeHandlers[config.path] = handler;
          }
        ),
    } as unknown as IRouter;

    registerInternalConversationRoutes({
      router,
      getInternalServices,
      logger: loggingSystemMock.createLogger(),
    } as unknown as RouteDependencies);

    routeHandler = routeHandlers[APPLY_TEMPLATE_PATH];
  });

  it('calls applyTemplate with the conversation id and template id from the request', async () => {
    const response = await routeHandler(
      createMockContext() as any,
      createRequest(),
      kibanaResponseFactory
    );

    expect(applyTemplate).toHaveBeenCalledWith('conv-1', 'security.phishing');
    expect(response.status).toBe(200);
    expect(response.payload).toMatchObject({ id: 'conv-1' });
  });

  it('returns 500 when applyTemplate throws an unexpected error', async () => {
    applyTemplate.mockRejectedValue(new Error('something went wrong'));

    const response = await routeHandler(
      createMockContext() as any,
      createRequest(),
      kibanaResponseFactory
    );

    expect(response.status).toBe(500);
  });
});
