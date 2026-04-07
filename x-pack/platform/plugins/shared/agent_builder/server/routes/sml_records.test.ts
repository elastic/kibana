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
import type { SmlRecordCreateBody } from '../../common/http_api/sml_records';

const sampleRecordBody: SmlRecordCreateBody = {
  type: 'index',
  title: 'projects',
  origin_id: 'projects',
  content: 'Index containing project records.',
  spaces: ['*'],
  tags: ['saas'],
  params: { index_pattern: 'projects*' },
};

const sampleRecord: SmlDocument = {
  ...sampleRecordBody,
  id: 'index::projects::0',
  created_at: '2026-04-01T00:00:00.000Z',
  updated_at: '2026-04-01T00:00:00.000Z',
  permissions: [],
  user_defined: true,
};

describe('SML Records Routes', () => {
  let routeHandlers: Record<
    string,
    { handler: (ctx: unknown, req: unknown, res: unknown) => Promise<unknown> }
  >;
  let mockCreateOrUpdate: jest.Mock;
  let mockGet: jest.Mock;
  let mockDelete: jest.Mock;
  let mockUiSettingsGet: jest.Mock;

  const createMockContext = (experimentalFeaturesEnabled = true) => ({
    core: Promise.resolve({
      uiSettings: {
        client: {
          get: mockUiSettingsGet.mockResolvedValue(experimentalFeaturesEnabled),
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
    mockCreateOrUpdate = jest.fn().mockResolvedValue(sampleRecord);
    mockGet = jest.fn().mockResolvedValue(sampleRecord);
    mockDelete = jest.fn().mockResolvedValue(true);
    mockUiSettingsGet = jest.fn();

    const mockScopedClient = {
      createOrUpdate: mockCreateOrUpdate,
      get: mockGet,
      delete: mockDelete,
    };

    const getInternalServices = jest.fn().mockReturnValue({
      smlRecords: {
        getScopedClient: jest.fn().mockReturnValue(mockScopedClient),
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
    } as unknown as RouteDependencies);
  });

  const getHandler = (method: string, routePath: string) =>
    routeHandlers[`${method}:${routePath}`]?.handler;

  describe('PUT /sml/{id} (create or update)', () => {
    const routePath = `${publicApiPath}/sml/{id}`;

    it('registers the route', () => {
      expect(getHandler('PUT', routePath)).toBeDefined();
    });

    it('calls smlRecords.createOrUpdate with correct arguments', async () => {
      const handler = getHandler('PUT', routePath)!;
      const ctx = createMockContext();
      const request = { params: { id: 'index::projects::0' }, body: sampleRecordBody };

      const result = await handler(ctx, request, mockResponse);

      expect(mockCreateOrUpdate).toHaveBeenCalledWith('index::projects::0', sampleRecordBody);
      expect(result).toMatchObject({ type: 'ok', body: sampleRecord });
    });

    it('returns 404 when experimental features flag is disabled', async () => {
      const handler = getHandler('PUT', routePath)!;
      const ctx = createMockContext(false);
      const request = { params: { id: 'index::projects::0' }, body: sampleRecordBody };

      const result = await handler(ctx, request, mockResponse);

      expect(mockCreateOrUpdate).not.toHaveBeenCalled();
      expect(result).toMatchObject({ type: 'notFound' });
    });
  });

  describe('GET /sml/{id} (get by ID)', () => {
    const routePath = `${publicApiPath}/sml/{id}`;

    it('registers the route', () => {
      expect(getHandler('GET', routePath)).toBeDefined();
    });

    it('calls smlRecords.get with correct id', async () => {
      const handler = getHandler('GET', routePath)!;
      const ctx = createMockContext();
      const request = { params: { id: 'index::projects::0' } };

      const result = await handler(ctx, request, mockResponse);

      expect(mockGet).toHaveBeenCalledWith('index::projects::0');
      expect(result).toMatchObject({ type: 'ok', body: sampleRecord });
    });

    it('returns 404 when experimental features flag is disabled', async () => {
      const handler = getHandler('GET', routePath)!;
      const ctx = createMockContext(false);
      const request = { params: { id: 'index::projects::0' } };

      const result = await handler(ctx, request, mockResponse);

      expect(mockGet).not.toHaveBeenCalled();
      expect(result).toMatchObject({ type: 'notFound' });
    });
  });

  describe('DELETE /sml/{id}', () => {
    const routePath = `${publicApiPath}/sml/{id}`;

    it('registers the route', () => {
      expect(getHandler('DELETE', routePath)).toBeDefined();
    });

    it('calls smlRecords.delete with correct id', async () => {
      const handler = getHandler('DELETE', routePath)!;
      const ctx = createMockContext();
      const request = { params: { id: 'index::projects::0' } };

      const result = await handler(ctx, request, mockResponse);

      expect(mockDelete).toHaveBeenCalledWith('index::projects::0');
      expect(result).toMatchObject({ type: 'ok', body: { success: true } });
    });

    it('returns 404 when experimental features flag is disabled', async () => {
      const handler = getHandler('DELETE', routePath)!;
      const ctx = createMockContext(false);
      const request = { params: { id: 'index::projects::0' } };

      const result = await handler(ctx, request, mockResponse);

      expect(mockDelete).not.toHaveBeenCalled();
      expect(result).toMatchObject({ type: 'notFound' });
    });
  });
});
