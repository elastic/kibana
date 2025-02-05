/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { capitalize } from 'lodash';
import * as Rx from 'rxjs';

import type { SavedObjectsNamespaceType, SavedObjectsType } from '@kbn/core/server';
import { kibanaResponseFactory } from '@kbn/core/server';
import {
  coreMock,
  httpServerMock,
  httpServiceMock,
  savedObjectsClientMock,
  savedObjectsTypeRegistryMock,
} from '@kbn/core/server/mocks';
import { featuresPluginMock } from '@kbn/features-plugin/server/mocks';

import type { SpaceContentTypeSummaryItem } from './get_content_summary';
import { initGetSpaceContentSummaryApi } from './get_content_summary';
import { spacesConfig } from '../../../lib/__fixtures__';
import { SpacesClientService } from '../../../spaces_client';
import { SpacesService } from '../../../spaces_service';
import {
  createMockSavedObjectsRepository,
  createSpaces,
  mockRouteContext,
  mockRouteContextWithInvalidLicense,
} from '../__fixtures__';

interface SetupParams {
  importableAndExportableTypesMock: SavedObjectsType[];
}

describe('GET /internal/spaces/{spaceId}/content_summary', () => {
  const spacesSavedObjects = createSpaces();

  const setup = async (params?: SetupParams) => {
    const httpService = httpServiceMock.createSetupContract();
    const router = httpServiceMock.createRouter();

    const coreStart = coreMock.createStart();

    const savedObjectsRepositoryMock = createMockSavedObjectsRepository(spacesSavedObjects);

    const clientService = new SpacesClientService(jest.fn(), 'traditional');
    clientService
      .setup({ config$: Rx.of(spacesConfig) })
      .setClientRepositoryFactory(() => savedObjectsRepositoryMock);

    const savedObjectsClient = savedObjectsClientMock.create();
    const typeRegistry = savedObjectsTypeRegistryMock.create();

    typeRegistry.getImportableAndExportableTypes.mockReturnValue(
      params?.importableAndExportableTypesMock ?? [
        // don't need to include all types, just need a positive case (agnostic) and a negative case (non-agnostic)
        {
          name: 'dashboard',
          namespaceType: 'multiple',
          hidden: false,
          mappings: { properties: {} },
        },
        {
          name: 'globaltype',
          namespaceType: 'agnostic',
          hidden: false,
          mappings: { properties: {} },
        },
      ]
    );
    typeRegistry.isNamespaceAgnostic.mockImplementation((type: string) =>
      typeRegistry
        .getImportableAndExportableTypes()
        .some((t) => t.name === type && t.namespaceType === 'agnostic')
    );

    const service = new SpacesService();
    service.setup({
      basePath: httpService.basePath,
    });

    const clientServiceStart = clientService.start(coreStart, featuresPluginMock.createStart());

    const spacesServiceStart = service.start({
      basePath: coreStart.http.basePath,
      spacesClientService: clientServiceStart,
    });

    const routeContext = {
      ...mockRouteContext,
      core: {
        savedObjects: {
          getClient: () => savedObjectsClient,
          typeRegistry,
        },
      },
    };

    initGetSpaceContentSummaryApi({
      router,
      getSpacesService: () => spacesServiceStart,
    });

    const [[config, routeHandler]] = router.get.mock.calls;

    return {
      config,
      routeHandler,
      savedObjectsClient,
      typeRegistry,
      routeContext,
    };
  };

  it('correctly defines route.', async () => {
    const { config } = await setup();

    const paramsSchema = (config.validate as any).params;

    expect(config.security?.authz).toEqual({ requiredPrivileges: ['manage_spaces'] });
    expect(() => paramsSchema.validate({})).toThrowErrorMatchingInlineSnapshot(
      `"[spaceId]: expected value of type [string] but got [undefined]"`
    );
    expect(() => paramsSchema.validate({ spaceId: '' })).toThrowErrorMatchingInlineSnapshot(
      `"[spaceId]: value has length [0] but it must have a minimum length of [1]."`
    );
    expect(() => paramsSchema.validate({ spaceId: '*' })).toThrowErrorMatchingInlineSnapshot(
      `"[spaceId]: lower case, a-z, 0-9, \\"_\\", and \\"-\\" are allowed."`
    );
  });

  it('returns http/403 when the license is invalid.', async () => {
    const { routeHandler } = await setup();

    const request = httpServerMock.createKibanaRequest({
      method: 'get',
    });

    const response = await routeHandler(
      mockRouteContextWithInvalidLicense,
      request,
      kibanaResponseFactory
    );

    expect(response.status).toEqual(403);
    expect(response.payload).toEqual({
      message: 'License is invalid for spaces',
    });
  });

  it('returns http/404 when retrieving a non-existent space.', async () => {
    const { routeHandler, routeContext } = await setup();

    const request = httpServerMock.createKibanaRequest({
      params: {
        spaceId: 'not-a-space',
      },
      method: 'get',
    });

    const response = await routeHandler(routeContext, request, kibanaResponseFactory);

    expect(response.status).toEqual(404);
  });

  it('returns http/200 with non agnostic namespace types.', async () => {
    const importableAndExportableTypesMock = [
      {
        name: 'dashboard',
        namespaceType: 'multiple' as SavedObjectsNamespaceType,
        hidden: false,
        management: {
          displayName: 'dashboardDisplayName',
          icon: 'dashboardIcon',
        },
        mappings: { properties: {} },
      },
      {
        name: 'query',
        namespaceType: 'multiple' as SavedObjectsNamespaceType,
        hidden: false,
        mappings: { properties: {} },
      },
      {
        name: 'globaltype',
        namespaceType: 'agnostic' as SavedObjectsNamespaceType,
        hidden: false,
        mappings: { properties: {} },
      },
    ];
    const { routeHandler, routeContext, savedObjectsClient } = await setup({
      importableAndExportableTypesMock,
    });

    const request = httpServerMock.createKibanaRequest({
      params: {
        spaceId: 'a-space',
      },
      method: 'get',
    });

    const mockAggregationResult = {
      total: 6,
      aggregations: {
        typesAggregation: {
          buckets: [
            {
              key: 'dashboard',
              doc_count: 5,
            },
            {
              key: 'query',
              doc_count: 1,
            },
          ],
        },
      },
    };

    const findMock = savedObjectsClient.find as jest.Mock;

    findMock.mockReturnValue(mockAggregationResult);

    const response = await routeHandler(routeContext, request, kibanaResponseFactory);

    expect(findMock).toBeCalledWith({
      type: ['dashboard', 'query'],
      namespaces: ['a-space'],
      perPage: 0,
      aggs: {
        typesAggregation: {
          terms: {
            field: 'type',
            size: 2,
          },
        },
      },
    });

    expect(response.status).toEqual(200);
    expect(response.payload?.summary).toHaveLength(2);
  });

  it('returns http/200 with correct meta information.', async () => {
    const importableAndExportableTypesMock = [
      {
        name: 'dashboard',
        namespaceType: 'multiple' as SavedObjectsNamespaceType,
        hidden: false,
        management: {
          displayName: 'dashboardDisplayName',
          icon: 'dashboardIcon',
        },
        mappings: { properties: {} },
      },
      {
        name: 'query',
        namespaceType: 'multiple' as SavedObjectsNamespaceType,
        hidden: false,
        mappings: { properties: {} },
      },
    ];
    const { routeHandler, routeContext, savedObjectsClient } = await setup({
      importableAndExportableTypesMock,
    });

    const request = httpServerMock.createKibanaRequest({
      params: {
        spaceId: 'a-space',
      },
      method: 'get',
    });

    const mockAggregationResult = {
      total: 10,
      aggregations: {
        typesAggregation: {
          buckets: [
            {
              key: 'dashboard',
              doc_count: 5,
            },
            {
              key: 'query',
              doc_count: 5,
            },
          ],
        },
      },
    };

    const findMock = savedObjectsClient.find as jest.Mock;

    findMock.mockReturnValue(mockAggregationResult);

    const response = await routeHandler(routeContext, request, kibanaResponseFactory);

    expect(findMock).toBeCalledWith({
      type: ['dashboard', 'query'],
      namespaces: ['a-space'],
      perPage: 0,
      aggs: {
        typesAggregation: {
          terms: {
            field: 'type',
            size: 2,
          },
        },
      },
    });

    expect(response.status).toEqual(200);
    expect(response.payload!.summary).toHaveLength(2);

    const [dashboardType, queryType] = importableAndExportableTypesMock;
    const [dashboardTypeSummary, queryTypeSummary] = response.payload!.summary;

    expect(dashboardTypeSummary.displayName).toEqual(dashboardType.management?.displayName);
    expect(dashboardTypeSummary.icon).toEqual(dashboardType.management?.icon);

    expect(queryTypeSummary.displayName).toEqual(capitalize(queryType.name));
    expect(queryTypeSummary.icon).toBe(undefined);
  });

  it('returns http/200 with data sorted by displayName.', async () => {
    const importableAndExportableTypesMock = [
      {
        name: 'dashboard',
        namespaceType: 'multiple' as SavedObjectsNamespaceType,
        hidden: false,
        management: {
          displayName: 'Test Display Dashboard Name',
        },
        mappings: { properties: {} },
      },
      {
        name: 'query',
        namespaceType: 'multiple' as SavedObjectsNamespaceType,
        hidden: false,
        management: {
          displayName: 'My Display Name',
        },
        mappings: { properties: {} },
      },
      {
        name: 'search',
        namespaceType: 'multiple' as SavedObjectsNamespaceType,
        hidden: false,
        mappings: { properties: {} },
      },
    ];
    const { routeHandler, routeContext, savedObjectsClient } = await setup({
      importableAndExportableTypesMock,
    });

    const request = httpServerMock.createKibanaRequest({
      params: {
        spaceId: 'a-space',
      },
      method: 'get',
    });

    const mockAggregationResult = {
      total: 15,
      aggregations: {
        typesAggregation: {
          buckets: [
            {
              key: 'dashboard',
              doc_count: 5,
            },
            {
              key: 'query',
              doc_count: 5,
            },
            {
              key: 'search',
              doc_count: 5,
            },
          ],
        },
      },
    };

    const findMock = savedObjectsClient.find as jest.Mock;

    findMock.mockReturnValue(mockAggregationResult);

    const response = await routeHandler(routeContext, request, kibanaResponseFactory);

    expect(findMock).toBeCalledWith({
      type: ['dashboard', 'query', 'search'],
      namespaces: ['a-space'],
      perPage: 0,
      aggs: {
        typesAggregation: {
          terms: {
            field: 'type',
            size: 3,
          },
        },
      },
    });

    expect(response.status).toEqual(200);
    expect(response.payload!.summary).toHaveLength(3);

    const types = response.payload!.summary.map((item: SpaceContentTypeSummaryItem) => item.type);

    expect(types).toEqual(['query', 'search', 'dashboard']);
  });
});
