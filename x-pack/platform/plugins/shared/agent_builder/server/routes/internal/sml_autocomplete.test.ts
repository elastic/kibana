/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import { kibanaResponseFactory } from '@kbn/core/server';
import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { SmlAutocompleteResult } from '@kbn/agent-builder-server';
import {
  AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID,
  CONTEXT_ENGINE_ENABLED_SETTING_ID,
} from '@kbn/management-settings-ids';
import type { RouteDependencies } from '../types';
import { registerInternalSmlAutocompleteRoute } from './sml_autocomplete';

describe('registerInternalSmlAutocompleteRoute', () => {
  let routeHandler: (ctx: any, req: any, res: any) => Promise<any>;
  let mockAutocomplete: jest.Mock;
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
      path: '/internal/agent_builder/sml/_autocomplete',
      body: { query: 'dash', ...body },
    });

  const makeAutocompleteResult = (
    overrides: Partial<SmlAutocompleteResult> = {}
  ): SmlAutocompleteResult => ({
    id: 'doc-1',
    type: 'dashboard',
    title: 'My Dashboard',
    origin: { uri: 'dashboard://doc-1' },
    permissions: { kibana: { privileges: [] } },
    spaces: ['test-space'],
    matched_discovery_labels: [
      { value: 'Dashboard', kind: 'title', highlighted: '<em>Dash</em>board' },
    ],
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();

    mockAutocomplete = jest.fn().mockResolvedValue({ results: [makeAutocompleteResult()] });
    mockUiSettingsGet = jest.fn();

    const coreSetup = {
      getStartServices: jest
        .fn()
        .mockResolvedValue([{}, {}, { smlService: { autocomplete: mockAutocomplete } }]),
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

    registerInternalSmlAutocompleteRoute({
      router: mockRouter,
      logger: loggingSystemMock.createLogger(),
      coreSetup,
    } as unknown as RouteDependencies);

    routeHandler = handlers['/internal/agent_builder/sml/_autocomplete'];
  });

  it('returns 404 when feature flags are disabled', async () => {
    const response = await routeHandler(disabledContext(), createRequest(), kibanaResponseFactory);

    expect(response.status).toBe(404);
    expect(mockAutocomplete).not.toHaveBeenCalled();
  });

  it('returns 200 with autocomplete results and matched_discovery_labels', async () => {
    const response = await routeHandler(enabledContext(), createRequest(), kibanaResponseFactory);

    expect(response.status).toBe(200);
    expect(response.payload).toEqual({
      results: [
        {
          id: 'doc-1',
          type: 'dashboard',
          origin: { uri: 'dashboard://doc-1' },
          title: 'My Dashboard',
          matched_discovery_labels: [
            { value: 'Dashboard', kind: 'title', highlighted: '<em>Dash</em>board' },
          ],
        },
      ],
    });
  });

  it('returns matched_discovery_labels as [] when absent from service result', async () => {
    mockAutocomplete.mockResolvedValue({
      results: [makeAutocompleteResult({ matched_discovery_labels: undefined })],
    });

    const response = await routeHandler(enabledContext(), createRequest(), kibanaResponseFactory);

    expect(response.status).toBe(200);
    expect(response.payload.results[0].matched_discovery_labels).toEqual([]);
  });

  it('does not leak permissions or spaces fields', async () => {
    const response = await routeHandler(enabledContext(), createRequest(), kibanaResponseFactory);

    expect(response.status).toBe(200);
    const item = response.payload.results[0];
    expect(item).not.toHaveProperty('permissions');
    expect(item).not.toHaveProperty('spaces');
  });

  it('propagates errors from smlService.autocomplete', async () => {
    mockAutocomplete.mockRejectedValue(new Error('autocomplete failed'));

    const response = await routeHandler(enabledContext(), createRequest(), kibanaResponseFactory);

    // wrapHandler catches the rethrown error and returns 500
    expect(response.status).toBe(500);
    expect(response.payload).toMatchObject({ message: 'autocomplete failed' });
  });
});
