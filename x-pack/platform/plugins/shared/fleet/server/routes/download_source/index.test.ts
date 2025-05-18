/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';

import type { FleetRequestHandlerContext } from '../..';
import { xpackMocks } from '../../mocks';
import { ListResponseSchema } from '../schema/utils';
import {
  DownloadSourceResponseSchema,
  DeleteDownloadSourcesResponseSchema,
  GetDownloadSourceResponseSchema,
} from '../../types';
import { downloadSourceService } from '../../services/download_source';

import {
  getDownloadSourcesHandler,
  getOneDownloadSourcesHandler,
  putDownloadSourcesHandler,
  postDownloadSourcesHandler,
  deleteDownloadSourcesHandler,
} from './handler';

jest.mock('../../services', () => ({
  appContextService: {
    getLogger: jest.fn().mockReturnValue({ error: jest.fn() } as any),
  },
  agentPolicyService: {
    bumpAllAgentPolicies: jest.fn().mockResolvedValue({}),
  },
}));

jest.mock('../../services/download_source', () => ({
  downloadSourceService: {
    list: jest.fn(),
    get: jest.fn(),
    create: jest.fn(),
    update: jest.fn().mockResolvedValue({}),
    delete: jest.fn(),
  },
}));

describe('schema validation', () => {
  let context: FleetRequestHandlerContext;
  let response: ReturnType<typeof httpServerMock.createResponseFactory>;

  beforeEach(() => {
    context = xpackMocks.createRequestHandlerContext() as unknown as FleetRequestHandlerContext;
    response = httpServerMock.createResponseFactory();
  });

  it('list download sources should return valid response', async () => {
    const expectedResponse = {
      items: [
        {
          name: 'source1',
          host: 'http://source1:8080',
          id: 'source1',
          is_default: true,
          proxy_id: 'proxy1',
        },
      ],
      total: 1,
      page: 1,
      perPage: 20,
    };
    (downloadSourceService.list as jest.Mock).mockResolvedValue(expectedResponse);
    await getDownloadSourcesHandler(context, {} as any, response);

    expect(response.ok).toHaveBeenCalledWith({
      body: expectedResponse,
    });
    const validationResp = ListResponseSchema(DownloadSourceResponseSchema).validate(
      expectedResponse
    );
    expect(validationResp).toEqual(expectedResponse);
  });

  it('create download source should return valid response', async () => {
    const expectedResponse = {
      item: {
        name: 'source1',
        host: 'http://source1:8080',
        id: 'source1',
        is_default: true,
        proxy_id: null,
      },
    };
    (downloadSourceService.create as jest.Mock).mockResolvedValue(expectedResponse.item);
    await postDownloadSourcesHandler(
      context,
      {
        body: {
          id: 'source1',
        },
      } as any,
      response
    );

    expect(response.ok).toHaveBeenCalledWith({
      body: expectedResponse,
    });
    const validationResp = GetDownloadSourceResponseSchema.validate(expectedResponse);
    expect(validationResp).toEqual(expectedResponse);
  });

  it('update download source should return valid response', async () => {
    const expectedResponse = {
      item: {
        name: 'source1',
        host: 'http://source1:8080',
        id: 'source1',
        is_default: true,
      },
    };
    (downloadSourceService.get as jest.Mock).mockResolvedValue(expectedResponse.item);
    await putDownloadSourcesHandler(
      context,
      {
        body: {},
        params: { itemId: 'source1' },
      } as any,
      response
    );

    expect(response.ok).toHaveBeenCalledWith({
      body: expectedResponse,
    });
    const validationResp = GetDownloadSourceResponseSchema.validate(expectedResponse);
    expect(validationResp).toEqual(expectedResponse);
  });

  it('get download source should return valid response', async () => {
    const expectedResponse = {
      item: {
        name: 'source1',
        host: 'http://source1:8080',
        id: 'source1',
        is_default: true,
        proxy_id: 'proxy1',
      },
    };
    (downloadSourceService.get as jest.Mock).mockResolvedValue(expectedResponse.item);
    await getOneDownloadSourcesHandler(
      context,
      { body: {}, params: { itemId: 'source1' } } as any,
      response
    );

    expect(response.ok).toHaveBeenCalledWith({
      body: expectedResponse,
    });
    const validationResp = GetDownloadSourceResponseSchema.validate(expectedResponse);
    expect(validationResp).toEqual(expectedResponse);
  });

  it('delete download source should return valid response', async () => {
    const expectedResponse = {
      id: 'source1',
    };
    await deleteDownloadSourcesHandler(
      context,
      { params: { sourceId: 'source1' } } as any,
      response
    );

    expect(response.ok).toHaveBeenCalledWith({
      body: expectedResponse,
    });
    const validationResp = DeleteDownloadSourcesResponseSchema.validate(expectedResponse);
    expect(validationResp).toEqual(expectedResponse);
  });
});
