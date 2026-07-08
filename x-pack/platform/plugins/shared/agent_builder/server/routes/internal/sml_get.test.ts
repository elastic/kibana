/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import { kibanaResponseFactory } from '@kbn/core/server';
import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { SmlDocument } from '@kbn/agent-builder-server';
import {
  AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID,
  CONTEXT_ENGINE_ENABLED_SETTING_ID,
} from '@kbn/management-settings-ids';
import type { RouteDependencies } from '../types';
import { registerInternalSmlGetRoute } from './sml_get';

describe('registerInternalSmlGetRoute', () => {
  let routeHandler: (ctx: any, req: any, res: any) => Promise<any>;
  let mockFindByOrigin: jest.Mock;
  let mockCheckItemsAccess: jest.Mock;
  let mockUiSettingsGet: jest.Mock;

  const createContext = (flagValues: Record<string, boolean> = {}) => ({
    core: Promise.resolve({
      elasticsearch: {
        client: { asCurrentUser: {}, asInternalUser: {} },
      },
      uiSettings: {
        client: {
          get: mockUiSettingsGet.mockImplementation(async (key: string) => flagValues[key] ?? true),
        },
      },
    }),
    agentBuilder: Promise.resolve({
      spaces: { getSpaceId: () => 'test-space' },
    }),
    licensing: Promise.resolve({
      license: { status: 'active', hasAtLeast: jest.fn().mockReturnValue(true) },
    }),
  });

  const enabledContext = () =>
    createContext({
      [AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID]: true,
      [CONTEXT_ENGINE_ENABLED_SETTING_ID]: true,
    });

  const disabledContext = () =>
    createContext({
      [AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID]: true,
      [CONTEXT_ENGINE_ENABLED_SETTING_ID]: false,
    });

  const createRequest = (type = 'dashboard', originId = 'origin-1') =>
    httpServerMock.createKibanaRequest({
      method: 'get',
      path: `/internal/agent_builder/sml/${type}/${originId}`,
      params: { type, originId },
    });

  const makeSmlDocument = (overrides: Partial<SmlDocument> = {}): SmlDocument => ({
    id: 'chunk-1',
    type: 'dashboard',
    title: 'My Dashboard',
    origin: { uri: 'dashboard://origin-1' },
    content: 'dashboard content',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-02T00:00:00Z',
    spaces: ['test-space'],
    permissions: { kibana: { privileges: [] } },
    ingestion_method: 'crawled',
    tags: ['tag-1'],
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();

    mockFindByOrigin = jest.fn().mockResolvedValue([makeSmlDocument()]);
    mockCheckItemsAccess = jest.fn().mockResolvedValue(new Map([['chunk-1', true]]));
    mockUiSettingsGet = jest.fn();

    const coreSetup = {
      getStartServices: jest.fn().mockResolvedValue([
        {},
        {},
        {
          smlService: {
            findByOrigin: mockFindByOrigin,
            checkItemsAccess: mockCheckItemsAccess,
          },
        },
      ]),
    };

    const handlers: Record<string, (ctx: any, req: any, res: any) => Promise<any>> = {};
    const mockRouter = {
      get: jest
        .fn()
        .mockImplementation(
          (config: { path: string }, handler: (ctx: any, req: any, res: any) => Promise<any>) => {
            handlers[config.path] = handler;
          }
        ),
    } as unknown as IRouter;

    registerInternalSmlGetRoute({
      router: mockRouter,
      logger: loggingSystemMock.createLogger(),
      coreSetup,
    } as unknown as RouteDependencies);

    routeHandler = handlers['/internal/agent_builder/sml/{type}/{originId}'];
  });

  it('returns 404 when feature flags are disabled', async () => {
    const response = await routeHandler(disabledContext(), createRequest(), kibanaResponseFactory);

    expect(response.status).toBe(404);
    expect(mockFindByOrigin).not.toHaveBeenCalled();
  });

  it('returns 404 when no chunks exist', async () => {
    mockFindByOrigin.mockResolvedValue([]);

    const response = await routeHandler(enabledContext(), createRequest(), kibanaResponseFactory);

    expect(response.status).toBe(404);
    expect(mockCheckItemsAccess).not.toHaveBeenCalled();
  });

  it('returns 404 when every chunk is unauthorized', async () => {
    mockCheckItemsAccess.mockResolvedValue(new Map([['chunk-1', false]]));

    const response = await routeHandler(enabledContext(), createRequest(), kibanaResponseFactory);

    expect(response.status).toBe(404);
  });

  it('returns 200 with authorized chunks', async () => {
    const response = await routeHandler(enabledContext(), createRequest(), kibanaResponseFactory);

    expect(response.status).toBe(200);
    expect(response.payload).toEqual({
      items: [
        {
          id: 'chunk-1',
          type: 'dashboard',
          title: 'My Dashboard',
          origin: { uri: 'dashboard://origin-1' },
          content: 'dashboard content',
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-02T00:00:00Z',
          spaces: ['test-space'],
          tags: ['tag-1'],
          permissions: { kibana: { privileges: [] } },
          ingestion_method: 'crawled',
        },
      ],
    });
  });

  it('drops unauthorized chunks from the response', async () => {
    const doc1 = makeSmlDocument({ id: 'chunk-1' });
    const doc2 = makeSmlDocument({ id: 'chunk-2', title: 'Secret Dashboard' });
    mockFindByOrigin.mockResolvedValue([doc1, doc2]);
    mockCheckItemsAccess.mockResolvedValue(
      new Map([
        ['chunk-1', true],
        ['chunk-2', false],
      ])
    );

    const response = await routeHandler(enabledContext(), createRequest(), kibanaResponseFactory);

    expect(response.status).toBe(200);
    expect(response.payload.items).toHaveLength(1);
    expect(response.payload.items[0].id).toBe('chunk-1');
  });

  it('propagates errors from smlService', async () => {
    mockFindByOrigin.mockRejectedValue(new Error('es unavailable'));

    const response = await routeHandler(enabledContext(), createRequest(), kibanaResponseFactory);

    // wrapHandler catches the rethrown error and returns 500
    expect(response.status).toBe(500);
    expect(response.payload).toMatchObject({ message: 'es unavailable' });
  });
});
