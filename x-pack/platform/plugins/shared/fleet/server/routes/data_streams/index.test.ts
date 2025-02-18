/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';

import type { FleetRequestHandlerContext } from '../..';

import { xpackMocks } from '../../mocks';

import { ListDataStreamsResponseSchema } from '.';
import { getListHandler } from './handlers';

jest.mock('./handlers', () => ({
  getListHandler: jest.fn(),
}));

const getListHandlerMock = getListHandler as jest.Mock;

describe('schema validation', () => {
  let context: FleetRequestHandlerContext;
  let response: ReturnType<typeof httpServerMock.createResponseFactory>;

  beforeEach(() => {
    context = xpackMocks.createRequestHandlerContext() as unknown as FleetRequestHandlerContext;
    response = httpServerMock.createResponseFactory();
  });

  it('list data streams should return valid response', async () => {
    const expectedResponse = {
      data_streams: [
        {
          index: 'index',
          dataset: 'dataset',
          namespace: 'namespace',
          type: 'type',
          package: 'package',
          package_version: '1.0.0',
          last_activity_ms: 123,
          size_in_bytes: 123,
          size_in_bytes_formatted: 123,
          dashboards: [
            {
              id: 'id',
              title: 'title',
            },
          ],
          serviceDetails: {
            environment: 'environment',
            serviceName: 'serviceName',
          },
        },
      ],
    };
    getListHandlerMock.mockImplementation((ctx, request, res) => {
      return res.ok({ body: expectedResponse });
    });
    await getListHandler(context, {} as any, response);
    expect(response.ok).toHaveBeenCalledWith({
      body: expectedResponse,
    });

    const validateResp = ListDataStreamsResponseSchema.validate(expectedResponse);
    expect(validateResp).toEqual(expectedResponse);
  });
});
