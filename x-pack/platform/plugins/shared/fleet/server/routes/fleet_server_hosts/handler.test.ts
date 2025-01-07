/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SERVERLESS_DEFAULT_FLEET_SERVER_HOST_ID } from '../../constants';
import { agentPolicyService, appContextService } from '../../services';
import * as fleetServerService from '../../services/fleet_server_host';
import { withDefaultErrorHandler } from '../../services/security/fleet_router';

import { postFleetServerHost, putFleetServerHostHandler } from './handler';

const postFleetServerHostWithErrorHandler = withDefaultErrorHandler(postFleetServerHost);
const putFleetServerHostHandlerWithErrorHandler =
  withDefaultErrorHandler(putFleetServerHostHandler);

describe('fleet server hosts handler', () => {
  const mockContext = {
    core: Promise.resolve({
      savedObjects: {},
      elasticsearch: {
        client: {},
      },
    }),
  } as any;
  const mockResponse = {
    customError: jest.fn().mockImplementation((options) => options),
    ok: jest.fn().mockImplementation((options) => options),
  };

  beforeEach(() => {
    jest.spyOn(appContextService, 'getLogger').mockReturnValue({ error: jest.fn() } as any);
    jest
      .spyOn(fleetServerService, 'createFleetServerHost')
      .mockResolvedValue({ id: 'host1' } as any);
    jest
      .spyOn(fleetServerService, 'updateFleetServerHost')
      .mockResolvedValue({ id: 'host1' } as any);
    jest.spyOn(fleetServerService, 'getFleetServerHost').mockResolvedValue({
      id: SERVERLESS_DEFAULT_FLEET_SERVER_HOST_ID,
      host_urls: ['http://elasticsearch:9200'],
    } as any);
    jest
      .spyOn(agentPolicyService, 'bumpAllAgentPoliciesForFleetServerHosts')
      .mockResolvedValue({} as any);
  });

  it('should return error on post in serverless if host url is different from default', async () => {
    jest.spyOn(appContextService, 'getCloud').mockReturnValue({ isServerlessEnabled: true } as any);

    const res = await postFleetServerHostWithErrorHandler(
      mockContext,
      { body: { id: 'host1', host_urls: ['http://localhost:8080'] } } as any,
      mockResponse as any
    );

    expect(res).toEqual({
      body: {
        message: 'Fleet server host must have default URL in serverless: http://elasticsearch:9200',
      },
      statusCode: 403,
    });
  });

  it('should return ok on post in serverless if host url is same as default', async () => {
    jest.spyOn(appContextService, 'getCloud').mockReturnValue({ isServerlessEnabled: true } as any);

    const res = await postFleetServerHostWithErrorHandler(
      mockContext,
      { body: { id: 'host1', host_urls: ['http://elasticsearch:9200'] } } as any,
      mockResponse as any
    );

    expect(res).toEqual({ body: { item: { id: 'host1' } } });
  });

  it('should return ok on post in stateful if host url is different from default', async () => {
    jest
      .spyOn(appContextService, 'getCloud')
      .mockReturnValue({ isServerlessEnabled: false } as any);

    const res = await postFleetServerHostWithErrorHandler(
      mockContext,
      { body: { id: 'host1', host_urls: ['http://localhost:8080'] } } as any,
      mockResponse as any
    );

    expect(res).toEqual({ body: { item: { id: 'host1' } } });
  });

  it('should return error on put in serverless if host url is different from default', async () => {
    jest.spyOn(appContextService, 'getCloud').mockReturnValue({ isServerlessEnabled: true } as any);

    const res = await putFleetServerHostHandlerWithErrorHandler(
      mockContext,
      { body: { host_urls: ['http://localhost:8080'] }, params: { outputId: 'host1' } } as any,
      mockResponse as any
    );

    expect(res).toEqual({
      body: {
        message: 'Fleet server host must have default URL in serverless: http://elasticsearch:9200',
      },
      statusCode: 403,
    });
  });

  it('should return ok on put in serverless if host url is same as default', async () => {
    jest.spyOn(appContextService, 'getCloud').mockReturnValue({ isServerlessEnabled: true } as any);

    const res = await putFleetServerHostHandlerWithErrorHandler(
      mockContext,
      { body: { host_urls: ['http://elasticsearch:9200'] }, params: { outputId: 'host1' } } as any,
      mockResponse as any
    );

    expect(res).toEqual({ body: { item: { id: 'host1' } } });
  });

  it('should return ok on put in serverless if host urls are not passed', async () => {
    jest.spyOn(appContextService, 'getCloud').mockReturnValue({ isServerlessEnabled: true } as any);

    const res = await putFleetServerHostHandlerWithErrorHandler(
      mockContext,
      { body: { name: ['Renamed'] }, params: { outputId: 'host1' } } as any,
      mockResponse as any
    );

    expect(res).toEqual({ body: { item: { id: 'host1' } } });
  });

  it('should return ok on put in stateful if host url is different from default', async () => {
    jest
      .spyOn(appContextService, 'getCloud')
      .mockReturnValue({ isServerlessEnabled: false } as any);

    const res = await putFleetServerHostHandlerWithErrorHandler(
      mockContext,
      { body: { host_urls: ['http://localhost:8080'] }, params: { outputId: 'host1' } } as any,
      mockResponse as any
    );

    expect(res).toEqual({ body: { item: { id: 'host1' } } });
  });
});
