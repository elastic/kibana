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
import { createSavedQueryRoute } from './create_saved_query_route';
import { createInternalSavedObjectsClientForSpaceId } from '../../utils/get_internal_saved_object_client';
import { getUserInfo } from '../../lib/get_user_info';

jest.mock('../../utils/get_internal_saved_object_client', () => ({
  createInternalSavedObjectsClientForSpaceId: jest.fn(),
}));

jest.mock('../../lib/get_user_info', () => ({
  getUserInfo: jest.fn(),
}));

describe('createSavedQueryRoute', () => {
  let routeHandler: RequestHandler;
  let mockOsqueryContext: OsqueryAppContext;

  const createMockRouter = () => {
    const httpService = httpServiceMock.createSetupContract();

    return httpService.createRouter();
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockOsqueryContext = {
      logFactory: {
        get: jest.fn().mockReturnValue(loggingSystemMock.createLogger()),
      },
      security: {},
    } as unknown as OsqueryAppContext;
  });

  it('returns conflict when saved query id already exists', async () => {
    const mockSavedObjectsClient = {
      find: jest.fn().mockResolvedValue({
        saved_objects: [{ attributes: { id: 'query-1' } }],
      }),
    };

    (createInternalSavedObjectsClientForSpaceId as jest.Mock).mockResolvedValue(
      mockSavedObjectsClient
    );
    (getUserInfo as jest.Mock).mockResolvedValue({ username: 'tester' });

    const mockRouter = createMockRouter();
    createSavedQueryRoute(mockRouter, mockOsqueryContext);

    const route = mockRouter.versioned.getRoute('post', '/api/osquery/saved_queries');
    const routeVersion = route.versions[API_VERSIONS.public.v1];
    if (!routeVersion) {
      throw new Error(`Handler for version [${API_VERSIONS.public.v1}] not found!`);
    }

    routeHandler = routeVersion.handler;

    const mockRequest = httpServerMock.createKibanaRequest({
      body: {
        id: 'query-1',
        query: 'select 1;',
        interval: 3600,
      },
    });
    const mockResponse = httpServerMock.createResponseFactory();

    await routeHandler({} as any, mockRequest, mockResponse);

    expect(mockResponse.conflict).toHaveBeenCalledWith({
      body: 'Saved query with id "query-1" already exists.',
    });
  });
});
