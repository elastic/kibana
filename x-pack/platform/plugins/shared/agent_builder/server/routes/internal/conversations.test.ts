/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import { kibanaResponseFactory } from '@kbn/core/server';
import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { createBadRequestError } from '@kbn/agent-builder-common';
import { registerInternalConversationRoutes } from './conversations';
import type { RouteDependencies } from '../types';
import { internalApiPath } from '../../../common/constants';

const MARK_READ_PATH = `${internalApiPath}/conversations/{conversation_id}/_mark_read`;
const SET_PINNED_PATH = `${internalApiPath}/conversations/{conversation_id}/_set_pinned`;

describe('registerInternalConversationRoutes - _mark_read', () => {
  let routeHandler: (ctx: any, req: any, res: any) => Promise<any>;
  let markRead: jest.Mock;

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

    markRead = jest.fn().mockResolvedValue({ id: 'conv-1', read: true });

    const getInternalServices = jest.fn().mockReturnValue({
      conversations: {
        getScopedClient: jest.fn().mockResolvedValue({ markRead }),
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
      patch: jest.fn(),
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

    expect(markRead).toHaveBeenCalledWith('conv-1', true);
    expect(response.status).toBe(200);
    expect(response.payload).toMatchObject({ id: 'conv-1', read: true });
  });
});

const APPLY_TEMPLATE_PATH = `${internalApiPath}/conversations/{conversation_id}/_apply_template`;

describe('registerInternalConversationRoutes - _apply_template', () => {
  let routeHandler: (ctx: any, req: any, res: any) => Promise<any>;
  let applyTemplate: jest.Mock;

  const createMockContext = ({ featureFlagEnabled = true } = {}) => ({
    core: Promise.resolve({
      uiSettings: { client: { get: jest.fn().mockResolvedValue(featureFlagEnabled) } },
    }),
    licensing: Promise.resolve({
      license: { status: 'active', hasAtLeast: jest.fn().mockReturnValue(true) },
    }),
  });

  const createRequest = (overrides: { params?: object; body?: object } = {}) =>
    httpServerMock.createKibanaRequest({
      method: 'post',
      path: APPLY_TEMPLATE_PATH,
      params: { conversation_id: 'conv-1' },
      body: { template_id: 'phishing' },
      ...overrides,
    });

  beforeEach(() => {
    jest.clearAllMocks();

    applyTemplate = jest
      .fn()
      .mockResolvedValue({ id: 'conv-1', template_id: 'phishing', template_version: 1 });

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
      patch: jest.fn(),
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

    expect(applyTemplate).toHaveBeenCalledWith('conv-1', 'phishing');
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

  it('returns 404 when the experimental features flag is disabled', async () => {
    const response = await routeHandler(
      createMockContext({ featureFlagEnabled: false }) as any,
      createRequest(),
      kibanaResponseFactory
    );

    expect(response.status).toBe(404);
    expect(applyTemplate).not.toHaveBeenCalled();
  });
});

const PATCH_METADATA_PATH = `${internalApiPath}/conversations/{conversation_id}/metadata`;

describe('registerInternalConversationRoutes - PATCH /metadata', () => {
  let routeHandler: (ctx: any, req: any, res: any) => Promise<any>;
  let patchMetadata: jest.Mock;

  const createMockContext = ({ featureFlagEnabled = true } = {}) => ({
    core: Promise.resolve({
      uiSettings: { client: { get: jest.fn().mockResolvedValue(featureFlagEnabled) } },
    }),
    licensing: Promise.resolve({
      license: { status: 'active', hasAtLeast: jest.fn().mockReturnValue(true) },
    }),
  });

  const createRequest = (overrides: { params?: object; body?: object } = {}) =>
    httpServerMock.createKibanaRequest({
      method: 'patch',
      path: PATCH_METADATA_PATH,
      params: { conversation_id: 'conv-1' },
      body: { metadata: { severity: 'high' } },
      ...overrides,
    });

  beforeEach(() => {
    jest.clearAllMocks();

    patchMetadata = jest.fn().mockResolvedValue({
      conversation: { id: 'conv-1', metadata: { severity: 'high' } },
      changedFields: [],
    });

    const getInternalServices = jest.fn().mockReturnValue({
      conversations: {
        getScopedClient: jest.fn().mockResolvedValue({ patchMetadata }),
      },
    });

    const routeHandlers: Record<string, (ctx: any, req: any, res: any) => Promise<any>> = {};

    const router = {
      post: jest.fn(),
      patch: jest
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

    routeHandler = routeHandlers[PATCH_METADATA_PATH];
  });

  it('calls patchMetadata with the conversation id and metadata from the request', async () => {
    const response = await routeHandler(
      createMockContext() as any,
      createRequest(),
      kibanaResponseFactory
    );

    expect(patchMetadata).toHaveBeenCalledWith('conv-1', { severity: 'high' });
    expect(response.status).toBe(200);
    expect(response.payload).toMatchObject({ id: 'conv-1', metadata: { severity: 'high' } });
  });

  it('returns 400 when patchMetadata throws a bad-request error', async () => {
    patchMetadata.mockRejectedValue(createBadRequestError('invalid field'));

    const response = await routeHandler(
      createMockContext() as any,
      createRequest(),
      kibanaResponseFactory
    );

    expect(response.status).toBe(400);
  });

  it('returns 500 when patchMetadata throws an unexpected error', async () => {
    patchMetadata.mockRejectedValue(new Error('unexpected'));

    const response = await routeHandler(
      createMockContext() as any,
      createRequest(),
      kibanaResponseFactory
    );

    expect(response.status).toBe(500);
  });

  it('returns 404 when the experimental features flag is disabled', async () => {
    const response = await routeHandler(
      createMockContext({ featureFlagEnabled: false }) as any,
      createRequest(),
      kibanaResponseFactory
    );

    expect(response.status).toBe(404);
    expect(patchMetadata).not.toHaveBeenCalled();
  });
});

describe('registerInternalConversationRoutes - _set_pinned', () => {
  let routeHandler: (ctx: any, req: any, res: any) => Promise<any>;
  let setPinned: jest.Mock;

  const createMockContext = () => ({
    core: Promise.resolve({}),
    licensing: Promise.resolve({
      license: { status: 'active', hasAtLeast: jest.fn().mockReturnValue(true) },
    }),
  });

  const createRequest = (overrides: { params?: object; body?: object } = {}) =>
    httpServerMock.createKibanaRequest({
      method: 'post',
      path: SET_PINNED_PATH,
      params: { conversation_id: 'conv-1' },
      body: { pinned: true },
      ...overrides,
    });

  beforeEach(() => {
    jest.clearAllMocks();

    setPinned = jest.fn().mockResolvedValue({ id: 'conv-1', pinned: true });

    const getInternalServices = jest.fn().mockReturnValue({
      conversations: {
        getScopedClient: jest.fn().mockResolvedValue({ setPinned }),
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
      patch: jest.fn(),
    } as unknown as IRouter;

    registerInternalConversationRoutes({
      router,
      getInternalServices,
      logger: loggingSystemMock.createLogger(),
    } as unknown as RouteDependencies);

    routeHandler = routeHandlers[SET_PINNED_PATH];
  });

  it('updates pinned state for the calling user only', async () => {
    const response = await routeHandler(
      createMockContext() as any,
      createRequest(),
      kibanaResponseFactory
    );

    expect(setPinned).toHaveBeenCalledWith('conv-1', true);
    expect(response.status).toBe(200);
    expect(response.payload).toMatchObject({ id: 'conv-1', pinned: true });
  });
});
