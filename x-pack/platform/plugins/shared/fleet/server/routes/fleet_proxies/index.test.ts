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
import { FleetProxySchema, FleetProxyResponseSchema } from '../../types';
import {
  createFleetProxy,
  getFleetProxy,
  listFleetProxies,
  updateFleetProxy,
} from '../../services/fleet_proxies';

import {
  getAllFleetProxyHandler,
  getFleetProxyHandler,
  postFleetProxyHandler,
  putFleetProxyHandler,
} from './handler';

jest.mock('../../services', () => ({
  appContextService: {
    getLogger: jest.fn().mockReturnValue({ error: jest.fn() } as any),
  },
}));

jest.mock('../../services/fleet_proxies', () => ({
  listFleetProxies: jest.fn(),
  createFleetProxy: jest.fn(),
  updateFleetProxy: jest.fn(),
  getFleetProxyRelatedSavedObjects: jest.fn().mockResolvedValue({
    fleetServerHosts: [],
    outputs: [],
    downloadSources: [],
  }),
  getFleetProxy: jest.fn(),
}));

jest.mock('./handler', () => ({
  ...jest.requireActual('./handler'),
  bumpRelatedPolicies: jest.fn().mockResolvedValue({}),
}));

describe('schema validation', () => {
  let context: FleetRequestHandlerContext;
  let response: ReturnType<typeof httpServerMock.createResponseFactory>;

  beforeEach(() => {
    context = xpackMocks.createRequestHandlerContext() as unknown as FleetRequestHandlerContext;
    response = httpServerMock.createResponseFactory();
  });

  it('list fleet proxies should return valid response', async () => {
    const expectedResponse = {
      items: [
        {
          id: 'proxy1',
          name: 'proxy1',
          url: 'http://proxy1:8080',
          is_preconfigured: true,
          proxy_headers: {
            foo: 'bar',
          },
          certificate_authorities: 'ca',
          certificate: 'cert',
          certificate_key: 'key',
        },
      ],
      total: 1,
      page: 1,
      perPage: 20,
    };
    (listFleetProxies as jest.Mock).mockResolvedValue(expectedResponse);
    await getAllFleetProxyHandler(context, {} as any, response);

    expect(response.ok).toHaveBeenCalledWith({
      body: expectedResponse,
    });
    const validationResp = ListResponseSchema(FleetProxySchema).validate(expectedResponse);
    expect(validationResp).toEqual(expectedResponse);
  });

  it('create fleet proxy should return valid response', async () => {
    const expectedResponse = {
      item: {
        id: 'proxy1',
        name: 'proxy1',
        url: 'http://proxy1:8080',
        is_preconfigured: true,
        proxy_headers: {
          foo: 'bar',
        },
        certificate_authorities: 'ca',
        certificate: 'cert',
        certificate_key: 'key',
      },
    };
    (createFleetProxy as jest.Mock).mockResolvedValue(expectedResponse.item);
    await postFleetProxyHandler(
      context,
      {
        body: {
          id: 'proxy1',
        },
      } as any,
      response
    );

    expect(response.ok).toHaveBeenCalledWith({
      body: expectedResponse,
    });
    const validationResp = FleetProxyResponseSchema.validate(expectedResponse);
    expect(validationResp).toEqual(expectedResponse);
  });

  it('update fleet proxy should return valid response', async () => {
    const expectedResponse = {
      item: {
        id: 'proxy1',
        name: 'proxy1',
        url: 'http://proxy1:8080',
        is_preconfigured: false,
      },
    };
    (updateFleetProxy as jest.Mock).mockResolvedValue(expectedResponse.item);
    await putFleetProxyHandler(
      context,
      { body: {}, params: { itemId: 'proxy1' } } as any,
      response
    );

    expect(response.ok).toHaveBeenCalledWith({
      body: expectedResponse,
    });
    const validationResp = FleetProxyResponseSchema.validate(expectedResponse);
    expect(validationResp).toEqual(expectedResponse);
  });

  it('get fleet proxy should return valid response', async () => {
    const expectedResponse = {
      item: {
        id: 'proxy1',
        name: 'proxy1',
        url: 'http://proxy1:8080',
        is_preconfigured: false,
        proxy_headers: null,
        certificate_authorities: null,
        certificate: null,
        certificate_key: null,
      },
    };
    (getFleetProxy as jest.Mock).mockResolvedValue(expectedResponse.item);
    await getFleetProxyHandler(
      context,
      { body: {}, params: { itemId: 'proxy1' } } as any,
      response
    );

    expect(response.ok).toHaveBeenCalledWith({
      body: expectedResponse,
    });
    const validationResp = FleetProxyResponseSchema.validate(expectedResponse);
    expect(validationResp).toEqual(expectedResponse);
  });
});
