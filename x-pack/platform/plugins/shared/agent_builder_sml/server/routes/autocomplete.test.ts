/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, httpServiceMock } from '@kbn/core-http-server-mocks';
import { coreMock } from '@kbn/core/server/mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID } from '@kbn/management-settings-ids';
import type { SmlAutocompleteResult } from '../services/sml/types';
import { registerAutocompleteRoute } from './autocomplete';

const createMockSmlService = () => ({
  search: jest.fn(),
  autocomplete: jest.fn(),
  checkItemsAccess: jest.fn(),
  indexAttachment: jest.fn(),
  getDocuments: jest.fn(),
  getTypeDefinition: jest.fn(),
  listTypeDefinitions: jest.fn(),
  getCrawler: jest.fn(),
});

const createMockUiSettingsClient = (enabled = true) => ({
  get: jest.fn().mockImplementation(async (key: string) => {
    if (key === AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID) return enabled;
    return undefined;
  }),
});

describe('registerAutocompleteRoute', () => {
  let router: ReturnType<typeof httpServiceMock.createRouter>;
  let handler: Function;
  let mockSmlService: ReturnType<typeof createMockSmlService>;
  const logger = loggingSystemMock.create().get();
  const savedObjectsClient = {};
  let startDeps: Record<string, unknown>;

  beforeEach(() => {
    router = httpServiceMock.createRouter();
    mockSmlService = createMockSmlService();

    startDeps = {
      spaces: { spacesService: { getSpaceId: jest.fn().mockReturnValue('test-space') } },
    };
    const coreSetup = coreMock.createSetup();
    (coreSetup.getStartServices as jest.Mock).mockResolvedValue([{}, startDeps, {}]);

    registerAutocompleteRoute({
      router: router as any,
      coreSetup: coreSetup as any,
      logger,
      getSmlService: () => mockSmlService as any,
    });

    const [, registeredHandler] = router.post.mock.calls[0];
    handler = registeredHandler;
  });

  const callHandler = async (body: Record<string, unknown>, uiSettingsEnabled = true) => {
    const request = httpServerMock.createKibanaRequest({ body });
    const response = httpServerMock.createResponseFactory();
    const mockUiSettings = createMockUiSettingsClient(uiSettingsEnabled);
    const ctx = {
      core: Promise.resolve({
        uiSettings: { client: mockUiSettings },
        elasticsearch: { client: { asInternalUser: {}, asCurrentUser: {} } },
        savedObjects: { client: savedObjectsClient },
      }),
    };
    await handler(ctx, request, response);
    return response;
  };

  describe('authorization', () => {
    const withoutSmlPrivilege = () => {
      startDeps.security = {
        authz: {
          actions: { api: { get: (action: string) => `api:${action}` } },
          checkPrivilegesWithRequest: jest.fn().mockReturnValue({
            atSpace: jest.fn().mockResolvedValue({ hasAllRequested: false }),
          }),
        },
      };
    };

    it('accepts the SML privilege or the Agent Builder privilege', () => {
      expect(router.post.mock.calls[0][0].security).toEqual({
        authz: {
          requiredPrivileges: [{ anyRequired: ['agentBuilderSml:read', 'agentBuilder:read'] }],
        },
      });
    });

    it('refuses the SML index to a user without the SML privilege', async () => {
      withoutSmlPrivilege();

      const response = await callHandler({ query: '*' });

      expect(response.forbidden).toHaveBeenCalled();
      expect(mockSmlService.autocomplete).not.toHaveBeenCalled();
    });

    it('serves the lookup through the types to a user without the SML privilege', async () => {
      withoutSmlPrivilege();
      mockSmlService.listTypeDefinitions.mockReturnValue([
        {
          id: 'dashboard',
          searchByTitle: jest.fn().mockResolvedValue([{ originId: 'd', title: 'D' }]),
        },
      ]);

      const response = await callHandler({ query: '*' }, false);

      expect(response.forbidden).not.toHaveBeenCalled();
      expect(response.ok).toHaveBeenCalled();
    });
  });

  describe('when the SML index is not enabled', () => {
    const createType = (id: string, items: Array<{ originId: string; title: string }> = []) => ({
      id,
      searchByTitle: jest.fn().mockResolvedValue(items),
    });

    const call = async (body: Record<string, unknown>) => {
      const response = await callHandler(body, false);
      return (response.ok.mock.calls[0][0] as { body: { results: unknown[] } }).body.results;
    };

    it('does not use the index and looks items up through the types', async () => {
      const dashboard = createType('dashboard', [{ originId: 'dash-1', title: 'Sales' }]);
      mockSmlService.listTypeDefinitions.mockReturnValue([dashboard]);

      const constraints = { connector: { ids: ['gh-1'] } };

      const results = await call({ query: 'sales', size: 10, constraints });

      expect(mockSmlService.autocomplete).not.toHaveBeenCalled();
      expect(dashboard.searchByTitle).toHaveBeenCalledWith(
        { title: 'sales', size: 10, constraints },
        {
          request: expect.anything(),
          savedObjectsClient,
          spaceId: 'test-space',
          hasApiPrivileges: expect.any(Function),
        }
      );
      expect(results).toEqual([
        {
          id: 'dashboard:dash-1',
          type: 'dashboard',
          title: 'Sales',
          origin: { uri: 'dashboard://dash-1' },
        },
      ]);
    });

    it('looks up the type typed before the slash, and otherwise matches titles', async () => {
      const dashboard = createType('dashboard');
      const workflow = createType('workflow');
      mockSmlService.listTypeDefinitions.mockReturnValue([dashboard, workflow]);

      await call({ query: 'dash', size: 10 });
      expect(dashboard.searchByTitle.mock.calls[0][0]).toMatchObject({ title: '' });
      expect(workflow.searchByTitle.mock.calls[0][0]).toMatchObject({ title: 'dash' });

      dashboard.searchByTitle.mockClear();
      workflow.searchByTitle.mockClear();
      await call({ query: 'work/sal', size: 10 });
      expect(dashboard.searchByTitle).not.toHaveBeenCalled();
      expect(workflow.searchByTitle.mock.calls[0][0]).toMatchObject({ title: 'sal' });
    });

    it('takes turns between the types, up to the size', async () => {
      const dashboard = createType('dashboard', [
        { originId: 'd1', title: 'D1' },
        { originId: 'd2', title: 'D2' },
        { originId: 'd3', title: 'D3' },
      ]);
      const workflow = createType('workflow', [{ originId: 'w1', title: 'W1' }]);
      mockSmlService.listTypeDefinitions.mockReturnValue([dashboard, workflow]);

      const results = (await call({ query: '*', size: 3 })) as Array<{ title: string }>;

      expect(dashboard.searchByTitle.mock.calls[0][0]).toMatchObject({ size: 3 });
      expect(results.map(({ title }) => title)).toEqual(['D1', 'W1', 'D2']);
    });

    describe('the privilege check given to the lookups', () => {
      const getHasApiPrivileges = async () => {
        const type = createType('workflow');
        mockSmlService.listTypeDefinitions.mockReturnValue([type]);
        await call({ query: '*', size: 10 });
        return type.searchByTitle.mock.calls[0][1].hasApiPrivileges as (
          actions: string[]
        ) => Promise<boolean>;
      };

      it('allows everything when security is disabled', async () => {
        expect(await (await getHasApiPrivileges())(['workflow_read'])).toBe(true);
      });

      it('checks the privileges of the user in the current space', async () => {
        const atSpace = jest.fn().mockResolvedValue({ hasAllRequested: false });
        startDeps.security = {
          authz: {
            actions: { api: { get: (action: string) => `api:${action}` } },
            checkPrivilegesWithRequest: jest.fn().mockReturnValue({ atSpace }),
          },
        };

        expect(await (await getHasApiPrivileges())(['workflow_read'])).toBe(false);
        expect(atSpace).toHaveBeenCalledWith('test-space', { kibana: ['api:workflow_read'] });
      });
    });

    it('returns nothing for a tag filter, which the types cannot honor', async () => {
      const dashboard = createType('dashboard', [{ originId: 'd1', title: 'D1' }]);
      mockSmlService.listTypeDefinitions.mockReturnValue([dashboard]);

      expect(await call({ query: '*', size: 10, filters: { tags: ['sales'] } })).toEqual([]);
      expect(dashboard.searchByTitle).not.toHaveBeenCalled();
    });

    it('still returns the other types when one lookup fails', async () => {
      const dashboard = createType('dashboard');
      dashboard.searchByTitle.mockRejectedValue(new Error('boom'));
      const workflow = createType('workflow', [{ originId: 'w', title: 'W' }]);
      mockSmlService.listTypeDefinitions.mockReturnValue([dashboard, workflow]);

      const results = (await call({ query: '*', size: 10 })) as Array<{ type: string }>;

      expect(results.map(({ type }) => type)).toEqual(['workflow']);
    });
  });

  it('returns 200 with autocomplete results when enabled', async () => {
    const mockResults: SmlAutocompleteResult[] = [
      {
        id: 'entry-1',
        type: 'connector',
        title: 'GitHub Connector',
        origin: { uri: 'gh-1' },
      },
    ];
    mockSmlService.autocomplete.mockResolvedValue({ results: mockResults });

    const response = await callHandler({ query: 'git', size: 10 });
    expect(response.ok).toHaveBeenCalledWith({
      body: {
        results: [
          {
            id: 'entry-1',
            type: 'connector',
            origin: { uri: 'gh-1' },
            title: 'GitHub Connector',
          },
        ],
      },
    });
  });

  it('does not leak server-only fields into the HTTP response', async () => {
    // The route projects an explicit four-field whitelist, so anything the
    // service carries internally stays server-side. Cast because such fields
    // are deliberately absent from the published result type.
    const mockResults = [
      {
        id: 'entry-3',
        type: 'visualization',
        title: 'V',
        origin: { uri: 'v-1' },
        internal_only_field: 'server-side detail',
      },
    ] as unknown as SmlAutocompleteResult[];
    mockSmlService.autocomplete.mockResolvedValue({ results: mockResults });

    const response = await callHandler({ query: 'v' });
    const body = response.ok.mock.calls[0][0]?.body as { results: Array<Record<string, unknown>> };
    expect(body.results[0]).toEqual({
      id: 'entry-3',
      type: 'visualization',
      title: 'V',
      origin: { uri: 'v-1' },
    });
  });

  it('passes spaceId from spaces plugin to sml.autocomplete', async () => {
    mockSmlService.autocomplete.mockResolvedValue({ results: [] });
    await callHandler({ query: 'test' });
    expect(mockSmlService.autocomplete).toHaveBeenCalledWith(
      expect.objectContaining({ spaceId: 'test-space' })
    );
  });

  it('falls back to default space when spaces plugin is unavailable', async () => {
    const coreSetup = coreMock.createSetup();
    (coreSetup.getStartServices as jest.Mock).mockResolvedValue([{}, {}, {}]);

    const localRouter = httpServiceMock.createRouter();
    registerAutocompleteRoute({
      router: localRouter as any,
      coreSetup: coreSetup as any,
      logger,
      getSmlService: () => mockSmlService as any,
    });

    const [, localHandler] = localRouter.post.mock.calls[0];
    const request = httpServerMock.createKibanaRequest({ body: { query: 'test' } });
    const response = httpServerMock.createResponseFactory();
    const ctx = {
      core: Promise.resolve({
        uiSettings: { client: createMockUiSettingsClient(true) },
        elasticsearch: { client: {} },
      }),
    };

    mockSmlService.autocomplete.mockResolvedValue({ results: [] });
    await localHandler(ctx, request, response);
    expect(mockSmlService.autocomplete).toHaveBeenCalledWith(
      expect.objectContaining({ spaceId: 'default' })
    );
  });

  it('propagates errors from sml.autocomplete', async () => {
    mockSmlService.autocomplete.mockRejectedValue(new Error('ES connection failed'));
    await expect(callHandler({ query: 'test' })).rejects.toThrow('ES connection failed');
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('ES connection failed'));
  });
});
