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
import { FleetServerHostSchema, FleetServerHostResponseSchema } from '../../types';
import { fleetServerHostService } from '../../services';

import {
  getAllFleetServerHostsHandler,
  getFleetServerHostHandler,
  postFleetServerHost,
  putFleetServerHostHandler,
} from './handler';

jest.mock('../../services', () => ({
  appContextService: {
    getLogger: jest.fn().mockReturnValue({ error: jest.fn() } as any),
    getCloud: jest.fn().mockReturnValue({ isServerlessEnabled: false } as any),
  },
  agentPolicyService: {
    bumpAllAgentPolicies: jest.fn().mockResolvedValue({}),
  },
  fleetServerHostService: {
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

  it('list fleet server hosts should return valid response', async () => {
    const expectedResponse = {
      items: [
        {
          id: 'host1',
          name: 'host1',
          host_urls: ['http://host1:8080'],
          is_preconfigured: true,
          is_default: true,
          is_internal: true,
          proxy_id: 'proxy1',
        },
      ],
      total: 1,
      page: 1,
      perPage: 20,
    };
    (fleetServerHostService.list as jest.Mock).mockResolvedValue(expectedResponse);
    await getAllFleetServerHostsHandler(context, {} as any, response);

    expect(response.ok).toHaveBeenCalledWith({
      body: expectedResponse,
    });
    const validationResp = ListResponseSchema(FleetServerHostSchema).validate(expectedResponse);
    expect(validationResp).toEqual(expectedResponse);
  });

  it('create fleet server host should return valid response', async () => {
    const expectedResponse = {
      item: {
        id: 'host1',
        name: 'host1',
        host_urls: ['http://host1:8080'],
        is_preconfigured: true,
        is_default: true,
        proxy_id: 'proxy1',
      },
    };
    (fleetServerHostService.create as jest.Mock).mockResolvedValue(expectedResponse.item);
    await postFleetServerHost(
      context,
      {
        body: {
          id: 'host1',
        },
      } as any,
      response
    );

    expect(response.ok).toHaveBeenCalledWith({
      body: expectedResponse,
    });
    const validationResp = FleetServerHostResponseSchema.validate(expectedResponse);
    expect(validationResp).toEqual(expectedResponse);
  });

  it('update fleet server host should return valid response', async () => {
    const expectedResponse = {
      item: {
        id: 'host1',
        name: 'host1',
        host_urls: ['http://host1:8080'],
        is_preconfigured: true,
        is_default: true,
        is_internal: true,
        proxy_id: null,
      },
    };
    (fleetServerHostService.update as jest.Mock).mockResolvedValue(expectedResponse.item);
    await putFleetServerHostHandler(
      context,
      {
        body: {
          host_urls: [],
        },
        params: { itemId: 'host1' },
      } as any,
      response
    );

    expect(response.ok).toHaveBeenCalledWith({
      body: expectedResponse,
    });
    const validationResp = FleetServerHostResponseSchema.validate(expectedResponse);
    expect(validationResp).toEqual(expectedResponse);
  });

  it('get fleet server host should return valid response', async () => {
    const expectedResponse = {
      item: {
        id: 'host1',
        name: 'host1',
        host_urls: ['http://host1:8080'],
        is_preconfigured: true,
        is_default: true,
        is_internal: true,
        proxy_id: null,
      },
    };
    (fleetServerHostService.get as jest.Mock).mockResolvedValue(expectedResponse.item);
    await getFleetServerHostHandler(
      context,
      { body: {}, params: { itemId: 'host1' } } as any,
      response
    );

    expect(response.ok).toHaveBeenCalledWith({
      body: expectedResponse,
    });
    const validationResp = FleetServerHostResponseSchema.validate(expectedResponse);
    expect(validationResp).toEqual(expectedResponse);
  });
});
