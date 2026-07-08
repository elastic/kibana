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
import { registerInternalSmlListRoute } from './sml_list';
import { SmlResultWindowExceededError } from '../../services/sml/sml_result_window_exceeded_error';

describe('registerInternalSmlListRoute', () => {
  let routeHandler: (ctx: any, req: any, res: any) => Promise<any>;
  let mockListDocuments: jest.Mock;
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
      [AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID]: false,
      [CONTEXT_ENGINE_ENABLED_SETTING_ID]: false,
    });

  const createRequest = (query: Record<string, unknown> = {}) =>
    httpServerMock.createKibanaRequest({
      method: 'get',
      path: '/internal/agent_builder/sml',
      query: { page: 1, per_page: 20, ...query },
    });

  const makeSmlDocument = (overrides: Partial<SmlDocument> = {}): SmlDocument => ({
    id: 'doc-1',
    type: 'dashboard',
    title: 'My Dashboard',
    origin: { uri: 'dashboard://doc-1' },
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

    mockListDocuments = jest.fn().mockResolvedValue({
      total: 1,
      results: [makeSmlDocument()],
    });
    mockCheckItemsAccess = jest.fn().mockResolvedValue(new Map([['doc-1', true]]));
    mockUiSettingsGet = jest.fn();

    const coreSetup = {
      getStartServices: jest.fn().mockResolvedValue([
        {},
        {},
        {
          smlService: {
            listDocuments: mockListDocuments,
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

    registerInternalSmlListRoute({
      router: mockRouter,
      logger: loggingSystemMock.createLogger(),
      coreSetup,
    } as unknown as RouteDependencies);

    routeHandler = handlers['/internal/agent_builder/sml'];
  });

  it('returns 404 when feature flags are disabled', async () => {
    const response = await routeHandler(disabledContext(), createRequest(), kibanaResponseFactory);

    expect(response.status).toBe(404);
    expect(mockListDocuments).not.toHaveBeenCalled();
  });

  it('returns 200 with paginated results', async () => {
    const response = await routeHandler(enabledContext(), createRequest(), kibanaResponseFactory);

    expect(response.status).toBe(200);
    expect(response.payload).toEqual({
      page: 1,
      per_page: 20,
      items: [
        {
          id: 'doc-1',
          type: 'dashboard',
          title: 'My Dashboard',
          origin: { uri: 'dashboard://doc-1' },
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

  it('filters out unauthorized items', async () => {
    const doc1 = makeSmlDocument({ id: 'doc-1' });
    const doc2 = makeSmlDocument({ id: 'doc-2', title: 'Secret' });
    mockListDocuments.mockResolvedValue({ total: 2, results: [doc1, doc2] });
    mockCheckItemsAccess.mockResolvedValue(
      new Map([
        ['doc-1', true],
        ['doc-2', false],
      ])
    );

    const response = await routeHandler(enabledContext(), createRequest(), kibanaResponseFactory);

    expect(response.status).toBe(200);
    expect(response.payload.items).toHaveLength(1);
    expect(response.payload.items[0].id).toBe('doc-1');
  });

  it('passes filters and pagination to smlService.listDocuments', async () => {
    await routeHandler(
      enabledContext(),
      createRequest({ page: 2, per_page: 10, type: 'lens', origin_uri: 'lens://abc' }),
      kibanaResponseFactory
    );

    expect(mockListDocuments).toHaveBeenCalledWith(
      expect.objectContaining({
        spaceId: 'test-space',
        page: 2,
        perPage: 10,
        type: 'lens',
        originUri: 'lens://abc',
      })
    );
  });

  it('passes tags as an array split from comma-delimited query param', async () => {
    await routeHandler(
      enabledContext(),
      createRequest({ tags: 'otel,my-tag,  spaced ' }),
      kibanaResponseFactory
    );

    expect(mockListDocuments).toHaveBeenCalledWith(
      expect.objectContaining({
        tags: ['otel', 'my-tag', 'spaced'],
      })
    );
  });

  it('returns 400 for SmlResultWindowExceededError', async () => {
    mockListDocuments.mockRejectedValue(new SmlResultWindowExceededError('result window exceeded'));

    const response = await routeHandler(enabledContext(), createRequest(), kibanaResponseFactory);

    expect(response.status).toBe(400);
    expect(response.payload).toMatchObject({ message: 'result window exceeded' });
  });

  it('propagates errors from smlService', async () => {
    mockListDocuments.mockRejectedValue(new Error('unexpected failure'));

    const response = await routeHandler(enabledContext(), createRequest(), kibanaResponseFactory);

    // wrapHandler catches the rethrown error and returns 500
    expect(response.status).toBe(500);
    expect(response.payload).toMatchObject({ message: 'unexpected failure' });
  });
});
