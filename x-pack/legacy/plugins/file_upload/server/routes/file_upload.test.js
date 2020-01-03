/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CANVAS_TYPE } from '../../../../../legacy/plugins/canvas/common/lib/constants';
import { initializeDeleteWorkpadRoute } from './delete';
import {
  IRouter,
  kibanaResponseFactory,
  RequestHandlerContext,
  RequestHandler,
} from 'src/core/server';
import {
  savedObjectsClientMock,
  httpServiceMock,
  httpServerMock,
  loggingServiceMock,
} from 'src/core/server/mocks';

const mockRouteContext = ({
  core: {
    savedObjects: {
      client: savedObjectsClientMock.create(),
    },
  },
} as unknown) as RequestHandlerContext;

describe('POST file', () => {
  let routeHandler: RequestHandler<any, any, any>;

  beforeEach(() => {
    const httpService = httpServiceMock.createSetupContract();
    const router = httpService.createRouter('') as jest.Mocked<IRouter>;
    initializeDeleteWorkpadRoute({
      router,
      logger: loggingServiceMock.create().get(),
    });

    routeHandler = router.delete.mock.calls[0][1];
  });

  it(`rejects file with no content`, async () => {
  });
  it(`accepts request with correct structure`, async () => {
  });
  it(`rejects request with incorrect structure`, async () => {
  });
  it(`rejects request over size limit`, async () => {
  });
  it(`accepts request within size limit`, async () => {
  });
  it(`requires mappings if no id present`, async () => {
  });
  it(`requires data & settings if id is present`, async () => {
  });

  it(`returns 200 ok when the workpad is deleted`, async () => {
    const id = 'some-id';
    const request = httpServerMock.createKibanaRequest({
      method: 'delete',
      path: `api/canvas/workpad/${id}`,
      params: {
        id,
      },
    });

    const response = await routeHandler(mockRouteContext, request, kibanaResponseFactory);

    expect(response.status).toBe(200);
    expect(response.payload).toEqual({ ok: true });
    expect(mockRouteContext.core.savedObjects.client.delete).toBeCalledWith(CANVAS_TYPE, id);
  });

  it(`returns bad request if delete is unsuccessful`, async () => {
    const request = httpServerMock.createKibanaRequest({
      method: 'delete',
      path: `api/canvas/workpad/some-id`,
      params: {
        id: 'some-id',
      },
    });

    (mockRouteContext.core.savedObjects.client.delete as jest.Mock).mockImplementationOnce(() => {
      throw mockRouteContext.core.savedObjects.client.errors.createBadRequestError('bad request');
    });

    const response = await routeHandler(mockRouteContext, request, kibanaResponseFactory);

    expect(response.status).toBe(400);
  });
});
