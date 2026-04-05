/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, httpServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { RequestHandler } from '@kbn/core/server';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { createGetSchemasRoute } from './get_schemas_route';
import type { SchemaService } from '../../lib/schema_service';
import { API_VERSIONS } from '../../../common/constants';

jest.mock('../../utils/get_internal_saved_object_client', () => ({
  createInternalSavedObjectsClientForSpaceId: jest.fn(),
}));

import { createInternalSavedObjectsClientForSpaceId } from '../../utils/get_internal_saved_object_client';

const ROUTE_PATH = '/internal/osquery/schemas/{schemaType}';
const ROUTE_VERSION = API_VERSIONS.internal.v1;

const createMockRouter = () => {
  const httpService = httpServiceMock.createSetupContract();

  return httpService.createRouter();
};

const createMockOsqueryContext = (): OsqueryAppContext => {
  const logger = loggingSystemMock.createLogger();
  const mockSavedObjectsClient = {
    find: jest.fn(),
    get: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const mockCoreStart = {
    savedObjects: {
      getScopedClient: jest.fn().mockReturnValue(mockSavedObjectsClient),
      createInternalRepository: jest.fn(),
    },
    http: {
      basePath: {
        set: jest.fn(),
        get: jest.fn().mockReturnValue(''),
      },
    },
  };

  return {
    logFactory: {
      get: jest.fn().mockReturnValue(logger),
    },
    service: {
      getPackageService: jest.fn().mockReturnValue(undefined),
      getActiveSpace: jest.fn().mockResolvedValue({ id: 'default', name: 'Default' }),
    },
    getStartServices: jest.fn().mockResolvedValue([mockCoreStart, {}, {}]),
  } as unknown as OsqueryAppContext;
};

const createMockSchemaService = (): jest.Mocked<SchemaService> =>
  ({
    getSchema: jest.fn(),
  } as unknown as jest.Mocked<SchemaService>);

describe('createGetSchemasRoute', () => {
  let mockOsqueryContext: OsqueryAppContext;
  let mockSchemaService: jest.Mocked<SchemaService>;
  let mockRouter: ReturnType<typeof createMockRouter>;
  let mockSavedObjectsClient: object;
  let routeHandler: RequestHandler;

  beforeEach(() => {
    jest.clearAllMocks();

    mockOsqueryContext = createMockOsqueryContext();
    mockSchemaService = createMockSchemaService();
    mockRouter = createMockRouter();
    mockSavedObjectsClient = { get: jest.fn(), find: jest.fn() };

    (createInternalSavedObjectsClientForSpaceId as jest.Mock).mockResolvedValue(
      mockSavedObjectsClient
    );

    createGetSchemasRoute(mockRouter, mockOsqueryContext, mockSchemaService);

    const route = mockRouter.versioned.getRoute('get', ROUTE_PATH);
    const routeVersion = route.versions[ROUTE_VERSION];

    if (!routeVersion) {
      throw new Error(`Handler for version [${ROUTE_VERSION}] not found!`);
    }

    routeHandler = routeVersion.handler;
  });

  describe('route registration', () => {
    it('should register the route with the correct path', () => {
      const route = mockRouter.versioned.getRoute('get', ROUTE_PATH);

      expect(route).toBeDefined();
    });

    it('should register with the correct version', () => {
      const route = mockRouter.versioned.getRoute('get', ROUTE_PATH);
      const routeVersion = route.versions[ROUTE_VERSION];

      expect(routeVersion).toBeDefined();
    });

    it('should require osquery-read privilege', () => {
      const route = mockRouter.versioned.getRoute('get', ROUTE_PATH);

      expect(
        (route.config.security?.authz as { requiredPrivileges?: string[] })?.requiredPrivileges
      ).toContain('osquery-read');
    });

    it('should register as an internal route', () => {
      const route = mockRouter.versioned.getRoute('get', ROUTE_PATH);

      expect(route.config.access).toBe('internal');
    });
  });

  describe('handler', () => {
    describe('valid osquery schema type', () => {
      it('should return 200 with osquery schema data', async () => {
        const mockOsqueryResponse = {
          version: '5.19.0',
          data: [
            {
              name: 'users',
              description: 'Local user accounts.',
              platforms: ['linux', 'darwin'],
              columns: [{ name: 'uid', description: 'User ID', type: 'bigint' }],
            },
          ],
        };

        mockSchemaService.getSchema.mockResolvedValue(mockOsqueryResponse);

        const mockRequest = httpServerMock.createKibanaRequest({
          params: { schemaType: 'osquery' },
        });
        const mockResponse = httpServerMock.createResponseFactory();

        await routeHandler({} as any, mockRequest, mockResponse);

        expect(mockResponse.ok).toHaveBeenCalledWith({ body: mockOsqueryResponse });
      });

      it('should delegate to SchemaService with osquery type', async () => {
        const mockOsqueryResponse = { version: '5.19.0', data: [] };

        mockSchemaService.getSchema.mockResolvedValue(mockOsqueryResponse);

        const mockRequest = httpServerMock.createKibanaRequest({
          params: { schemaType: 'osquery' },
        });
        const mockResponse = httpServerMock.createResponseFactory();

        await routeHandler({} as any, mockRequest, mockResponse);

        expect(mockSchemaService.getSchema).toHaveBeenCalledWith(
          'osquery',
          undefined,
          mockSavedObjectsClient
        );
      });
    });

    describe('valid ecs schema type', () => {
      it('should return 200 with ECS schema data', async () => {
        const mockEcsResponse = {
          version: '9.2.0',
          data: [
            {
              field: '@timestamp',
              type: 'date',
              normalization: '',
              example: '2015-01-01T12:10:30Z',
              description: 'Date/time when the event originated.',
            },
          ],
        };

        mockSchemaService.getSchema.mockResolvedValue(mockEcsResponse);

        const mockRequest = httpServerMock.createKibanaRequest({
          params: { schemaType: 'ecs' },
        });
        const mockResponse = httpServerMock.createResponseFactory();

        await routeHandler({} as any, mockRequest, mockResponse);

        expect(mockResponse.ok).toHaveBeenCalledWith({ body: mockEcsResponse });
      });

      it('should delegate to SchemaService with ecs type', async () => {
        const mockEcsResponse = { version: '9.2.0', data: [] };

        mockSchemaService.getSchema.mockResolvedValue(mockEcsResponse);

        const mockRequest = httpServerMock.createKibanaRequest({
          params: { schemaType: 'ecs' },
        });
        const mockResponse = httpServerMock.createResponseFactory();

        await routeHandler({} as any, mockRequest, mockResponse);

        expect(mockSchemaService.getSchema).toHaveBeenCalledWith(
          'ecs',
          undefined,
          mockSavedObjectsClient
        );
      });
    });

    describe('SchemaService integration', () => {
      it('should pass the packageService from osqueryContext to SchemaService', async () => {
        const mockPackageService = { asInternalUser: { getInstallation: jest.fn() } };

        (mockOsqueryContext.service.getPackageService as jest.Mock).mockReturnValue(
          mockPackageService
        );

        mockSchemaService.getSchema.mockResolvedValue({ version: '5.19.0', data: [] });

        const mockRequest = httpServerMock.createKibanaRequest({
          params: { schemaType: 'osquery' },
        });
        const mockResponse = httpServerMock.createResponseFactory();

        await routeHandler({} as any, mockRequest, mockResponse);

        expect(mockSchemaService.getSchema).toHaveBeenCalledWith(
          'osquery',
          mockPackageService,
          mockSavedObjectsClient
        );
      });

      it('should pass undefined packageService when Fleet is not available', async () => {
        (mockOsqueryContext.service.getPackageService as jest.Mock).mockReturnValue(undefined);

        mockSchemaService.getSchema.mockResolvedValue({ version: '5.19.0', data: [] });

        const mockRequest = httpServerMock.createKibanaRequest({
          params: { schemaType: 'osquery' },
        });
        const mockResponse = httpServerMock.createResponseFactory();

        await routeHandler({} as any, mockRequest, mockResponse);

        expect(mockSchemaService.getSchema).toHaveBeenCalledWith(
          'osquery',
          undefined,
          mockSavedObjectsClient
        );
      });

      it('should create internal saved objects client using the request context', async () => {
        mockSchemaService.getSchema.mockResolvedValue({ version: '5.19.0', data: [] });

        const mockRequest = httpServerMock.createKibanaRequest({
          params: { schemaType: 'osquery' },
        });
        const mockResponse = httpServerMock.createResponseFactory();

        await routeHandler({} as any, mockRequest, mockResponse);

        expect(createInternalSavedObjectsClientForSpaceId).toHaveBeenCalledWith(
          mockOsqueryContext,
          mockRequest
        );
      });

      it('should return the full schema result including version and data', async () => {
        const expectedResult = {
          version: '5.19.0',
          data: [
            {
              name: 'processes',
              description: 'All running processes on the host system.',
              platforms: ['linux', 'darwin', 'windows'],
              columns: [
                { name: 'pid', description: 'Process (or thread) ID', type: 'bigint' },
                {
                  name: 'name',
                  description: 'The process path or shorthand argv[0]',
                  type: 'text',
                },
              ],
            },
          ],
        };

        mockSchemaService.getSchema.mockResolvedValue(expectedResult);

        const mockRequest = httpServerMock.createKibanaRequest({
          params: { schemaType: 'osquery' },
        });
        const mockResponse = httpServerMock.createResponseFactory();

        await routeHandler({} as any, mockRequest, mockResponse);

        expect(mockResponse.ok).toHaveBeenCalledWith({ body: expectedResult });
      });

      it('should return empty data array when schema has no entries', async () => {
        const emptyResponse = { version: '5.19.0', data: [] };

        mockSchemaService.getSchema.mockResolvedValue(emptyResponse);

        const mockRequest = httpServerMock.createKibanaRequest({
          params: { schemaType: 'osquery' },
        });
        const mockResponse = httpServerMock.createResponseFactory();

        await routeHandler({} as any, mockRequest, mockResponse);

        expect(mockResponse.ok).toHaveBeenCalledWith({ body: emptyResponse });
      });
    });

    describe('error handling', () => {
      it('should return customError when SchemaService throws', async () => {
        mockSchemaService.getSchema.mockRejectedValue(new Error('Failed to read schema file'));

        const mockRequest = httpServerMock.createKibanaRequest({
          params: { schemaType: 'osquery' },
        });
        const mockResponse = httpServerMock.createResponseFactory();

        await routeHandler({} as any, mockRequest, mockResponse);

        expect(mockResponse.customError).toHaveBeenCalledWith({
          statusCode: 500,
          body: {
            message: 'Failed to fetch schema: Failed to read schema file',
          },
        });
      });

      it('should return customError when createInternalSavedObjectsClientForSpaceId throws', async () => {
        (createInternalSavedObjectsClientForSpaceId as jest.Mock).mockRejectedValue(
          new Error('Could not resolve space')
        );

        const mockRequest = httpServerMock.createKibanaRequest({
          params: { schemaType: 'osquery' },
        });
        const mockResponse = httpServerMock.createResponseFactory();

        await routeHandler({} as any, mockRequest, mockResponse);

        expect(mockResponse.customError).toHaveBeenCalledWith({
          statusCode: 500,
          body: {
            message: 'Failed to fetch schema: Could not resolve space',
          },
        });
      });
    });
  });
});
