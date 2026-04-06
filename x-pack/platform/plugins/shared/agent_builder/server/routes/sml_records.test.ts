/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { registerSmlRecordsRoutes } from './sml_records';
import type { RouteDependencies } from './types';
import { publicApiPath } from '../../common/constants';
import type { SmlDocument } from '../services/sml/types';

const sampleRecord: SmlDocument = {
  id: 'index::projects::0',
  type: 'index',
  title: 'projects',
  origin_id: 'projects',
  content: 'Index containing project records.',
  created_at: '2026-04-01T00:00:00.000Z',
  updated_at: '2026-04-01T00:00:00.000Z',
  spaces: ['*'],
  permissions: [],
  tags: ['saas'],
  user_defined: true,
  params: { index_pattern: 'projects*' },
};

describe('SML Records Routes', () => {
  let routeHandlers: Record<
    string,
    { handler: (ctx: unknown, req: unknown, res: unknown) => Promise<unknown> }
  >;
  let mockGetRecord: jest.Mock;
  let mockCreateOrUpdateRecord: jest.Mock;
  let mockDeleteRecord: jest.Mock;
  let mockUiSettingsGet: jest.Mock;
  let mockGetStartServices: jest.Mock;

  const mockEsClient = { mock: true };

  const createMockContext = () => ({
    core: Promise.resolve({
      uiSettings: {
        client: {
          get: mockUiSettingsGet.mockResolvedValue(false),
        },
      },
    }),
    licensing: Promise.resolve({
      license: { status: 'active', hasAtLeast: jest.fn().mockReturnValue(true) },
    }),
    agentBuilder: Promise.resolve({
      spaces: { getSpaceId: jest.fn().mockReturnValue('default') },
    }),
  });

  const mockResponse = {
    ok: jest.fn((params: { body?: unknown }) => ({ type: 'ok', ...params })),
    notFound: jest.fn(() => ({ type: 'notFound' })),
    customError: jest.fn((params: Record<string, unknown>) => ({
      type: 'customError',
      ...params,
    })),
    forbidden: jest.fn((params: Record<string, unknown>) => ({ type: 'forbidden', ...params })),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    routeHandlers = {};
    mockGetRecord = jest.fn().mockResolvedValue(sampleRecord);
    mockCreateOrUpdateRecord = jest.fn().mockResolvedValue(sampleRecord);
    mockDeleteRecord = jest.fn().mockResolvedValue(true);
    mockUiSettingsGet = jest.fn();

    mockGetStartServices = jest.fn().mockResolvedValue([
      {
        elasticsearch: {
          client: {
            asScoped: jest.fn().mockReturnValue({
              asInternalUser: mockEsClient,
            }),
          },
        },
      },
    ]);

    const getInternalServices = jest.fn().mockReturnValue({
      sml: {
        getRecord: mockGetRecord,
        createOrUpdateRecord: mockCreateOrUpdateRecord,
        deleteRecord: mockDeleteRecord,
      },
    });

    const createVersionedRoute = (method: string, routePath: string) => ({
      addVersion: jest
        .fn()
        .mockImplementation(
          (
            _config: unknown,
            handler: (ctx: unknown, req: unknown, res: unknown) => Promise<unknown>
          ) => {
            routeHandlers[`${method}:${routePath}`] = { handler };
            return { addVersion: jest.fn() };
          }
        ),
    });

    const mockRouter = {
      get: jest.fn(),
      versioned: {
        get: jest
          .fn()
          .mockImplementation((config: { path: string }) =>
            createVersionedRoute('GET', config.path)
          ),
        put: jest
          .fn()
          .mockImplementation((config: { path: string }) =>
            createVersionedRoute('PUT', config.path)
          ),
        delete: jest
          .fn()
          .mockImplementation((config: { path: string }) =>
            createVersionedRoute('DELETE', config.path)
          ),
      },
    } as unknown as jest.Mocked<IRouter>;

    registerSmlRecordsRoutes({
      router: mockRouter,
      getInternalServices,
      logger: loggingSystemMock.createLogger(),
      coreSetup: {
        getStartServices: mockGetStartServices,
      },
    } as unknown as RouteDependencies);
  });

  const getHandler = (method: string, routePath: string) =>
    routeHandlers[`${method}:${routePath}`]?.handler;

  describe('PUT /sml/{id} (create or update)', () => {
    const path = `${publicApiPath}/sml/{id}`;

    it('registers the route', () => {
      expect(getHandler('PUT', path)).toBeDefined();
    });

    it('calls sml.createOrUpdateRecord with correct arguments', async () => {
      const handler = getHandler('PUT', path)!;
      const ctx = createMockContext();
      const body = {
        type: 'index',
        title: 'projects',
        origin_id: 'projects',
        content: 'Index containing project records.',
        spaces: ['*'],
        tags: ['saas'],
        params: { index_pattern: 'projects*' },
      };
      const request = { params: { id: 'index::projects::0' }, body };

      const result = await handler(ctx, request, mockResponse);

      expect(mockCreateOrUpdateRecord).toHaveBeenCalledWith({
        id: 'index::projects::0',
        document: body,
        esClient: mockEsClient,
      });
      expect(result).toMatchObject({ type: 'ok', body: sampleRecord });
    });
  });

  describe('GET /sml/{id} (get by ID)', () => {
    const path = `${publicApiPath}/sml/{id}`;

    it('registers the route', () => {
      expect(getHandler('GET', path)).toBeDefined();
    });

    it('calls sml.getRecord with correct id', async () => {
      const handler = getHandler('GET', path)!;
      const ctx = createMockContext();
      const request = { params: { id: 'index::projects::0' } };

      const result = await handler(ctx, request, mockResponse);

      expect(mockGetRecord).toHaveBeenCalledWith({
        id: 'index::projects::0',
        esClient: mockEsClient,
      });
      expect(result).toMatchObject({ type: 'ok', body: sampleRecord });
    });
  });

  describe('DELETE /sml/{id}', () => {
    const path = `${publicApiPath}/sml/{id}`;

    it('registers the route', () => {
      expect(getHandler('DELETE', path)).toBeDefined();
    });

    it('calls sml.deleteRecord with correct id', async () => {
      const handler = getHandler('DELETE', path)!;
      const ctx = createMockContext();
      const request = { params: { id: 'index::projects::0' } };

      const result = await handler(ctx, request, mockResponse);

      expect(mockDeleteRecord).toHaveBeenCalledWith({
        id: 'index::projects::0',
        esClient: mockEsClient,
      });
      expect(result).toMatchObject({ type: 'ok', body: { success: true } });
    });
  });
});
