/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, httpServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { RequestHandler } from '@kbn/core/server';
import { API_VERSIONS } from '../../../common/constants';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { copyPackRoute } from './copy_pack_route';
import { createInternalSavedObjectsClientForSpaceId } from '../../utils/get_internal_saved_object_client';
import { getUserInfo } from '../../lib/get_user_info';

jest.mock('../../utils/get_internal_saved_object_client', () => ({
  createInternalSavedObjectsClientForSpaceId: jest.fn(),
}));

jest.mock('../../lib/get_user_info', () => ({
  getUserInfo: jest.fn(),
}));

describe('copyPackRoute', () => {
  let routeHandler: RequestHandler;
  let mockOsqueryContext: OsqueryAppContext;

  const createMockRouter = () => {
    const httpService = httpServiceMock.createSetupContract();

    return httpService.createRouter();
  };

  const sourcePackSO = {
    id: 'source-pack-id',
    attributes: {
      name: 'my-pack',
      description: 'Test pack description',
      queries: [
        { id: 'q1', name: 'query-1', query: 'select 1;', interval: 3600 },
        { id: 'q2', name: 'query-2', query: 'select 2;', interval: 7200, snapshot: true },
      ],
      enabled: true,
      version: 1,
      shards: [{ key: 'default', value: 100 }],
      created_at: '2025-01-01T00:00:00.000Z',
      created_by: 'admin',
      updated_at: '2025-01-01T00:00:00.000Z',
      updated_by: 'admin',
    },
    references: [
      { id: 'policy-1', name: 'Policy 1', type: 'ingest-agent-policies' },
      { id: 'policy-2', name: 'Policy 2', type: 'ingest-agent-policies' },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockOsqueryContext = {
      logFactory: {
        get: jest.fn().mockReturnValue(loggingSystemMock.createLogger()),
      },
      security: {},
      getStartServices: jest.fn().mockResolvedValue([{}, { security: {} }, {}]),
      experimentalFeatures: { rruleScheduling: false },
    } as unknown as OsqueryAppContext;
  });

  const setupRoute = () => {
    const mockRouter = createMockRouter();
    copyPackRoute(mockRouter, mockOsqueryContext);

    const route = mockRouter.versioned.getRoute('post', '/api/osquery/packs/{id}/copy');
    const routeVersion = route.versions[API_VERSIONS.public.v1];
    if (!routeVersion) {
      throw new Error(`Handler for version [${API_VERSIONS.public.v1}] not found!`);
    }

    routeHandler = routeVersion.handler;
  };

  it('successfully copies a pack with queries but without policy assignments', async () => {
    const mockSavedObjectsClient = {
      get: jest.fn().mockResolvedValue(sourcePackSO),
      find: jest.fn().mockResolvedValue({ saved_objects: [] }),
      create: jest.fn().mockResolvedValue({
        id: 'new-pack-id',
        attributes: {
          name: 'my-pack_copy',
          description: 'Test pack description',
          queries: sourcePackSO.attributes.queries,
          enabled: false,
          shards: {},
          created_at: '2025-06-01T00:00:00.000Z',
          created_by: 'tester',
          updated_at: '2025-06-01T00:00:00.000Z',
          updated_by: 'tester',
        },
      }),
    };

    (createInternalSavedObjectsClientForSpaceId as jest.Mock).mockResolvedValue(
      mockSavedObjectsClient
    );
    (getUserInfo as jest.Mock).mockResolvedValue({ username: 'tester' });

    setupRoute();

    const mockRequest = httpServerMock.createKibanaRequest({
      params: { id: 'source-pack-id' },
    });
    const mockResponse = httpServerMock.createResponseFactory();

    await routeHandler({} as any, mockRequest, mockResponse);

    expect(mockResponse.ok).toHaveBeenCalled();
    const responseBody = mockResponse.ok.mock.calls[0][0]?.body as any;
    expect(responseBody.data.name).toBe('my-pack_copy');
    expect(responseBody.data.saved_object_id).toBe('new-pack-id');
    expect(responseBody.data.enabled).toBe(false);

    // Verify policy_ids is NOT passed to create (it's derived from references, not a SO attribute)
    const createArgs = mockSavedObjectsClient.create.mock.calls[0][1];
    expect(createArgs.policy_ids).toBeUndefined();
    expect(createArgs.shards).toEqual([]);

    // Verify all references are cleared (no agent policy or prebuilt asset refs)
    const createOptions = mockSavedObjectsClient.create.mock.calls[0][2];
    expect(createOptions.references).toEqual([]);
  });

  it('resolves name collision', async () => {
    const mockSavedObjectsClient = {
      get: jest.fn().mockResolvedValue(sourcePackSO),
      find: jest.fn().mockResolvedValue({
        saved_objects: [
          { attributes: { name: 'my-pack_copy' } },
          { attributes: { name: 'my-pack_copy_2' } },
        ],
      }),
      create: jest.fn().mockResolvedValue({
        id: 'new-pack-id',
        attributes: {
          name: 'my-pack_copy_3',
          description: 'Test pack description',
          queries: sourcePackSO.attributes.queries,
          enabled: false,
          created_at: '2025-06-01T00:00:00.000Z',
          created_by: 'tester',
          updated_at: '2025-06-01T00:00:00.000Z',
          updated_by: 'tester',
        },
      }),
    };

    (createInternalSavedObjectsClientForSpaceId as jest.Mock).mockResolvedValue(
      mockSavedObjectsClient
    );
    (getUserInfo as jest.Mock).mockResolvedValue({ username: 'tester' });

    setupRoute();

    const mockRequest = httpServerMock.createKibanaRequest({
      params: { id: 'source-pack-id' },
    });
    const mockResponse = httpServerMock.createResponseFactory();

    await routeHandler({} as any, mockRequest, mockResponse);

    const createArgs = mockSavedObjectsClient.create.mock.calls[0][1];
    expect(createArgs.name).toBe('my-pack_copy_3');
  });

  it('returns 404 when source not found', async () => {
    const mockSavedObjectsClient = {
      get: jest.fn().mockRejectedValue(new Error('Not found')),
    };

    (createInternalSavedObjectsClientForSpaceId as jest.Mock).mockResolvedValue(
      mockSavedObjectsClient
    );

    setupRoute();

    const mockRequest = httpServerMock.createKibanaRequest({
      params: { id: 'non-existent' },
    });
    const mockResponse = httpServerMock.createResponseFactory();

    await routeHandler({} as any, mockRequest, mockResponse);

    expect(mockResponse.notFound).toHaveBeenCalledWith({
      body: 'Pack with id "non-existent" not found.',
    });
  });

  it('always sets enabled to false even when source is enabled', async () => {
    const enabledPackSO = {
      ...sourcePackSO,
      attributes: { ...sourcePackSO.attributes, enabled: true },
    };

    const mockSavedObjectsClient = {
      get: jest.fn().mockResolvedValue(enabledPackSO),
      find: jest.fn().mockResolvedValue({ saved_objects: [] }),
      create: jest.fn().mockResolvedValue({
        id: 'new-pack-id',
        attributes: {
          name: 'my-pack_copy',
          enabled: false,
          created_at: '2025-06-01T00:00:00.000Z',
          created_by: 'tester',
          updated_at: '2025-06-01T00:00:00.000Z',
          updated_by: 'tester',
        },
      }),
    };

    (createInternalSavedObjectsClientForSpaceId as jest.Mock).mockResolvedValue(
      mockSavedObjectsClient
    );
    (getUserInfo as jest.Mock).mockResolvedValue({ username: 'tester' });

    setupRoute();

    const mockRequest = httpServerMock.createKibanaRequest({
      params: { id: 'source-pack-id' },
    });
    const mockResponse = httpServerMock.createResponseFactory();

    await routeHandler({} as any, mockRequest, mockResponse);

    const createArgs = mockSavedObjectsClient.create.mock.calls[0][1];
    expect(createArgs.enabled).toBe(false);
  });

  it('clears all references including prebuilt assets and agent policies', async () => {
    const prebuiltPackSOWithAssetRef = {
      ...sourcePackSO,
      references: [
        ...sourcePackSO.references,
        { id: 'asset-123', name: 'Prebuilt Pack', type: 'osquery-pack-asset' },
      ],
    };

    const mockSavedObjectsClient = {
      get: jest.fn().mockResolvedValue(prebuiltPackSOWithAssetRef),
      find: jest.fn().mockResolvedValue({ saved_objects: [] }),
      create: jest.fn().mockResolvedValue({
        id: 'new-pack-id',
        attributes: {
          name: 'my-pack_copy',
          enabled: false,
          shards: {},
          created_at: '2025-06-01T00:00:00.000Z',
          created_by: 'tester',
          updated_at: '2025-06-01T00:00:00.000Z',
          updated_by: 'tester',
        },
      }),
    };

    (createInternalSavedObjectsClientForSpaceId as jest.Mock).mockResolvedValue(
      mockSavedObjectsClient
    );
    (getUserInfo as jest.Mock).mockResolvedValue({ username: 'tester' });

    setupRoute();

    const mockRequest = httpServerMock.createKibanaRequest({
      params: { id: 'source-pack-id' },
    });
    const mockResponse = httpServerMock.createResponseFactory();

    await routeHandler({} as any, mockRequest, mockResponse);

    // Verify all references are cleared — agent policies and prebuilt assets are both stripped
    const createOptions = mockSavedObjectsClient.create.mock.calls[0][2];
    expect(createOptions.references).toEqual([]);
  });

  it('strips version and read_only from prebuilt pack copy', async () => {
    const prebuiltPackSO = {
      ...sourcePackSO,
      attributes: { ...sourcePackSO.attributes, version: 2, read_only: true },
    };

    const mockSavedObjectsClient = {
      get: jest.fn().mockResolvedValue(prebuiltPackSO),
      find: jest.fn().mockResolvedValue({ saved_objects: [] }),
      create: jest.fn().mockResolvedValue({
        id: 'new-pack-id',
        attributes: {
          name: 'my-pack_copy',
          enabled: false,
          created_at: '2025-06-01T00:00:00.000Z',
          created_by: 'tester',
          updated_at: '2025-06-01T00:00:00.000Z',
          updated_by: 'tester',
        },
      }),
    };

    (createInternalSavedObjectsClientForSpaceId as jest.Mock).mockResolvedValue(
      mockSavedObjectsClient
    );
    (getUserInfo as jest.Mock).mockResolvedValue({ username: 'tester' });

    setupRoute();

    const mockRequest = httpServerMock.createKibanaRequest({
      params: { id: 'source-pack-id' },
    });
    const mockResponse = httpServerMock.createResponseFactory();

    await routeHandler({} as any, mockRequest, mockResponse);

    const createArgs = mockSavedObjectsClient.create.mock.calls[0][1];
    expect(createArgs.version).toBeUndefined();
    expect(createArgs.read_only).toBeUndefined();
  });

  it('flag off — strips RRULE state from source SO before persisting the copy', async () => {
    // Regression: copy MUST NOT smuggle RRULE state from a flag-on era onto a
    // fresh SO when the feature flag is off. Symmetric with create_pack_route
    // and update_pack_route's request-boundary gate.
    const rrulePackSO = {
      ...sourcePackSO,
      attributes: {
        ...sourcePackSO.attributes,
        schedule_type: 'rrule' as const,
        rrule_schedule: { rrule: 'FREQ=DAILY', start_date: '2026-01-01T00:00:00Z' },
        queries: [
          {
            id: 'q1',
            name: 'query-1',
            query: 'select 1;',
            schedule_type: 'rrule',
            rrule_schedule: { rrule: 'FREQ=DAILY', start_date: '2026-01-01T00:00:00Z' },
          },
        ],
      },
    };

    const mockSavedObjectsClient = {
      get: jest.fn().mockResolvedValue(rrulePackSO),
      find: jest.fn().mockResolvedValue({ saved_objects: [] }),
      create: jest.fn().mockResolvedValue({
        id: 'new-pack-id',
        attributes: {
          name: 'my-pack_copy',
          enabled: false,
          created_at: '2025-06-01T00:00:00.000Z',
          created_by: 'tester',
          updated_at: '2025-06-01T00:00:00.000Z',
          updated_by: 'tester',
        },
      }),
    };

    (createInternalSavedObjectsClientForSpaceId as jest.Mock).mockResolvedValue(
      mockSavedObjectsClient
    );
    (getUserInfo as jest.Mock).mockResolvedValue({ username: 'tester' });

    setupRoute();

    const mockRequest = httpServerMock.createKibanaRequest({
      params: { id: 'source-pack-id' },
    });
    const mockResponse = httpServerMock.createResponseFactory();

    await routeHandler({} as any, mockRequest, mockResponse);

    const createArgs = mockSavedObjectsClient.create.mock.calls[0][1];
    expect(createArgs.schedule_type).toBeUndefined();
    expect(createArgs.rrule_schedule).toBeUndefined();
    // Per-query RRULE state also stripped.
    expect(createArgs.queries[0].schedule_type).toBeUndefined();
    expect(createArgs.queries[0].rrule_schedule).toBeUndefined();

    // Response also omits the discriminator (flag-off contract).
    const responseBody = mockResponse.ok.mock.calls[0][0]?.body as any;
    expect(responseBody.data.schedule_type).toBeUndefined();
    expect(responseBody.data.rrule_schedule).toBeUndefined();
  });

  it('copy regenerates schedule_id per query — source UUIDs are not inherited', async () => {
    // Regression guard: copy_pack_route.ts:100-109 regenerates schedule_id for
    // every copied query via `{ ...q, schedule_id: uuidv4(), start_date: ... }`.
    // If that spread were removed, copied packs would inherit source UUIDs,
    // causing beats-side deduplication collisions.
    const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

    const sourceWithScheduleIds = {
      ...sourcePackSO,
      attributes: {
        ...sourcePackSO.attributes,
        queries: [
          {
            id: 'q1',
            name: 'query-1',
            query: 'select 1;',
            interval: 3600,
            schedule_id: 'source-uuid-1',
            start_date: '2025-01-01T00:00:00.000Z',
          },
          {
            id: 'q2',
            name: 'query-2',
            query: 'select 2;',
            interval: 7200,
            schedule_id: 'source-uuid-2',
            start_date: '2025-01-01T00:00:00.000Z',
          },
        ],
      },
    };

    let capturedCreateArgs: any;
    const mockSavedObjectsClient = {
      get: jest.fn().mockResolvedValue(sourceWithScheduleIds),
      find: jest.fn().mockResolvedValue({ saved_objects: [] }),
      create: jest.fn().mockImplementation((type: string, attrs: any) => {
        capturedCreateArgs = attrs;

        return Promise.resolve({
          id: 'new-pack-id',
          attributes: {
            ...attrs,
            name: 'my-pack_copy',
            enabled: false,
            created_at: '2025-06-01T00:00:00.000Z',
            created_by: 'tester',
            updated_at: '2025-06-01T00:00:00.000Z',
            updated_by: 'tester',
          },
        });
      }),
    };

    (createInternalSavedObjectsClientForSpaceId as jest.Mock).mockResolvedValue(
      mockSavedObjectsClient
    );
    (getUserInfo as jest.Mock).mockResolvedValue({ username: 'tester' });

    setupRoute();

    const mockRequest = httpServerMock.createKibanaRequest({
      params: { id: 'source-pack-id' },
    });
    const mockResponse = httpServerMock.createResponseFactory();

    await routeHandler({} as any, mockRequest, mockResponse);

    expect(mockResponse.ok).toHaveBeenCalled();
    const copiedQueries: Array<{ schedule_id?: string }> = capturedCreateArgs.queries;

    // Every copied query must have a new schedule_id.
    expect(copiedQueries[0].schedule_id).toBeDefined();
    expect(copiedQueries[1].schedule_id).toBeDefined();

    // New schedule_ids must be valid UUID v4.
    expect(copiedQueries[0].schedule_id).toMatch(UUID_V4_REGEX);
    expect(copiedQueries[1].schedule_id).toMatch(UUID_V4_REGEX);

    // New schedule_ids must NOT match the source UUIDs.
    expect(copiedQueries[0].schedule_id).not.toBe('source-uuid-1');
    expect(copiedQueries[1].schedule_id).not.toBe('source-uuid-2');

    // The two copied queries must not collide with each other.
    expect(copiedQueries[0].schedule_id).not.toBe(copiedQueries[1].schedule_id);
  });

  it('flag on — preserves RRULE state from source SO', async () => {
    const rruleValue = { rrule: 'FREQ=DAILY', start_date: '2026-01-01T00:00:00Z' };
    const rrulePackSO = {
      ...sourcePackSO,
      attributes: {
        ...sourcePackSO.attributes,
        schedule_type: 'rrule' as const,
        rrule_schedule: rruleValue,
      },
    };

    const mockSavedObjectsClient = {
      get: jest.fn().mockResolvedValue(rrulePackSO),
      find: jest.fn().mockResolvedValue({ saved_objects: [] }),
      create: jest.fn().mockResolvedValue({
        id: 'new-pack-id',
        attributes: {
          name: 'my-pack_copy',
          enabled: false,
          schedule_type: 'rrule',
          rrule_schedule: rruleValue,
          created_at: '2025-06-01T00:00:00.000Z',
          created_by: 'tester',
          updated_at: '2025-06-01T00:00:00.000Z',
          updated_by: 'tester',
        },
      }),
    };

    (createInternalSavedObjectsClientForSpaceId as jest.Mock).mockResolvedValue(
      mockSavedObjectsClient
    );
    (getUserInfo as jest.Mock).mockResolvedValue({ username: 'tester' });

    mockOsqueryContext = {
      ...mockOsqueryContext,
      experimentalFeatures: { rruleScheduling: true },
    } as unknown as OsqueryAppContext;

    setupRoute();

    const mockRequest = httpServerMock.createKibanaRequest({
      params: { id: 'source-pack-id' },
    });
    const mockResponse = httpServerMock.createResponseFactory();

    await routeHandler({} as any, mockRequest, mockResponse);

    const createArgs = mockSavedObjectsClient.create.mock.calls[0][1];
    expect(createArgs.schedule_type).toBe('rrule');
    expect(createArgs.rrule_schedule).toEqual(rruleValue);
  });
});
