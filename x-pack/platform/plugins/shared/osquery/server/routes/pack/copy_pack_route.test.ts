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

  it('copies RRULE schedule fields and surfaces them in the response', async () => {
    const sourceWithRrule = {
      ...sourcePackSO,
      attributes: {
        ...sourcePackSO.attributes,
        schedule_type: 'rrule' as const,
        rrule_schedule: {
          rrule: 'FREQ=WEEKLY;BYDAY=MO,WE,FR',
          start_date: '2024-01-01T00:00:00.000Z',
        },
      },
    };

    const mockSavedObjectsClient = {
      get: jest.fn().mockResolvedValue(sourceWithRrule),
      find: jest.fn().mockResolvedValue({ saved_objects: [] }),
      create: jest.fn().mockResolvedValue({
        id: 'new-pack-id',
        attributes: {
          name: 'my-pack_copy',
          description: 'Test pack description',
          queries: sourceWithRrule.attributes.queries,
          enabled: false,
          shards: [],
          schedule_type: 'rrule',
          rrule_schedule: sourceWithRrule.attributes.rrule_schedule,
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
    expect(createArgs.schedule_type).toBe('rrule');
    expect(createArgs.rrule_schedule).toEqual(sourceWithRrule.attributes.rrule_schedule);
    expect(createArgs.interval).toBeUndefined();

    const responseBody = mockResponse.ok.mock.calls[0][0]?.body as any;
    expect(responseBody.data.schedule_type).toBe('rrule');
    expect(responseBody.data.rrule_schedule).toEqual(sourceWithRrule.attributes.rrule_schedule);
    expect(responseBody.data.interval).toBeUndefined();
  });

  it('copies pack-level interval schedule and discriminates the response', async () => {
    const sourceWithInterval = {
      ...sourcePackSO,
      attributes: {
        ...sourcePackSO.attributes,
        schedule_type: 'interval' as const,
        interval: 1800,
      },
    };

    const mockSavedObjectsClient = {
      get: jest.fn().mockResolvedValue(sourceWithInterval),
      find: jest.fn().mockResolvedValue({ saved_objects: [] }),
      create: jest.fn().mockResolvedValue({
        id: 'new-pack-id',
        attributes: {
          name: 'my-pack_copy',
          description: 'Test pack description',
          queries: sourceWithInterval.attributes.queries,
          enabled: false,
          shards: [],
          schedule_type: 'interval',
          interval: 1800,
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
    expect(createArgs.schedule_type).toBe('interval');
    expect(createArgs.interval).toBe(1800);

    const responseBody = mockResponse.ok.mock.calls[0][0]?.body as any;
    expect(responseBody.data.schedule_type).toBe('interval');
    expect(responseBody.data.interval).toBe(1800);
    expect(responseBody.data.rrule_schedule).toBeUndefined();
  });

  // L5 (architect-review follow-up): the copy route spreads `restAttributes`,
  // so any forward-compat `_unknown` parts encoded in the RRULE string survive
  // verbatim. This test guards against future destructure changes that might
  // accidentally strip schedule fields.
  it('preserves RRULE _unknown parts (forward-compat) on copy', async () => {
    const sourceWithUnknownParts = {
      ...sourcePackSO,
      attributes: {
        ...sourcePackSO.attributes,
        schedule_type: 'rrule' as const,
        // The RRULE string contains parts the parser does not recognize
        // (BYHOUR, WKST). The string must be carried through the copy
        // verbatim so the agent receives identical wire bytes.
        rrule_schedule: {
          rrule: 'FREQ=WEEKLY;BYDAY=MO;BYHOUR=9;WKST=MO',
          start_date: '2024-01-01T00:00:00.000Z',
        },
      },
    };

    const mockSavedObjectsClient = {
      get: jest.fn().mockResolvedValue(sourceWithUnknownParts),
      find: jest.fn().mockResolvedValue({ saved_objects: [] }),
      create: jest.fn().mockResolvedValue({
        id: 'new-pack-id',
        attributes: {
          name: 'my-pack_copy',
          description: 'Test pack description',
          queries: sourceWithUnknownParts.attributes.queries,
          enabled: false,
          shards: [],
          schedule_type: 'rrule',
          rrule_schedule: sourceWithUnknownParts.attributes.rrule_schedule,
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
    expect(createArgs.schedule_type).toBe('rrule');
    expect(createArgs.rrule_schedule.rrule).toBe('FREQ=WEEKLY;BYDAY=MO;BYHOUR=9;WKST=MO');

    const responseBody = mockResponse.ok.mock.calls[0][0]?.body as any;
    expect(responseBody.data.rrule_schedule.rrule).toBe('FREQ=WEEKLY;BYDAY=MO;BYHOUR=9;WKST=MO');
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
});
