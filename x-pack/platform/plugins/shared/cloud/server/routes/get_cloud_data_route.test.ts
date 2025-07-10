/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, httpServiceMock } from '@kbn/core/server/mocks';
import {
  RequestHandlerContext,
  RouteValidatorConfig,
  SavedObjectsErrorHelpers,
  kibanaResponseFactory,
} from '@kbn/core/server';
import { CLOUD_DATA_SAVED_OBJECT_TYPE } from '../saved_objects';
import { CLOUD_DATA_SAVED_OBJECT_ID } from './constants';
import { RouteOptions } from '.';
import { setGetCloudSolutionDataRoute } from './get_cloud_data_route';

const mockSavedObjectsClientGet = jest.fn();
const mockSavedObjectsClientCreate = jest.fn();
const mockSavedObjectsClientUpdate = jest.fn();

const mockRouteContext = {
  core: {
    savedObjects: {
      getClient: () => ({
        get: mockSavedObjectsClientGet,
        create: mockSavedObjectsClientCreate,
        update: mockSavedObjectsClientUpdate,
      }),
    },
  },
} as unknown as RequestHandlerContext;

describe('GET /internal/cloud/solution', () => {
  const setup = async () => {
    const httpService = httpServiceMock.createSetupContract();
    const router = httpService.createRouter();

    setGetCloudSolutionDataRoute({
      router,
    } as unknown as RouteOptions);

    const [routeDefinition, routeHandler] =
      router.versioned.get.mock.results[0].value.addVersion.mock.calls[0];

    return {
      routeValidation: routeDefinition.validate as RouteValidatorConfig<{}, {}, {}>,
      routeHandler,
    };
  };
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return not found if cloud data does NOT exists', async () => {
    const { routeHandler } = await setup();

    mockSavedObjectsClientGet.mockRejectedValue(
      SavedObjectsErrorHelpers.createGenericNotFoundError()
    );

    const request = httpServerMock.createKibanaRequest({
      method: 'get',
    });

    const response = await routeHandler(mockRouteContext, request, kibanaResponseFactory);

    expect(mockSavedObjectsClientGet).toHaveBeenCalledWith(
      CLOUD_DATA_SAVED_OBJECT_TYPE,
      CLOUD_DATA_SAVED_OBJECT_ID
    );
    expect(response).toMatchInlineSnapshot(`
      KibanaResponse {
        "options": Object {},
        "payload": "Not Found",
        "status": 404,
      }
    `);
  });

  it('should get cloud data if it exists', async () => {
    const { routeHandler } = await setup();

    mockSavedObjectsClientGet.mockResolvedValue({
      id: CLOUD_DATA_SAVED_OBJECT_ID,
      attributes: {
        onboardingData: { solutionType: 'o11y', token: 'test-33' },
      },
    });

    const request = httpServerMock.createKibanaRequest({
      method: 'get',
    });

    const response = await routeHandler(mockRouteContext, request, kibanaResponseFactory);

    expect(mockSavedObjectsClientGet).toHaveBeenCalledWith(
      CLOUD_DATA_SAVED_OBJECT_TYPE,
      CLOUD_DATA_SAVED_OBJECT_ID
    );
    expect(response).toMatchInlineSnapshot(`
      KibanaResponse {
        "options": Object {
          "body": Object {
            "onboardingData": Object {
              "solutionType": "o11y",
              "token": "test-33",
            },
          },
        },
        "payload": Object {
          "onboardingData": Object {
            "solutionType": "o11y",
            "token": "test-33",
          },
        },
        "status": 200,
      }
    `);
  });
});
