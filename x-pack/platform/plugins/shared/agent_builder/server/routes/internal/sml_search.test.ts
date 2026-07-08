/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import { kibanaResponseFactory } from '@kbn/core/server';
import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { SmlSearchFilterType } from '@kbn/agent-builder-server';
import type { SmlSearchResult } from '@kbn/agent-builder-server';
import {
  AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID,
  CONTEXT_ENGINE_ENABLED_SETTING_ID,
} from '@kbn/management-settings-ids';
import type { RouteDependencies } from '../types';
import { registerInternalSmlSearchRoute } from './sml_search';
import { SmlAuthzEnumerationIncompleteError } from '../../services/sml/sml_authz_enumeration_incomplete_error';
import { SmlCorpusTooLargeError } from '../../services/sml/sml_corpus_too_large_error';

describe('registerInternalSmlSearchRoute', () => {
  let routeHandler: (ctx: any, req: any, res: any) => Promise<any>;
  let mockSearch: jest.Mock;
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
      [CONTEXT_ENGINE_ENABLED_SETTING_ID]: true,
    });

  const createRequest = (body: Record<string, unknown> = {}) =>
    httpServerMock.createKibanaRequest({
      method: 'post',
      path: '/internal/agent_builder/sml/_search',
      body: { query: 'test query', ...body },
    });

  const makeSearchResult = (overrides: Partial<SmlSearchResult> = {}): SmlSearchResult => ({
    id: 'doc-1',
    type: 'dashboard',
    title: 'My Dashboard',
    origin: { uri: 'dashboard://doc-1' },
    content: 'dashboard content',
    description: 'a dashboard',
    tags: ['tag-1'],
    references: [{ uri: 'lens://ref-1' }],
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();

    mockSearch = jest.fn().mockResolvedValue({ results: [makeSearchResult()] });
    mockUiSettingsGet = jest.fn();

    const coreSetup = {
      getStartServices: jest
        .fn()
        .mockResolvedValue([{}, {}, { smlService: { search: mockSearch } }]),
    };

    const handlers: Record<string, (ctx: any, req: any, res: any) => Promise<any>> = {};
    const mockRouter = {
      post: jest
        .fn()
        .mockImplementation(
          (config: { path: string }, handler: (ctx: any, req: any, res: any) => Promise<any>) => {
            handlers[config.path] = handler;
          }
        ),
    } as unknown as IRouter;

    registerInternalSmlSearchRoute({
      router: mockRouter,
      logger: loggingSystemMock.createLogger(),
      coreSetup,
    } as unknown as RouteDependencies);

    routeHandler = handlers['/internal/agent_builder/sml/_search'];
  });

  it('returns 404 when feature flags are disabled', async () => {
    const response = await routeHandler(disabledContext(), createRequest(), kibanaResponseFactory);

    expect(response.status).toBe(404);
    expect(mockSearch).not.toHaveBeenCalled();
  });

  it('returns 200 with search results when enabled', async () => {
    const response = await routeHandler(enabledContext(), createRequest(), kibanaResponseFactory);

    expect(response.status).toBe(200);
    expect(response.payload).toEqual({
      results: [
        {
          id: 'doc-1',
          type: 'dashboard',
          origin: { uri: 'dashboard://doc-1' },
          title: 'My Dashboard',
          content: 'dashboard content',
          description: 'a dashboard',
          tags: ['tag-1'],
          references: [{ uri: 'lens://ref-1' }],
        },
      ],
    });
  });

  it('passes fields param and omits unrequested fields', async () => {
    mockSearch.mockResolvedValue({
      results: [
        makeSearchResult({
          content: undefined,
          description: undefined,
          tags: undefined,
          references: undefined,
        }),
      ],
    });

    const response = await routeHandler(
      enabledContext(),
      createRequest({ fields: ['content'] }),
      kibanaResponseFactory
    );

    expect(response.status).toBe(200);
    const item = response.payload.results[0];
    expect(item).not.toHaveProperty('content');
    expect(item).not.toHaveProperty('description');
    expect(item).not.toHaveProperty('tags');
    expect(item).not.toHaveProperty('references');

    expect(mockSearch).toHaveBeenCalledWith(expect.objectContaining({ fields: ['content'] }));
  });

  it('passes constraints and agent-supplied filters', async () => {
    const constraints = { [SmlSearchFilterType.connector]: { ids: ['c-1'] } };
    const filters = { types: ['dashboard'], tags: ['otel'] };

    await routeHandler(
      enabledContext(),
      createRequest({ constraints, filters }),
      kibanaResponseFactory
    );

    expect(mockSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        constraints,
        filters,
        spaceId: 'test-space',
        query: 'test query',
      })
    );
  });

  it('returns 503 for SmlAuthzEnumerationIncompleteError', async () => {
    mockSearch.mockRejectedValue(new SmlAuthzEnumerationIncompleteError('enumeration incomplete'));

    const response = await routeHandler(enabledContext(), createRequest(), kibanaResponseFactory);

    expect(response.status).toBe(503);
    expect(response.payload).toMatchObject({ message: 'enumeration incomplete' });
  });

  it('returns 503 for SmlCorpusTooLargeError', async () => {
    mockSearch.mockRejectedValue(new SmlCorpusTooLargeError('corpus too large'));

    const response = await routeHandler(enabledContext(), createRequest(), kibanaResponseFactory);

    expect(response.status).toBe(503);
    expect(response.payload).toMatchObject({ message: 'corpus too large' });
  });

  it('propagates errors from smlService.search', async () => {
    mockSearch.mockRejectedValue(new Error('unexpected failure'));

    const response = await routeHandler(enabledContext(), createRequest(), kibanaResponseFactory);

    // wrapHandler catches the rethrown error and returns 500
    expect(response.status).toBe(500);
    expect(response.payload).toMatchObject({ message: 'unexpected failure' });
  });
});
