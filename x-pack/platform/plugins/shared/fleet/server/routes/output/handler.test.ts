/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SERVERLESS_DEFAULT_OUTPUT_ID } from '../../constants';
import { agentPolicyService, appContextService, outputService } from '../../services';
import { withDefaultErrorHandler } from '../../services/security/fleet_router';

import { postOutputHandler, putOutputHandler } from './handler';

const putOutputHandlerWithErrorHandler = withDefaultErrorHandler(putOutputHandler);
const postOutputHandlerWithErrorHandler = withDefaultErrorHandler(postOutputHandler);

describe('output handler', () => {
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
    jest.spyOn(outputService, 'create').mockResolvedValue({ id: 'output1' } as any);
    jest.spyOn(outputService, 'update').mockResolvedValue({ id: 'output1' } as any);
    jest.spyOn(outputService, 'get').mockImplementation((_, id: string) => {
      if (id === SERVERLESS_DEFAULT_OUTPUT_ID) {
        return { hosts: ['http://elasticsearch:9200'] } as any;
      } else {
        return { id: 'output1' } as any;
      }
    });
    jest.spyOn(agentPolicyService, 'bumpAllAgentPoliciesForOutput').mockResolvedValue({} as any);
  });

  it('should return error on post output using remote_elasticsearch in serverless', async () => {
    jest.spyOn(appContextService, 'getCloud').mockReturnValue({ isServerlessEnabled: true } as any);

    const res = await postOutputHandlerWithErrorHandler(
      mockContext,
      { body: { id: 'output1', type: 'remote_elasticsearch' } } as any,
      mockResponse as any
    );

    expect(res).toEqual({
      body: { message: 'Output type remote_elasticsearch not supported in serverless' },
      statusCode: 400,
    });
  });

  it('should return ok on post output using remote_elasticsearch in stateful', async () => {
    jest
      .spyOn(appContextService, 'getCloud')
      .mockReturnValue({ isServerlessEnabled: false } as any);

    const res = await postOutputHandlerWithErrorHandler(
      mockContext,
      { body: { type: 'remote_elasticsearch' } } as any,
      mockResponse as any
    );

    expect(res).toEqual({ body: { item: { id: 'output1' } } });
  });

  it('should return error on put output using remote_elasticsearch in serverless', async () => {
    jest.spyOn(appContextService, 'getCloud').mockReturnValue({ isServerlessEnabled: true } as any);

    const res = await putOutputHandlerWithErrorHandler(
      mockContext,
      { body: { type: 'remote_elasticsearch' }, params: { outputId: 'output1' } } as any,
      mockResponse as any
    );

    expect(res).toEqual({
      body: { message: 'Output type remote_elasticsearch not supported in serverless' },
      statusCode: 400,
    });
  });

  it('should return ok on put output using remote_elasticsearch in stateful', async () => {
    jest
      .spyOn(appContextService, 'getCloud')
      .mockReturnValue({ isServerlessEnabled: false } as any);

    const res = await putOutputHandlerWithErrorHandler(
      mockContext,
      { body: { type: 'remote_elasticsearch' }, params: { outputId: 'output1' } } as any,
      mockResponse as any
    );

    expect(res).toEqual({ body: { item: { id: 'output1' } } });
  });

  it('should return error on post elasticsearch output in serverless if host url is different from default', async () => {
    jest.spyOn(appContextService, 'getCloud').mockReturnValue({ isServerlessEnabled: true } as any);

    const res = await postOutputHandlerWithErrorHandler(
      mockContext,
      { body: { id: 'output1', type: 'elasticsearch', hosts: ['http://localhost:8080'] } } as any,
      mockResponse as any
    );

    expect(res).toEqual({
      body: {
        message:
          'Elasticsearch output host must have default URL in serverless: http://elasticsearch:9200',
      },
      statusCode: 400,
    });
  });

  it('should return ok on post elasticsearch output in serverless if host url is same as default', async () => {
    jest.spyOn(appContextService, 'getCloud').mockReturnValue({ isServerlessEnabled: true } as any);

    const res = await postOutputHandlerWithErrorHandler(
      mockContext,
      {
        body: { id: 'output1', type: 'elasticsearch', hosts: ['http://elasticsearch:9200'] },
      } as any,
      mockResponse as any
    );

    expect(res).toEqual({ body: { item: { id: 'output1' } } });
  });

  it('should return ok on post elasticsearch output in stateful if host url is different from default', async () => {
    jest
      .spyOn(appContextService, 'getCloud')
      .mockReturnValue({ isServerlessEnabled: false } as any);

    const res = await postOutputHandlerWithErrorHandler(
      mockContext,
      { body: { id: 'output1', type: 'elasticsearch', hosts: ['http://localhost:8080'] } } as any,
      mockResponse as any
    );

    expect(res).toEqual({ body: { item: { id: 'output1' } } });
  });

  it('should return error on put elasticsearch output in serverless if host url is different from default', async () => {
    jest.spyOn(appContextService, 'getCloud').mockReturnValue({ isServerlessEnabled: true } as any);
    // The original output should provide the output type
    jest.spyOn(outputService, 'get').mockImplementation((_, id: string) => {
      if (id === SERVERLESS_DEFAULT_OUTPUT_ID) {
        return { hosts: ['http://elasticsearch:9200'] } as any;
      } else {
        return { id: 'output1', type: 'elasticsearch' } as any;
      }
    });

    const res = await putOutputHandlerWithErrorHandler(
      mockContext,
      {
        body: { hosts: ['http://localhost:8080'] },
        params: { outputId: 'output1' },
      } as any,
      mockResponse as any
    );

    expect(res).toEqual({
      body: {
        message:
          'Elasticsearch output host must have default URL in serverless: http://elasticsearch:9200',
      },
      statusCode: 400,
    });
  });

  it('should return ok on put elasticsearch output in serverless if host url is same as default', async () => {
    jest.spyOn(appContextService, 'getCloud').mockReturnValue({ isServerlessEnabled: true } as any);

    const res = await putOutputHandlerWithErrorHandler(
      mockContext,
      {
        body: { hosts: ['http://elasticsearch:9200'] },
        params: { outputId: 'output1' },
      } as any,
      mockResponse as any
    );

    expect(res).toEqual({ body: { item: { id: 'output1' } } });
  });

  it('should return ok on put elasticsearch output in serverless if host url is not passed', async () => {
    jest.spyOn(appContextService, 'getCloud').mockReturnValue({ isServerlessEnabled: true } as any);

    const res = await putOutputHandlerWithErrorHandler(
      mockContext,
      {
        body: { name: 'Renamed output' },
        params: { outputId: 'output1' },
      } as any,
      mockResponse as any
    );

    expect(res).toEqual({ body: { item: { id: 'output1' } } });
  });

  it('should return ok on put elasticsearch output in stateful if host url is different from default', async () => {
    jest
      .spyOn(appContextService, 'getCloud')
      .mockReturnValue({ isServerlessEnabled: false } as any);

    const res = await putOutputHandlerWithErrorHandler(
      mockContext,
      {
        body: { hosts: ['http://localhost:8080'] },
        params: { outputId: 'output1' },
      } as any,
      mockResponse as any
    );

    expect(res).toEqual({ body: { item: { id: 'output1' } } });
  });

  it('should return error if both service_token and secrets.service_token is provided for remote_elasticsearch output', async () => {
    jest
      .spyOn(appContextService, 'getCloud')
      .mockReturnValue({ isServerlessEnabled: false } as any);

    const res = await postOutputHandlerWithErrorHandler(
      mockContext,
      {
        body: {
          type: 'remote_elasticsearch',
          service_token: 'token1',
          secrets: { service_token: 'token2' },
        },
      } as any,
      mockResponse as any
    );

    expect(res).toEqual({
      body: { message: 'Cannot specify both service_token and secrets.service_token' },
      statusCode: 400,
    });
  });

  it('should return ok if one of service_token and secrets.service_token is provided for remote_elasticsearch output', async () => {
    jest
      .spyOn(appContextService, 'getCloud')
      .mockReturnValue({ isServerlessEnabled: false } as any);

    const res = await postOutputHandlerWithErrorHandler(
      mockContext,
      { body: { type: 'remote_elasticsearch', secrets: { service_token: 'token2' } } } as any,
      mockResponse as any
    );

    expect(res).toEqual({ body: { item: { id: 'output1' } } });
  });

  it('should return error if both kibana_api_key and secrets.kibana_api_key is provided for remote_elasticsearch output', async () => {
    jest
      .spyOn(appContextService, 'getCloud')
      .mockReturnValue({ isServerlessEnabled: false } as any);

    const res = await postOutputHandlerWithErrorHandler(
      mockContext,
      {
        body: {
          type: 'remote_elasticsearch',
          kibana_api_key: 'value1',
          secrets: { kibana_api_key: 'value2' },
        },
      } as any,
      mockResponse as any
    );

    expect(res).toEqual({
      body: { message: 'Cannot specify both kibana_api_key and secrets.kibana_api_key' },
      statusCode: 400,
    });
  });

  it('should return ok if one of kibana_api_key and secrets.kibana_api_key is provided for remote_elasticsearch output', async () => {
    jest
      .spyOn(appContextService, 'getCloud')
      .mockReturnValue({ isServerlessEnabled: false } as any);

    const res = await postOutputHandlerWithErrorHandler(
      mockContext,
      { body: { type: 'remote_elasticsearch', secrets: { kibana_api_key: 'value2' } } } as any,
      mockResponse as any
    );

    expect(res).toEqual({ body: { item: { id: 'output1' } } });
  });
});
